import { base44 } from '@/api/base44Client';

// Gezeichnete Beispielteile, damit sie den Schrank sofort erleben kann, bevor sie
// ihre eigenen Fotos macht. Bewusst keine fremden Produktfotos: die Teile sind
// Illustrationen im Ton der App und werden mit ist_beispiel markiert, damit sie
// sich auf einen Schlag wieder entfernen lassen.
export const BEISPIELTEILE = [
  {
    datei: 'bluse.png',
    name: 'Cremefarbene Bluse',
    kategorie: 'Bluse',
    slot_typ: 'top',
    farben: ['Creme'],
    muster: 'Unifarben',
    saison: 'Ganzjahres',
    anlaesse: ['Alltag', 'Business'],
  },
  {
    datei: 'pullover.png',
    name: 'Camelpullover',
    kategorie: 'Pullover',
    slot_typ: 'top',
    farben: ['Camel'],
    muster: 'Unifarben',
    saison: 'Herbst',
    anlaesse: ['Alltag', 'Zuhause'],
  },
  {
    datei: 'hose.png',
    name: 'Dunkelblaue Hose',
    kategorie: 'Hose',
    slot_typ: 'bottom',
    farben: ['Dunkelblau'],
    muster: 'Unifarben',
    saison: 'Ganzjahres',
    anlaesse: ['Alltag', 'Business'],
  },
  {
    datei: 'rock.png',
    name: 'Sandfarbener Rock',
    kategorie: 'Rock',
    slot_typ: 'bottom',
    farben: ['Sand'],
    muster: 'Unifarben',
    saison: 'Sommer',
    anlaesse: ['Alltag', 'Date'],
  },
  {
    datei: 'kleid.png',
    name: 'Olivgrünes Kleid',
    kategorie: 'Kleid',
    slot_typ: 'fullbody',
    farben: ['Oliv'],
    muster: 'Unifarben',
    saison: 'Sommer',
    anlaesse: ['Feier', 'Date'],
  },
  {
    datei: 'mantel.png',
    name: 'Taupe Mantel',
    kategorie: 'Mantel',
    slot_typ: 'outer',
    farben: ['Taupe'],
    muster: 'Unifarben',
    saison: 'Winter',
    anlaesse: ['Alltag', 'Business'],
  },
  {
    datei: 'schuhe.png',
    name: 'Braune Loafer',
    kategorie: 'Schuh',
    slot_typ: 'shoes',
    farben: ['Braun'],
    muster: 'Unifarben',
    saison: 'Übergang',
    anlaesse: ['Alltag', 'Business'],
  },
  {
    datei: 'kette.png',
    name: 'Goldene Kette',
    kategorie: 'Schmuck',
    slot_typ: 'accessory',
    accessoire_platz: 'hals',
    farben: ['Gold'],
    muster: 'Unifarben',
    saison: 'Ganzjahres',
    anlaesse: ['Alltag', 'Feier'],
  },
  {
    datei: 'tasche.png',
    name: 'Cognacfarbene Tasche',
    kategorie: 'Tasche',
    slot_typ: 'accessory',
    accessoire_platz: 'hand',
    farben: ['Cognac'],
    muster: 'Unifarben',
    saison: 'Ganzjahres',
    anlaesse: ['Alltag', 'Business'],
  },
  {
    datei: 'haarband.png',
    name: 'Goldenes Haarband',
    kategorie: 'Accessoire',
    slot_typ: 'accessory',
    accessoire_platz: 'kopf',
    farben: ['Gold'],
    muster: 'Unifarben',
    saison: 'Ganzjahres',
    anlaesse: ['Alltag', 'Feier'],
  },
];

/**
 * Legt die Beispielteile im eigenen Schrank an. Die Bilder liegen als
 * transparente PNGs in der App und werden in den privaten Speicher geladen,
 * damit sie sich wie eigene Teile verhalten.
 */
export async function beispieleAnlegen(melde = () => {}) {
  const angelegt = [];

  for (let i = 0; i < BEISPIELTEILE.length; i += 1) {
    const teil = BEISPIELTEILE[i];
    melde(i + 1, BEISPIELTEILE.length, teil.name);

    const antwort = await fetch(`/beispiele/${teil.datei}`);
    if (!antwort.ok) throw new Error('Beispielbild konnte nicht geladen werden');
    const blob = await antwort.blob();
    const file = new File([blob], teil.datei, { type: 'image/png' });
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });

    const item = await base44.entities.Kleidungsstueck.create({
      name: teil.name,
      kategorie: teil.kategorie,
      slot_typ: teil.slot_typ,
      accessoire_platz: teil.accessoire_platz || null,
      farben: teil.farben,
      muster: teil.muster,
      saison: teil.saison,
      anlaesse: teil.anlaesse,
      foto_original: file_uri,
      foto_freigestellt: file_uri,
      verarbeitungs_status: 'freigestellt',
      status: 'Aktiv',
      favorit: false,
      nutzungszaehler: 0,
      ist_beispiel: true,
    });

    angelegt.push(item);
  }

  return angelegt;
}

/** Entfernt alle Beispielteile wieder. Eigene Fotos bleiben unberührt. */
export async function beispieleEntfernen() {
  const treffer = await base44.entities.Kleidungsstueck.filter({ ist_beispiel: true }, { limit: 200 });
  const ids = (treffer.items || []).map((i) => i.id);
  if (ids.length === 0) return 0;
  if (typeof base44.entities.Kleidungsstueck.deleteMany === 'function') {
    await base44.entities.Kleidungsstueck.deleteMany({ ist_beispiel: true });
  } else {
    for (const id of ids) await base44.entities.Kleidungsstueck.delete(id);
  }
  return ids.length;
}
