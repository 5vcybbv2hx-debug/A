import { useEffect, useState } from 'react';
import { Loader2, Luggage, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PacklisteDetail from '@/components/PacklisteDetail';
import BackHeader from '@/components/BackHeader';
import { formatDate, tomorrowISO } from '@/lib/constants';

export default function Packlisten() {
  const [listen, setListen] = useState([]);
  const [aktiv, setAktiv] = useState(null);
  const [form, setForm] = useState({
    ziel: '',
    startdatum: tomorrowISO(),
    enddatum: tomorrowISO(),
    wetter_kontext: '',
  });
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    base44.entities.Packliste.list({ sort: '-created_date', limit: 30 }).then((page) => {
      if (alive) setListen(page.items || []);
    });
    return () => {
      alive = false;
    };
  }, [reload]);

  const erstellen = async () => {
    if (!form.ziel.trim()) {
      setFehler('Bitte ein Reiseziel angeben.');
      return;
    }
    setBusy(true);
    setFehler('');
    try {
      const res = await base44.functions.invoke('suggestPackliste', form);
      if (res.data?.error) {
        setFehler(res.data.error);
      } else {
        setAktiv(res.data.packliste);
        setReload((r) => r + 1);
      }
    } catch (e) {
      setFehler(e?.response?.data?.error || 'Die Packliste konnte nicht erstellt werden.');
    }
    setBusy(false);
  };

  if (aktiv) {
    const aktuell = listen.find((l) => l.id === aktiv.id) || aktiv;
    return (
      <div className="px-4 pb-8 pt-7 md:px-8 md:pt-10">
        <PacklisteDetail
          pack={aktuell}
          onBack={() => setAktiv(null)}
          onChanged={() => setReload((r) => r + 1)}
        />
      </div>
    );
  }

  const inputClass =
    'min-h-[44px] w-full rounded-xl border border-input bg-card px-3 text-[14px] outline-none focus:border-gold/60';

  return (
    <div className="px-4 pb-8 pt-7 md:px-8 md:pt-10">
      <BackHeader label="Zurück" />
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Reise-Assistent</p>
        <h1 className="mt-1 font-heading text-[2rem] leading-none md:text-4xl">Packlisten</h1>
      </header>

      <div className="mt-6 rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          <p className="text-[12px] text-muted-foreground">Neue Reise planen</p>
        </div>
        <div className="mt-4 space-y-3">
          <input
            className={inputClass}
            placeholder="Wohin? z. B. Lissabon"
            value={form.ziel}
            onChange={(e) => setForm((f) => ({ ...f, ziel: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Von</span>
              <input type="date" className={inputClass} value={form.startdatum} onChange={(e) => setForm((f) => ({ ...f, startdatum: e.target.value }))} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Bis</span>
              <input type="date" className={inputClass} value={form.enddatum} onChange={(e) => setForm((f) => ({ ...f, enddatum: e.target.value }))} />
            </label>
          </div>
          <input
            className={inputClass}
            placeholder="Wetter vor Ort (optional), z. B. mild, 18–22 °C"
            value={form.wetter_kontext}
            onChange={(e) => setForm((f) => ({ ...f, wetter_kontext: e.target.value }))}
          />
          <button
            type="button"
            onClick={erstellen}
            disabled={busy}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-primary text-[13px] text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Luggage className="h-4 w-4" />}
            {busy ? 'Ich packe mit dir …' : 'Packliste erstellen'}
          </button>
          {fehler && <p className="text-[12px] text-destructive">{fehler}</p>}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-heading text-xl">Deine Reisen</h2>
        {listen.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">Noch keine Packliste angelegt.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {listen.map((pack) => (
              <li key={pack.id}>
                <button
                  type="button"
                  onClick={() => setAktiv(pack)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-4 py-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px]">{pack.ziel}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatDate(pack.startdatum)} – {formatDate(pack.enddatum)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {pack.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}