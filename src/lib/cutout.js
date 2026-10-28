// Freistellen direkt im Browser.
// Das Modell läuft auf dem Gerät: das Foto verlässt es nicht, es kostet keine Credits
// und das Ergebnis ist ein echtes PNG mit Alphakanal – keine Weiß-Hintergrund-Krücke.
//
// Zwei Kunstgriffe, damit das auf dem Telefon nicht wie ein Absturz wirkt:
// - isnet_quint8 statt des Standardmodells: rund 40 MB statt 80 MB beim ersten Mal.
// - proxyToWorker: die Rechnung läuft in einem eigenen Worker, die Oberfläche bleibt
//   bedienbar. Geht das im Browser nicht, wird es im Hauptthread nachgeholt.

const KONFIG = {
  model: 'isnet_quint8',
  output: { format: 'image/png' },
};

let modul = null;

async function ladeModul() {
  if (!modul) modul = await import('@imgly/background-removal');
  return modul;
}

/**
 * Normalisiert den Fortschritt der Bibliothek auf zwei Phasen.
 * @returns {{phase: 'laden'|'rechnen', prozent: number}|null}
 */
function fortschritt(key, aktuell, gesamt) {
  if (!Number.isFinite(gesamt) || gesamt <= 0) return null;
  const anteil = Math.min(1, Math.max(0, aktuell / gesamt));
  const phase = String(key || '').startsWith('fetch') ? 'laden' : 'rechnen';
  return { phase, prozent: Math.round(anteil * 100) };
}

async function lauf(quelle, onProgress, mitWorker) {
  const { removeBackground } = await ladeModul();
  return removeBackground(quelle, {
    ...KONFIG,
    proxyToWorker: mitWorker,
    progress: (key, aktuell, gesamt) => {
      if (!onProgress) return;
      const stand = fortschritt(key, aktuell, gesamt);
      if (stand) onProgress(stand.phase, stand.prozent);
    },
  });
}

/**
 * @param {File|Blob|string} quelle Bilddatei oder URL
 * @param {(phase: 'laden'|'rechnen', prozent: number) => void} [onProgress]
 * @returns {Promise<Blob>} PNG mit transparentem Hintergrund
 */
export async function freistellen(quelle, onProgress) {
  try {
    return await lauf(quelle, onProgress, true);
  } catch (_fehler) {
    // Manche Browser können den Worker-Weg nicht, dann eben im Hauptthread.
    return await lauf(quelle, onProgress, false);
  }
}

/** Macht aus dem Ergebnis eine Datei, die sich direkt hochladen lässt. */
export function alsPngDatei(blob, name = 'freigestellt.png') {
  return new File([blob], name, { type: 'image/png' });
}

/**
 * Lädt das Modell im Leerlauf vor, damit das erste echte Freistellen schnell geht.
 * Läuft nur einmal je Gerät und nur bei guter Verbindung.
 */
export async function vorwaermen() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d8cfc2';
  ctx.fillRect(0, 0, 64, 64);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return false;
  await freistellen(blob);
  return true;
}
