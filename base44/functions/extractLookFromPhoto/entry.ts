import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { signedUrl, KATEGORIEN, SLOTS, ACCESSOIRE_PLAETZE, MUSTER, SAISONS, ANLAESSE, angemeldeterUser } from '../../shared/aura.ts';

export default async function (req) {
  try {
    const { foto_uri } = await req.json().catch(() => ({}));
    if (!foto_uri) return Response.json({ error: 'foto_uri fehlt' }, { status: 400 });

    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    const user = await angemeldeterUser(base44);
    if (!user) return Response.json({ error: 'Bitte zuerst anmelden.' }, { status: 401 });

    const url = await signedUrl(base44, foto_uri, 1800);

    const schema = {
      type: 'object',
      properties: {
        outfit_name: { type: 'string' },
        anlass: { type: 'string', enum: ANLAESSE },
        saison: { type: 'string', enum: SAISONS },
        kommentar: { type: 'string' },
        teile: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              kategorie: { type: 'string', enum: KATEGORIEN },
              slot_typ: { type: 'string', enum: SLOTS },
              accessoire_platz: { type: 'string', enum: ACCESSOIRE_PLAETZE },
              farben: { type: 'array', items: { type: 'string' } },
              muster: { type: 'string', enum: MUSTER },
            },
            required: ['name', 'kategorie', 'slot_typ', 'farben', 'muster'],
          },
        },
      },
      required: ['outfit_name', 'teile'],
    };

    const erkennung = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt:
        'Du bist eine warmherzige Stil-Expertin. Auf dem Foto ist eine Frau in einem kompletten Look zu sehen. ' +
        'Erkenne die sichtbaren Kleidungsstücke und die Schuhe. Beschreibe auf Deutsch:\n' +
        '- outfit_name: kurzer, hübscher Name für den Look (max. 40 Zeichen)\n' +
        '- anlass: Alltag, Business, Sport, Feier, Zuhause oder Date\n' +
        '- saison: Frühling, Sommer, Herbst, Winter, Übergang oder Ganzjahres\n' +
        '- kommentar: ein Satz, was den Look ausmacht, warm formuliert\n' +
        '- teile: 1–6 sichtbare Stücke mit name (kurz), kategorie, slot_typ, farben, muster\n' +
        '- accessoire_platz nur bei Accessoires: kopf (Haarband, Mütze, Sonnenbrille), hals (Kette, Ohrringe, Schal), hand (Tasche, Gürtel in der Hand), sonstige\n' +
        'Nur sicher erkennbare Stücke nennen, nichts erfinden.',
      file_urls: [url],
      response_json_schema: schema,
    });

    const teile = Array.isArray(erkennung?.teile) ? erkennung.teile.slice(0, 6) : [];
    if (teile.length === 0) {
      return Response.json({ error: 'Auf dem Foto war kein Look zu erkennen.' }, { status: 400 });
    }

    const neueItems = teile.map((t) => ({
      name: t.name || t.kategorie,
      kategorie: t.kategorie,
      slot_typ: t.slot_typ,
      accessoire_platz: t.accessoire_platz || null,
      farben: t.farben || [],
      muster: t.muster || 'Unifarben',
      saison: erkennung.saison || 'Ganzjahres',
      anlaesse: [erkennung.anlass || 'Alltag'],
      status: 'Aktiv',
      favorit: false,
      nutzungszaehler: 0,
      verarbeitungs_status: 'geprueft',
      foto_original: foto_uri,
      created_by: user.email,
    }));

    const gespeichert = await db.Kleidungsstueck.bulkCreate(neueItems);

    const outfit = await db.Outfit.create({
      created_by: user.email,
      name: erkennung.outfit_name || 'Look vom Foto',
      item_ids: gespeichert.map((i) => i.id),
      anlass: erkennung.anlass || 'Alltag',
      saison: erkennung.saison || 'Ganzjahres',
      ki_kommentar: erkennung.kommentar || '',
      tryon_status: 'keins',
      favorit: false,
      nutzungszaehler: 1,
      letzte_nutzung: new Date().toISOString().slice(0, 10),
    });

    await db.TrageProtokoll.create({
      created_by: user.email,
      outfit_id: outfit.id,
      outfit_name: outfit.name,
      datum: new Date().toISOString().slice(0, 10),
      anlass: outfit.anlass,
      kommentar: 'Aus einem Foto übernommen',
    });

    return Response.json({ outfit, items: gespeichert });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}