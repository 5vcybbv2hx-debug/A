import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { asArray, firstOf } from '../../shared/aura.ts';

function tageZwischen(start, ende) {
  const s = new Date(start);
  const e = new Date(ende);
  if (Number.isNaN(s.getTime())) return [];
  const end = Number.isNaN(e.getTime()) ? s : e;
  const out = [];
  const cursor = new Date(s);
  let guard = 0;
  while (cursor <= end && guard < 21) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }
  return out.length ? out : [start];
}

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { ziel, startdatum, enddatum, wetter_kontext } = body;
    if (!ziel || !startdatum) {
      return Response.json({ error: 'Bitte Ziel und Startdatum angeben.' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const tage = tageZwischen(startdatum, enddatum || startdatum);
    const items = asArray(await db.Kleidungsstueck.filter({ status: 'Aktiv' }, { limit: 200 })).filter((i) => i.slot_typ);
    if (items.length < 2) {
      return Response.json({ error: 'Dein Schrank ist noch zu leer für eine Packliste.' }, { status: 400 });
    }
    const profil = firstOf(await db.ProfilEinstellung.filter({}, { limit: 1 })) || {};

    const zeilen = items
      .map((i) => `id=${i.id} | ${i.name} | ${i.kategorie}/${i.slot_typ} | ${(i.farben || []).join(', ')} | ${i.muster || 'Unifarben'} | ${i.saison || 'Ganzjahres'} | ${(i.anlaesse || []).join(', ')}`)
      .join('\n');

    const schema = {
      type: 'object',
      properties: {
        hinweis: { type: 'string' },
        tage: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              datum: { type: 'string' },
              outfit_name: { type: 'string' },
              item_ids: { type: 'array', items: { type: 'string' } },
              kommentar: { type: 'string' },
            },
            required: ['datum', 'outfit_name', 'item_ids'],
          },
        },
        basics: { type: 'array', items: { type: 'string' } },
      },
      required: ['tage', 'basics'],
    };

    const prompt =
      'Du bist eine warmherzige Reise-Stylistin und packst mit deiner Freundin einen Koffer.\n' +
      `Ziel: ${ziel}\nZeitraum: ${startdatum} bis ${enddatum || startdatum}\n` +
      (wetter_kontext ? `Wetter: ${wetter_kontext}\n` : '') +
      (profil.style_beschreibung ? `Ihr Stil: ${profil.style_beschreibung}\n` : '') +
      '\nVerfügbare Teile (nur diese IDs verwenden):\n' + zeilen +
      `\n\nPlane für jeden dieser Tage (${tage.join(', ')}) genau ein Outfit und gib als datum exakt den Tag zurück.\n` +
      'Teile dürfen mehrfach vorkommen. Erfinde keine IDs.\n' +
      'basics: 5–8 Dinge, die immer mit müssen (z. B. Unterwäsche, Socken, Schlafanzug, Kulturbeutel).\n' +
      'hinweis: ein lieber Satz zur Reise.';

    const antwort = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema,
    });

    const bekannte = new Set(items.map((i) => i.id));
    const plan = (antwort?.tage || [])
      .map((t) => ({
        datum: t.datum,
        outfit_name: t.outfit_name || 'Tages-Outfit',
        item_ids: [...new Set((t.item_ids || []).filter((id) => bekannte.has(id)))],
        kommentar: t.kommentar || '',
      }))
      .filter((t) => t.item_ids.length > 0);

    if (plan.length === 0) {
      return Response.json({ error: 'Es konnte kein Reiseplan erstellt werden. Bitte erneut versuchen.' }, { status: 502 });
    }

    const itemMap = new Map(items.map((i) => [i.id, i]));
    const gesehen = new Set();
    const checkliste = [];
    for (const tag of plan) {
      for (const id of tag.item_ids) {
        if (gesehen.has(id)) continue;
        gesehen.add(id);
        const item = itemMap.get(id);
        checkliste.push({
          label: item?.name || 'Teil',
          kategorie: item?.kategorie || '',
          item_id: id,
          erledigt: false,
        });
      }
    }
    for (const basic of antwort?.basics || []) {
      checkliste.push({ label: basic, kategorie: 'Basic', erledigt: false });
    }

    const packliste = await db.Packliste.create({
      name: `Reise nach ${ziel}`,
      ziel,
      startdatum,
      enddatum: enddatum || startdatum,
      status: 'Geplant',
      outfit_ids: [],
      item_ids: [...gesehen],
      tage: plan,
      packliste_items: checkliste,
    });

    return Response.json({ packliste, hinweis: antwort?.hinweis || '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}