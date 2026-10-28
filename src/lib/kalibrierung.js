/**
 * Körperzonen aus einem freigestellten Ganzkörperfoto messen.
 *
 * Grundlage ist die Alphamaske des PNG: Für jede Bildzeile wird gemessen, wie
 * breit die Person dort ist. Aus dem Breitenverlauf lassen sich Hals, Schultern,
 * Taille und Hüfte finden, weil sie als lokale Minima und Maxima auftreten.
 * Die daraus gebauten Rechtecke sind Prozentwerte des Bildes, also unabhängig
 * von der Auflösung, und dienen der "Auf mir"-Ansicht als Startposition.
 *
 * Alles läuft im Browser. Das Foto verlässt das Gerät nicht.
 */

const ALPHA_SCHWELLE = 40;
const MESSBREITE = 260;
const GLÄTTUNG = 3;

const FALLBACK = {
  fullbody: { x: 12, y: 10, w: 76, h: 66 },
  top: { x: 22, y: 20, w: 56, h: 28 },
  bottom: { x: 26, y: 46, w: 48, h: 32 },
  shoes: { x: 28, y: 85, w: 44, h: 12 },
  outer: { x: 6, y: 9, w: 88, h: 46 },
  accessory: { x: 69, y: 32, w: 26, h: 18 },
  accessory_kopf: { x: 36, y: 0, w: 28, h: 13 },
  accessory_hals: { x: 37, y: 15, w: 26, h: 11 },
  accessory_hand: { x: 68, y: 40, w: 25, h: 20 },
};

function ladeBild(quelle) {
  return new Promise((resolve, reject) => {
    const bild = new window.Image();
    bild.crossOrigin = 'anonymous';
    bild.onload = () => resolve(bild);
    bild.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
    bild.src = typeof quelle === 'string' ? quelle : URL.createObjectURL(quelle);
  });
}

const klemme = (v, min, max) => Math.min(max, Math.max(min, v));
const runde = (v) => Math.round(v * 100) / 100;

/** Misst je Zeile die belegte Breite der Alphamaske. */
function messeZeilen(daten, breite, hoehe) {
  const zeilen = [];
  for (let y = 0; y < hoehe; y++) {
    let min = -1;
    let max = -1;
    const basis = y * breite * 4;
    for (let x = 0; x < breite; x++) {
      if (daten[basis + x * 4 + 3] > ALPHA_SCHWELLE) {
        if (min < 0) min = x;
        max = x;
      }
    }
    zeilen.push(min < 0 ? null : { min, max, breite: max - min + 1 });
  }
  return zeilen;
}

function glätte(werte) {
  return werte.map((_, i) => {
    let summe = 0;
    let anzahl = 0;
    for (let k = -GLÄTTUNG; k <= GLÄTTUNG; k++) {
      const v = werte[i + k];
      if (typeof v === 'number') {
        summe += v;
        anzahl += 1;
      }
    }
    return anzahl ? summe / anzahl : 0;
  });
}

/**
 * @param {Blob|File|string} quelle freigestelltes PNG mit Alphakanal
 * @returns {Promise<{zonen: Object, gemessen: boolean, seitenverhaeltnis: number}>}
 */
