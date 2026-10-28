import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cloud, CloudLightning, CloudRain, CloudSnow, Sun, Loader2, Check, Luggage, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import OutfitCollage from '@/components/OutfitCollage';
import { ANLAESSE, todayISO, tomorrowISO, formatShort } from '@/lib/constants';
import { cn } from '@/lib/utils';

function WetterIcon({ beschreibung, className }) {
  const b = String(beschreibung || '').toLowerCase();
  const Icon = b.includes('regen') || b.includes('schauer')
    ? CloudRain
    : b.includes('schnee')
      ? CloudSnow
      : b.includes('gewitter')
        ? CloudLightning
        : b.includes('klar')
          ? Sun
          : Cloud;
  return <Icon className={className} strokeWidth={1.3} />;
}

export default function Heute() {
  const [tage, setTage] = useState([]);
  const [wetterBusy, setWetterBusy] = useState(true);
  const [anlass, setAnlass] = useState('Alltag');
  const [items, setItems] = useState([]);
  const [vorschlaege, setVorschlaege] = useState([]);
  const [suggBusy, setSuggBusy] = useState(false);
  const [offene, setOffene] = useState([]);
  const [geplant, setGeplant] = useState('');
  const [fehler, setFehler] = useState('');

  const stunde = new Date().getHours();
  const gruss = stunde >= 17 ? 'Guten Abend' : stunde >= 11 ? 'Guten Tag' : 'Guten Morgen';

  useEffect(() => {
    let alive = true;
    (async () => {
      const [itemsPage, outfitsPage, protokolle] = await Promise.all([
        base44.entities.Kleidungsstueck.filter({ status: 'Aktiv' }, { limit: 200 }),
        base44.entities.Outfit.filter({}, { sort: '-geplant_fuer', limit: 30 }),
        base44.entities.TrageProtokoll.list({ sort: '-datum', limit: 60 }),
      ]);
      if (!alive) return;
      setItems(itemsPage.items || []);

      const heute = todayISO();
      const protokollListe = protokolle.items || [];
      const offen = (outfitsPage.items || []).filter(
        (o) =>
          o.geplant_fuer &&
          o.geplant_fuer <= heute &&
          !protokollListe.some((p) => p.outfit_id === o.id && p.datum === o.geplant_fuer)
      );
      setOffene(offen);

      const position = await new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 8000 }
        );
      });
      const wetter = await base44.functions.invoke('getWeatherForecast', position || {});
      if (!alive) return;
      setTage(wetter.data?.tage || []);
      setWetterBusy(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const vorschlagen = async () => {
    setSuggBusy(true);
    setFehler('');
    try {
      const morgen = tage[1];
      const temp = morgen ? Math.round((morgen.temp_min + morgen.temp_max) / 2) : 18;
      const res = await base44.functions.invoke('generateOutfitSuggestions', {
        anlass,
        saison: 'Ganzjahres',
        wetter_temp: temp,
      });
      if (res.data?.error) setFehler(res.data.error);
      else setVorschlaege(res.data.vorschlaege || []);
    } catch (e) {
      setFehler(e?.response?.data?.error || 'Die Vorschläge konnten nicht geladen werden.');
    }
    setSuggBusy(false);
  };

  const fuerMorgenPlanen = async (v) => {
    const created = await base44.entities.Outfit.create({
      name: v.name,
      item_ids: v.item_ids,
      anlass,
      ki_kommentar: v.ki_kommentar,
      temperatur_min: v.temperatur_min,
      temperatur_max: v.temperatur_max,
      tryon_status: 'keins',
      favorit: false,
      nutzungszaehler: 0,
      geplant_fuer: tomorrowISO(),
    });
    setGeplant(created.id);
  };

  const getragen = async (outfit) => {
    const heute = todayISO();
    const ids = outfit.item_ids || [];
    const betroffen = (await base44.entities.Kleidungsstueck.filter({ id: { $in: ids } }, { limit: 50 })).items || [];
    for (const teil of betroffen) {
      await base44.entities.Kleidungsstueck.update(teil.id, {
        letzte_nutzung: heute,
        nutzungszaehler: (teil.nutzungszaehler || 0) + 1,
      });
    }
    await base44.entities.Outfit.update(outfit.id, {
      letzte_nutzung: heute,
      nutzungszaehler: (outfit.nutzungszaehler || 0) + 1,
    });
    await base44.entities.TrageProtokoll.create({
      outfit_id: outfit.id,
      outfit_name: outfit.name,
      datum: heute,
      anlass: outfit.anlass || '',
      wetter: tage[0]?.beschreibung || '',
    });
    setOffene((prev) => prev.filter((o) => o.id !== outfit.id));
  };

  const collage = (ids) => ids.map((id) => items.find((i) => i.id === id)).filter(Boolean);

  return (
    <div className="px-4 pb-6 pt-7 md:px-8 md:pt-10">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Heute & morgen</p>
          <h1 className="mt-1 font-heading text-[2rem] leading-none md:text-4xl">{gruss}</h1>
        </div>
        <Link
          to="/packlisten"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted-foreground"
          aria-label="Packlisten"
        >
          <Luggage className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {tage.slice(0, 2).map((tag, i) => (
          <div key={tag.datum} className="rounded-2xl border border-border/70 bg-card p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {i === 0 ? 'Heute' : 'Morgen'}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <WetterIcon beschreibung={tag.beschreibung} className="h-7 w-7 text-gold" />
              <div>
                <p className="font-heading text-2xl leading-none">
                  {tag.temp_max}°
                  <span className="ml-1 text-sm text-muted-foreground">{tag.temp_min}°</span>
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{tag.beschreibung}</p>
              </div>
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">{tag.regen}% Regen</p>
          </div>
        ))}
        {wetterBusy && (
          <div className="col-span-2 flex items-center gap-2 rounded-2xl border border-border/70 bg-card px-4 py-5 text-[12px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-gold" /> Wetter wird geladen …
          </div>
        )}
      </div>

      {offene.length > 0 && (
        <section className="mt-8">
          <h2 className="font-heading text-xl">Getragen?</h2>
          <div className="mt-3 space-y-3">
            {offene.map((outfit) => (
              <div key={outfit.id} className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-card p-3">
                <div className="h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-foto">
                  <OutfitCollage items={collage(outfit.item_ids || [])} count={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px]">{outfit.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    geplant für {formatShort(outfit.geplant_fuer)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => getragen(outfit)}
                  className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-[12px] text-primary-foreground"
                >
                  <Check className="h-3.5 w-3.5" /> Ja
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-heading text-xl">Wofür ziehst du dich morgen an?</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {ANLAESSE.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAnlass(a)}
              className={cn(
                'min-h-[38px] rounded-full border px-4 text-[13px] transition-colors',
                anlass === a ? 'border-gold/60 bg-gold/10' : 'border-border bg-card text-muted-foreground'
              )}
            >
              {a}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={vorschlagen}
          disabled={suggBusy}
          className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-border text-[13px] text-muted-foreground disabled:opacity-50"
        >
          {suggBusy ? <Loader2 className="h-4 w-4 animate-spin text-gold" /> : <Sparkles className="h-4 w-4 text-gold" />}
          Vorschläge für morgen
        </button>

        {fehler && (
          <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
            {fehler}
          </p>
        )}

        {geplant && (
          <div className="mt-4 rounded-2xl border border-gold/40 bg-gold/5 px-4 py-3 text-[12px]">
            Für morgen eingeplant. <Link to="/galerie" className="text-gold underline underline-offset-4">In der Galerie ansehen</Link>
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {vorschlaege.map((v, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border/70 bg-card">
              <div className="aspect-[4/3] bg-foto">
                <OutfitCollage items={collage(v.item_ids)} count={4} />
              </div>
              <div className="p-3">
                <p className="text-[13px]">{v.name}</p>
                <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
                  {v.ki_kommentar}
                </p>
                <button
                  type="button"
                  onClick={() => fuerMorgenPlanen(v)}
                  className="mt-3 min-h-[38px] w-full rounded-full border border-gold/50 text-[12px] text-foreground"
                >
                  Für morgen planen
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}