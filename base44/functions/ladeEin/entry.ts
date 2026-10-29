import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { angemeldeterUser } from '../../shared/aura.ts';

// Lädt eine Person in die App ein. Der Aufruf geht bewusst mit der Identität der
// einladenden Person, nicht als Service Role: so bleibt nachvollziehbar, wer
// eingeladen hat, und es gilt dieselbe Berechtigung wie für den Knopf im Editor.

const EMAIL_MUSTER = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function (req) {
  try {
    const { email, rolle } = await req.json().catch(() => ({}));
    const adresse = String(email || '').trim().toLowerCase();
    if (!EMAIL_MUSTER.test(adresse)) {
      return Response.json({ error: 'Bitte eine gültige E-Mail-Adresse angeben.' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const user = await angemeldeterUser(base44);
    if (!user) return Response.json({ error: 'Bitte zuerst anmelden.' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Nur die Inhaberin der App kann einladen.' }, { status: 403 });
    }
    if (String(user.email || '').toLowerCase() === adresse) {
      return Response.json({ error: 'Du bist selbst schon dabei.' }, { status: 400 });
    }

    const gewuenschteRolle = rolle === 'admin' ? 'admin' : 'user';
    const ergebnis = await base44.users.inviteUser(adresse, gewuenschteRolle);

    return Response.json({
      ok: true,
      email: adresse,
      rolle: gewuenschteRolle,
      eingeladen_von: user.email,
      antwort: ergebnis ?? null,
    });
  } catch (fehler) {
    const meldung = fehler?.response?.data?.message || fehler?.message || 'Die Einladung ging nicht raus.';
    return Response.json({ error: meldung }, { status: fehler?.status || 400 });
  }
}
