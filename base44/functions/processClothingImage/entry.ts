import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { signedUrl, KATEGORIEN, SLOTS, MUSTER, SAISONS, angemeldeterUser, gehoert, keineBerechtigung } from '../../shared/aura.ts';

export default async function (req) {
  try {
    const { item_id } = await req.json().catch(() => ({}));
    if (!item_id) return Response.json({ error: 'item_id fehlt' }, { status: 400 });

    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    const user = await angemeldeterUser(base44);
    if (!user) return Response.json({ error: 'Bitte zuerst anmelden.' }, { status: 401 });

    const item = await db.Kleidungsstueck.get(item_id).catch((e) =>
      e.status === 404 ? null : Promise.reject(e)
    );
    if (!item) return Response.json({ error: 'Teil nicht gefunden' }, { status: 404 });
    if (!gehoert(user, item)) return keineBerechtigung();
    if (!item.foto_original) return Response.json({ error: 'Kein Foto vorhanden' }, { status: 400 });

    const url = await signedUrl(base44, item.foto_original, 1800);

    // Das Freistellen passiert schon im Browser (echtes Alpha-PNG, keine Credits).
    // Hier bleibt nur das Vision-Tagging – und das ist ein Vorschlag, keine Festlegung.
    const tagSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Kurzer, hübscher Name, max. 40 Zeichen' },
        kategorie: { type: 'string', enum: KATEGORIEN },
        slot_typ: { type: 'string', enum: SLOTS },
        farben: { type: 'array', items: { type: 'string' } },
        muster: { type: 'string', enum: MUSTER },
        saison: { type: 'string', enum: SAISONS },
        anlaesse: { type: 'array', items: { type: 'string' } },
        marke: { type: 'string' },
      },
      required: ['name', 'kategorie', 'slot_typ', 'farben', 'muster', 'saison', 'anlaesse'],
    };

    const vorschlag = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt:
        'Du bist eine warmherzige Stil-Expertin und schaust dir ein Foto eines einzelnen Kleidungsstücks an. ' +
        'Beschreibe es auf Deutsch, so wie eine Freundin es beschreiben würde.\n' +
        '- name: kurzer, eleganter Name, z. B. "Cremefarbene Leinenbluse"\n' +
        '- kategorie: eine von T-Shirt, Bluse, Pullover, Kleid, Hose, Rock, Jacke, Mantel, Schuh, Tasche, Schmuck, Accessoire, Sonstiges\n' +
        '- slot_typ: top, bottom, fullbody, outer, shoes oder accessory (Kleid = fullbody, Tasche/Schmuck = accessory)\n' +
        '- farben: 1–3 deutsche Farbnamen, dominant zuerst\n' +
        '- muster: Unifarben, Gestreift, Gemustert, Blumen, Karriert oder Sonstiges\n' +
        '- saison: Frühling, Sommer, Herbst, Winter, Übergang oder Ganzjahres\n' +
        '- anlaesse: 1–3 aus Alltag, Business, Sport, Feier, Zuhause, Date\n' +
        '- marke: nur wenn ein Markenlogo eindeutig lesbar ist, sonst leer\n' +
        'Ist das Stück auf dem Foto nicht eindeutig zu erkennen, wähle die plausibelste Option.',
      file_urls: [url],
      response_json_schema: tagSchema,
    });

    const cleanName = (item.name || '').trim();
    const update = {
      verarbeitungs_status: 'getaggt',
      kategorie: vorschlag?.kategorie || item.kategorie,
      slot_typ: vorschlag?.slot_typ || item.slot_typ,
      farben: vorschlag?.farben || item.farben || [],
      muster: vorschlag?.muster || item.muster,
      saison: vorschlag?.saison || item.saison,
      anlaesse: vorschlag?.anlaesse || item.anlaesse || [],
      marke: vorschlag?.marke || item.marke || '',
      name: !cleanName || cleanName === 'Neues Teil' ? vorschlag?.name || 'Neues Teil' : cleanName,
    };

    const updated = await db.Kleidungsstueck.update(item_id, update);
    return Response.json({ item: updated, vorschlag });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}