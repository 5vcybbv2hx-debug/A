// Freistellen direkt im Browser.
// Das Modell läuft auf dem Gerät: das Foto verlässt es nicht, es kostet keine Credits
// und das Ergebnis ist ein echtes PNG mit Alphakanal – keine Weiß-Hintergrund-Krücke.

let modul = null;

async function ladeModell() {
  if (!modul) modul = await import('@imgly/background-removal');
  return modul;
}

/**
 * @param {File|Blob|string} quelle Bilddatei oder URL
 * @param {(key: string, aktuell: number, gesamt: number) => void} [onProgress]
 * @returns {Promise<Blob>} PNG mit transparentem Hintergrund
 */
export async function freistellen(quelle, onProgress) {
  const { removeBackground } = await ladeModell();
  return removeBackground(quelle, {
    output: { format: 'image/png' },
    progress: (key, aktuell, gesamt) => {
      if (onProgress) onProgress(key, aktuell, gesamt);
    },
  });
}

/** Macht aus dem Ergebnis eine Datei, die sich direkt hochladen lässt. */
export function alsPngDatei(blob, name = 'freigestellt.png') {
  return new File([blob], name, { type: 'image/png' });
}
