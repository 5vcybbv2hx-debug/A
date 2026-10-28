import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { signedUrl, toPrivateImage, asArray, angemeldeterUser } from '../../shared/aura.ts';

const VARIANTEN = [
  { pose: 'frontal stehend', hint: 'frontale Ganzkörperansicht, Kamera auf Augenhöhe' },
  { pose: 'leicht gedreht, ruhig stehend', hint: 'leichte Dreiviertelansicht, gleiche Pose wie zuvor' },
  { pose: 'frontal stehend, Arme entspannt', hint: 'frontale Ganzkörperansicht vor einem anderen ruhigen Hintergrund' },
];

export default async function (req) {
  try {
    const { foto_uris } = await req.json().catch(() => ({}));
    if (!Array.isArray(foto_uris) || foto_uris.length === 0) {
      return Response.json({ error: 'Bitte mindestens ein Foto übergeben.' }, { status: 400 });
    }
    if (foto_uris.length > 6) {
      return Response.json({ error: 'Höchstens sechs Fotos.' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    const user = await angemeldeterUser(base44);
    if (!user) return Response.json({ error: 'Bitte zuerst anmelden.' }, { status: 401 });
    const profil = asArray(
      await db.ProfilEinstellung.filter({ created_by: user.email }, { limit: 1 })
    )[0] || {};

    const urls = await Promise.all(foto_uris.map((u) => signedUrl(base44, u, 1800)));

    const basis =
      'Erzeuge ein neues, in sich stimmiges Ganzkörperfoto derselben Frau wie auf den Referenzfotos. ' +
      'Sie ist von Kopf bis Fuß zu sehen, ' +
      'mit denselben Gesichtszügen, derselben Haarfarbe und derselben Statur wie auf den Referenzen. ' +
      'Gleichmäßiges weiches Tageslicht, ruhiger einfarbiger cremefarbener Hintergrund, natürliche Proportionen, ' +
      'entspannte neutrale Pose mit den Armen leicht vom Körper weg, ' +
      'schlichte neutrale Kleidung (enges Top und gerade Hose). ' +
      'Ein einziges fotografisches Bild, fotorealistisch, 35mm, kein Text, keine Collage, keine Fotomontage, ' +
      'kein Zusammenkleben von Körperteilen. ' +
      (profil.koerper_beschreibung ? `Zur Statur: ${profil.koerper_beschreibung}. ` : '');

    const ergebnisse = await Promise.allSettled(
      VARIANTEN.map((variante) =>
        base44.asServiceRole.integrations.Core.GenerateImage({
          prompt: `${basis}Variante: ${variante.hint}.`,
          existing_image_urls: urls.filter(Boolean),
        })
      )
    );

    const varianten = [];
    for (let i = 0; i < ergebnisse.length; i++) {
      const r = ergebnisse[i];
      if (r.status !== 'fulfilled' || !r.value?.url) continue;
      try {
        const uri = await toPrivateImage(base44, r.value.url, `basismodell-${Date.now()}-${i}.png`);
        varianten.push({ foto: uri, pose_beschreibung: VARIANTEN[i].pose });
      } catch (_e) {
        // Variante überspringen
      }
    }

    if (varianten.length === 0) {
      return Response.json({ error: 'Es konnten keine Varianten erzeugt werden. Bitte erneut versuchen.' }, { status: 502 });
    }

    return Response.json({ varianten });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}