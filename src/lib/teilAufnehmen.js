import { base44 } from '@/api/base44Client';
import { shrinkImage } from '@/lib/constants';
import { freistellen, alsPngDatei } from '@/lib/cutout';

/**
 * Nimmt ein Kleidungsfoto auf: verkleinern, privat hochladen, freistellen, taggen.
 * Wird beim normalen Hochladen und im Erststart benutzt, damit beide Wege
 * identisch arbeiten.
 *
 * @param {File} file
 * @param {(phase: 'laedt'|'freistellen'|'verarbeitung', itemId?: string) => void} [melde]
 * @returns {Promise<object>} das fertig getaggte Teil
 */
export async function teilAufnehmen(file, melde = () => {}) {
  melde('laedt');

  const klein = await shrinkImage(file, 1200);
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: klein });

  const created = await base44.entities.Kleidungsstueck.create({
    name: 'Neues Teil',
    foto_original: file_uri,
    verarbeitungs_status: 'hochgeladen',
    status: 'Aktiv',
    favorit: false,
    nutzungszaehler: 0,
  });

  melde('freistellen', created.id);

  // Echtes Freistellen auf dem Gerät: keine Credits, echter Alphakanal.
  // Scheitert es, bleibt das Originalfoto und das Tagging läuft trotzdem.
  try {
    const png = alsPngDatei(await freistellen(klein));
    const { file_uri: png_uri } = await base44.integrations.Core.UploadPrivateFile({ file: png });
    await base44.entities.Kleidungsstueck.update(created.id, {
      foto_freigestellt: png_uri,
      verarbeitungs_status: 'freigestellt',
    });
  } catch (_fehler) {
    // bewusst still: das Teil ist auch ohne Freistellung brauchbar
  }

  melde('verarbeitung', created.id);

  const res = await base44.functions.invoke('processClothingImage', { item_id: created.id });
  if (res.data?.error) throw new Error(res.data.error);
  return res.data.item;
}
