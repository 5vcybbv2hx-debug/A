import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { signedUrl, toPrivateImage, describeItem, signaturOf, asArray, firstOf } from '../../shared/aura.ts';

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { outfit_id, basismodell_id, kraft } = body;
    if (!outfit_id) return Response.json({ error: 'outfit_id fehlt' }, { status: 400 });

    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const outfit = await db.Outfit.get(outfit_id).catch((e) =>
      e.status === 404 ? null : Promise.reject(e)
    );
    if (!outfit) return Response.json({ error: 'Outfit nicht gefunden' }, { status: 404 });
    if (!outfit.item_ids?.length) {
      return Response.json({ error: 'Bitte zuerst Kleidungsstücke auswählen.' }, { status: 400 });
    }

    let basismodell = null;
    if (basismodell_id) {
      basismodell = await db.Basismodell.get(basismodell_id).catch((e) =>
        e.status === 404 ? null : Promise.reject(e)
      );
    }
    if (!basismodell) basismodell = firstOf(await db.Basismodell.filter({ ist_anker: true }, { limit: 1 }));
    if (!basismodell) basismodell = firstOf(await db.Basismodell.filter({ aktiv: true }, { limit: 1 }));

    if (!basismodell?.foto) {
      return Response.json(
        { error: 'Bitte zuerst ein Basismodell im Profil hinterlegen.' },
        { status: 400 }
      );
    }

    const signatur = signaturOf(outfit.item_ids);
    const gecacht =
      outfit.tryon_bild &&
      outfit.tryon_item_signatur === signatur &&
      outfit.tryon_basismodell_id === basismodell.id;

    if (gecacht && !kraft) {
      return Response.json({ outfit, gecacht: true });
    }

    const items = asArray(await db.Kleidungsstueck.filter({ id: { $in: outfit.item_ids } }, { limit: 50 }));
    if (items.length === 0) {
      return Response.json({ error: 'Die Kleidungsstücke wurden nicht gefunden.' }, { status: 400 });
    }

    await db.Outfit.update(outfit_id, { tryon_status: 'wird_gerendert' });

    const referenz = await signedUrl(base44, basismodell.foto, 1800);

    const prompt =
      'Fotorealistisches Ganzkörper-Modefoto derselben Frau wie auf dem Referenzbild – identisches Gesicht, ' +
      'identische Haare, identische Statur und Hautfarbe. Sie trägt ausschließlich diese Kleidungsstücke:\n' +
      items.map(describeItem).join('\n') +
      '\nNatürliche Passform und Fall des Stoffes, gleiche Pose, gleiche Lichtsituation und gleicher Bildausschnitt ' +
      'wie auf dem Referenzbild, neutraler ruhiger Hintergrund. Ganzkörper von Kopf bis Fuß sichtbar, ' +
      'echte Fotografie, 35mm, kein Text, keine Collage, keine zusätzlichen Accessoires.';

    try {
      const gen = await base44.asServiceRole.integrations.Core.GenerateImage({
        prompt,
        existing_image_urls: [referenz],
      });
      const uri = await toPrivateImage(base44, gen.url, `tryon-${outfit_id}-${Date.now()}.png`);
      const updated = await db.Outfit.update(outfit_id, {
        tryon_bild: uri,
        tryon_basismodell_id: basismodell.id,
        tryon_item_signatur: signatur,
        tryon_status: 'fertig',
      });
      return Response.json({ outfit: updated, gecacht: false });
    } catch (error) {
      await db.Outfit.update(outfit_id, { tryon_status: 'fehler' }).catch(() => null);
      return Response.json({ error: `Die Anprobe ist fehlgeschlagen: ${error.message}` }, { status: 502 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}