export async function kalibriereZonen(quelle) {
  try {
    const bild = await ladeBild(quelle);
    const faktor = Math.min(1, MESSBREITE / bild.naturalWidth);
    const breite = Math.max(1, Math.round(bild.naturalWidth * faktor));
    const hoehe = Math.max(1, Math.round(bild.naturalHeight * faktor));

    const canvas = document.createElement('canvas');
    canvas.width = breite;
    canvas.height = hoehe;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bild, 0, 0, breite, hoehe);
    const { data } = ctx.getImageData(0, 0, breite, hoehe);

    const seitenverhaeltnis =
      Math.round((bild.naturalWidth / bild.naturalHeight) * 1000) / 1000;
    const zeilen = messeZeilen(data, breite, hoehe);
    const belegt = zeilen
      .map((z, i) => (z && z.breite > 3 ? i : -1))
      .filter((i) => i >= 0);
    if (belegt.length < hoehe * 0.2) {
      return { zonen: FALLBACK, gemessen: false, seitenverhaeltnis };
    }

    const oben = belegt[0];
    const unten = belegt[belegt.length - 1];
    const koerperHoehe = unten - oben + 1;
    if (koerperHoehe < hoehe * 0.25) {
      return { zonen: FALLBACK, gemessen: false, seitenverhaeltnis };
    }

    const roh = [];
    for (let y = oben; y <= unten; y++) roh.push(zeilen[y] ? zeilen[y].breite : 0);
    const breiten = glätte(roh);

    // Normierte Höhe (0 = Kopf, 1 = Fuß) in einen Zeilenindex übersetzen.
    const zeile = (anteil) => klemme(Math.round(anteil * (koerperHoehe - 1)), 0, koerperHoehe - 1);

    // Grenzen sind Anteile der Körperhöhe, gesucht wird über die Zeilen dazwischen.
    const suche = (von, bis, richtung) => {
      const start = zeile(von);
      const ende = Math.max(start, zeile(bis));
      let bestes = start;
      for (let i = start; i <= ende; i++) {
        if (richtung * breiten[i] > richtung * breiten[bestes]) {
          if (breiten[i] !== breiten[bestes]) bestes = i;
        }
      }
      return bestes / (koerperHoehe - 1);
    };
    const sucheMin = (von, bis) => suche(von, bis, -1);
    const sucheMax = (von, bis) => suche(von, bis, 1);

    const hals = sucheMin(0.08, 0.28);
    const schulter = sucheMax(hals, Math.min(0.46, hals + 0.16));
    const taille = sucheMin(Math.max(schulter + 0.05, 0.33), 0.54);
    const huefte = sucheMax(taille, Math.min(0.68, taille + 0.16));

    if (!(hals < schulter && schulter < taille && taille < huefte)) {
      return { zonen: FALLBACK, gemessen: false, seitenverhaeltnis };
    }

    // Waagerechte Ausdehnung des Körpers in einem Höhenband, in Bildpixeln.
    const spanne = (von, bis) => {
      let min = breite;
      let max = 0;
      const a = zeile(von);
      const b = zeile(bis);
      for (let i = a; i <= b; i++) {
        const z = zeilen[oben + i];
        if (!z) continue;
        if (z.min < min) min = z.min;
        if (z.max > max) max = z.max;
      }
      if (min > max) return null;
      return { min, max };
    };

    /** Band in Prozent des Gesamtbildes, mit Rand und optionaler Verschiebung. */
    const band = (von, bis, randX = 0.1) => {
      const s = spanne(von, bis);
      if (!s) return null;
      const koerperBreite = s.max - s.min;
      const x0 = s.min - koerperBreite * randX;
      const x1 = s.max + koerperBreite * randX;
      const y0 = oben + zeile(von);
      const y1 = oben + zeile(bis);
      return {
        x: runde(klemme((x0 / breite) * 100, 0, 99)),
        y: runde(klemme((y0 / hoehe) * 100, 0, 99)),
        w: runde(klemme(((x1 - x0) / breite) * 100, 3, 100)),
        h: runde(klemme(((y1 - y0) / hoehe) * 100, 3, 100)),
      };
    };

    const passe = (z, schluessel) => {
      const basis = FALLBACK[schluessel];
      if (!z) return basis;
      return {
        x: z.x,
        y: z.y,
        w: Math.min(z.w, 100 - z.x),
        h: Math.min(z.h, 100 - z.y),
      };
    };

    // Accessoire sitzt seitlich, nicht mittig: am rechten Körperrand ausrichten.
    const accessoire = (() => {
      const s = spanne(0.36, 0.56);
      if (!s) return null;
      const koerperBreite = s.max - s.min;
      const x0 = s.max - koerperBreite * 0.18;
      const x1 = s.max + koerperBreite * 0.24;
      return {
        x: runde(klemme((x0 / breite) * 100, 0, 98)),
        y: runde(klemme(((oben + zeile(0.38)) / hoehe) * 100, 0, 98)),
        w: runde(((x1 - x0) / breite) * 100),
        h: runde(((zeile(0.56) - zeile(0.38)) / hoehe) * 100),
      };
    })();

    // Accessoires sitzen an drei unterschiedlichen Stellen: am Kopf, am Hals
    // und seitlich an der Hand. Jede bekommt ihre eigene Zone.
    const kopfZone = band(-0.02, Math.min(0.22, hals + 0.02), 0.22);
    // Kette und Ohrringe hängen am Hals, nicht über die Schultern: die Zone wird
    // um den Hals selbst gebaut und nur so breit wie eine Kette fällt.
    const halsZone = (() => {
      // Genau die Halszeile messen, nicht einen Bereich: sonst landen die
      // Schultern mit in der Zone und die Kette wird bildbreit.
      const z = zeilen[oben + zeile(hals)];
      if (!z) return null;
      const halsBreite = z.breite;
      const mitte = (z.min + z.max) / 2;
      const halbe = halsBreite * 1.5;
      const x0 = mitte - halbe;
      const x1 = mitte + halbe;
      return {
        x: runde(klemme((x0 / breite) * 100, 0, 98)),
        y: runde(klemme(((oben + zeile(hals - 0.02)) / hoehe) * 100, 0, 98)),
        w: runde(klemme(((x1 - x0) / breite) * 100, 3, 100)),
        h: runde(klemme(((zeile(Math.min(0.34, hals + 0.10)) - zeile(hals - 0.02)) / hoehe) * 100, 3, 100)),
      };
    })();
    const handZone = (() => {
      const s2 = spanne(Math.min(taille, huefte) - 0.04, Math.min(0.68, huefte + 0.08));
      if (!s2) return null;
      const koerperBreite = s2.max - s2.min;
      const x0 = s2.max - koerperBreite * 0.15;
      const x1 = s2.max + koerperBreite * 0.3;
      return {
        x: runde(klemme((x0 / breite) * 100, 0, 98)),
        y: runde(klemme(((oben + zeile(Math.min(taille, huefte) - 0.04)) / hoehe) * 100, 0, 98)),
        w: runde(klemme(((x1 - x0) / breite) * 100, 3, 100)),
        h: runde(klemme(((zeile(Math.min(0.68, huefte + 0.08)) - zeile(Math.min(taille, huefte) - 0.04)) / hoehe) * 100, 3, 100)),
      };
    })();

    const zonen = {
      fullbody: passe(band(-0.02, 1.02, 0.04), 'fullbody'),
      top: passe(band(schulter - 0.05, taille + 0.03, 0.14), 'top'),
      bottom: passe(band(taille - 0.02, 0.95, 0.18), 'bottom'),
      shoes: passe(band(0.92, 1.0, 0.3), 'shoes'),
      outer: passe(band(schulter - 0.08, huefte + 0.05, 0.2), 'outer'),
      accessory: passe(accessoire, 'accessory'),
      accessory_kopf: passe(kopfZone, 'accessory_kopf'),
      accessory_hals: passe(halsZone, 'accessory_hals'),
      accessory_hand: passe(handZone, 'accessory_hand'),
    };

    return { zonen, gemessen: true, seitenverhaeltnis };
  } catch (_e) {
    return { zonen: FALLBACK, gemessen: false, seitenverhaeltnis: null };
  }
}

export { FALLBACK as STANDARD_ZONEN };
