import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const ENTITAETEN = [
  'Kleidungsstueck',
  'Basismodell',
  'Outfit',
  'TrageProtokoll',
  'Packliste',
  'ProfilEinstellung',
];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth
      .me()
      .catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const geloescht: Record<string, number> = {};

    for (const name of ENTITAETEN) {
      const entity = base44.entities[name];
      if (!entity?.deleteMany) continue;
      try {
        const anzahl = await base44.entities[name].count({ created_by_id: user.id });
        await base44.entities[name].deleteMany({ created_by_id: user.id });
        geloescht[name] = anzahl;
      } catch (_e) {
        geloescht[name] = -1;
      }
    }

    return Response.json({ ok: true, geloescht });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}