import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { asArray, firstOf } from '../../shared/aura.ts';

function tageSeit(dateStr) {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function fallback(items) {
  const bySlot = (s) => items.filter((i) => i.slot_typ === s);
  const tops = bySlot('top');
  const bottoms = bySlot('bottom');
  const shoes = bySlot('shoes');
  const vorschlaege = [];
  for (let i = 0; i < Math.min(3, Math.max(tops.length, bottoms.length)); i++) {
    const ids = [];
    if (tops[i % Math.max(tops.length, 1)]) ids.push(tops[i % tops.length].id);
    if (bottoms[i % Math.max(bottoms.length, 1)]) ids.push(bottoms[i % bottoms.length].id);
    if (shoes[0]) ids.push(shoes[0].id);
    if (ids.length >= 2) {
      vorschlaege.push({
        name: `Zusammenstellung ${vorschlaege.length + 1}`,
        item_ids: [...new Set(ids)],
        ki_kommentar: 'Schlicht und stimmig zusammengestellt – die Teile passen farblich ruhig zueinander.',
        temperatur_min: 10,
        temperatur_max: 22,
      });
    }
  }
  return vorschlaege;
}

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const anlass = body.anlass || 'Alltag';
    const saison = body.saison || 'Ganzjahres';
    const temp = Number.isFinite(Number(body.wetter_temp)) ? Number(body.wetter_temp) : 18;

    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const items = asArray(
      await db.Kleidungsstueck.filter({ status: 'Aktiv' }, { limit: 200, sort: '-created_date' })
    ).filter((i) => i.slot_typ);

    if (items.length < 2) {
      return Response.json(
        { error: 'Dein Schrank ist noch zu leer für Vorschläge. Lade zuerst ein paar Teile hoch.' },
        { status: 400 }
      );
    }

    const profil = firstOf(await db.ProfilEinstellung.filter({}, { limit: 1 })) || {};

    const zeilen = items
      .map((i) => {
        const tage = tageSeit(i.letzte_nutzung);
        return [
          `id=${i.id}`,
          i.name,
          `${i.kategorie}/${i.slot_typ}`,
          `Farben: ${(i.farben || []).join(', ') || 'unbekannt'}`,
          `Muster: ${i.muster || 'Unifarben'}`,
          `Saison: ${i.saison || 'Ganzjahres'}`,
          `Anlässe: ${(i.anlaesse || []).join(', ') || 'Alltag'}`,
          i.favorit ? 'Favorit' : 'kein Favorit',
          tage > 900 ? 'noch nie getragen' : `zuletzt vor ${tage} Tagen getragen`,
        ].join(' | ');
      })
      .join('\n');

    const schema = {
      type: 'object',
      properties: {
        vorschlaege: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              item_ids: { type: 'array', items: { type: 'string' } },
              ki_kommentar: { type: 'string' },
              temperatur_min: { type: 'number' },
              temperatur_max: { type: 'number' },
            },
            required: ['name', 'item_ids', 'ki_kommentar', 'temperatur_min', 'temperatur_max'],
          },
        },
      },
      required: ['vorschlaege'],
    };

    const prompt =
      'Du bist eine warmherzige, stilbewusste Freundin und stellst drei Outfit-Vorschläge zusammen.\n' +
      `Anlass: ${anlass}\nSaison: ${saison}\nTemperatur: etwa ${temp} °C\n` +
      (profil.style_beschreibung ? `Ihr Stil: ${profil.style_beschreibung}\n` : '') +
      (profil.lieblingsfarben?.length ? `Lieblingsfarben: ${profil.lieblingsfarben.join(', ')}\n` : '') +
      (profil.no_go_farben?.length ? `Geht gar nicht: ${profil.no_go_farben.join(', ')}\n` : '') +
      '\nVerfügbare Teile (verwende ausschließlich diese IDs, erfinde keine):\n' +
      zeilen +
      '\n\nRegeln:\n' +
      '- Genau 3 Vorschläge.\n' +
      '- Jedes Outfit ist vollständig: entweder top + bottom oder ein fullbody-Teil, plus passende shoes. outer und accessory nur wenn sinnvoll.\n' +
      '- Kein Muster auf Muster. Farben müssen zueinander passen, No-Go-Farben meiden.\n' +
      '- Bevorzuge Favoriten und Teile, die lange nicht getragen wurden (über 60 Tage).\n' +
      '- ki_kommentar: 1–2 Sätze, warm, persönlich, Deutsch, wie eine Freundin es sagen würde. Kein Werbeton.\n' +
      '- temperatur_min/max: realistische Temperaturspanne in °C für das Outfit.';

    let vorschlaege = [];
    try {
      const antwort = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: schema,
      });
      const roh = Array.isArray(antwort) ? antwort : antwort?.vorschlaege || [];
      const bekannte = new Set(items.map((i) => i.id));
      vorschlaege = roh
        .map((v) => ({
          name: v.name || 'Vorschlag',
          item_ids: [...new Set((v.item_ids || []).filter((id) => bekannte.has(id)))],
          ki_kommentar: v.ki_kommentar || '',
          temperatur_min: Number(v.temperatur_min) || 10,
          temperatur_max: Number(v.temperatur_max) || 22,
        }))
        .filter((v) => v.item_ids.length >= 2)
        .slice(0, 3);
    } catch (_e) {
      vorschlaege = [];
    }

    if (vorschlaege.length === 0) vorschlaege = fallback(items);

    return Response.json({ vorschlaege });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}