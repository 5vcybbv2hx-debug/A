import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shirt, Sparkles, Footprints } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const PREVIEW = [
  { icon: Shirt, tone: 'from-[hsl(36_32%_88%)] to-[hsl(34_24%_80%)]' },
  { icon: Sparkles, tone: 'from-[hsl(30_20%_90%)] to-[hsl(28_16%_78%)]' },
  { icon: Footprints, tone: 'from-[hsl(38_28%_90%)] to-[hsl(32_20%_82%)]' },
];

export default function Willkommen() {
  const [stats, setStats] = useState({ teile: 0, outfits: 0, looks: 0 });
  const [hatBasis, setHatBasis] = useState(false);
  const [widmung, setWidmung] = useState('Für A, mit Liebe');
  const [geladen, setGeladen] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      base44.entities.Kleidungsstueck.count({ status: 'Aktiv' }),
      base44.entities.Outfit.count({}),
      base44.entities.TrageProtokoll.count({}),
      base44.entities.ProfilEinstellung.filter({}, { limit: 1 }),
      base44.entities.Basismodell.count({}),
    ])
      .then(([teile, outfits, looks, profilPage, basis]) => {
        if (!alive) return;
        setStats({ teile, outfits, looks });
        setHatBasis(basis > 0);
        const text = profilPage.items?.[0]?.widmung;
        if (text) setWidmung(text);
      })
      .finally(() => alive && setGeladen(true));
    return () => {
      alive = false;
    };
  }, []);

  const [ersteZeile, ...rest] = widmung.split(',');
  const zweiteZeile = rest.join(',').trim();

  // Ohne Basisfoto und ohne Teile ist der geführte Erststart der sinnvollste Weg.
  const neu = geladen && stats.teile === 0 && !hatBasis;

  const kacheln = [
    { label: 'Teile', value: stats.teile },
    { label: 'Outfits', value: stats.outfits },
    { label: 'Looks getragen', value: stats.looks },
  ];

  return (
    <div className="sand-surface min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 pb-10 pt-16 md:pt-24">
        <div className="flex flex-1 flex-col items-center text-center">
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-gold/40">
            <span className="font-display text-3xl leading-none text-gold">A</span>
          </div>

          <p className="mb-4 text-[11px] uppercase tracking-[0.32em] text-muted-foreground">Willkommen</p>
          <h1 className="font-display text-[2.6rem] leading-[1.08] tracking-tight md:text-6xl">
            {ersteZeile}
            {zweiteZeile && (
              <>
                ,
                <br />
                <span className="italic text-gold">{zweiteZeile}</span>
              </>
            )}
          </h1>
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
            Dein eigener Schrank, der dich kennt. Fotografiere deine Lieblingsstücke und sieh dich selbst in
            jedem Outfit – noch bevor du es anziehst.
          </p>

          <div className="mt-12 flex w-full items-end justify-center gap-3">
            {PREVIEW.map(({ icon: Icon, tone }, i) => (
              <div
                key={i}
                className={`flex ${i === 1 ? 'h-40 w-24' : 'h-32 w-20'} items-center justify-center rounded-2xl border border-border/60 bg-gradient-to-b ${tone} shadow-[0_18px_40px_-28px_rgba(60,45,30,0.55)]`}
              >
                <Icon className="h-7 w-7 text-foreground/25" strokeWidth={1.2} />
              </div>
            ))}
          </div>

          <div className="mt-14 grid w-full grid-cols-3 divide-x divide-border/70 rounded-2xl border border-border/70 bg-card/70 py-5 backdrop-blur">
            {kacheln.map(({ label, value }) => (
              <div key={label} className="px-2">
                <p className="font-display text-2xl leading-none md:text-3xl">
                  {geladen ? value : '–'}
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
          <Link
            to={neu ? '/start' : '/schrank'}
            className="group flex min-h-[52px] w-full max-w-sm items-center justify-center gap-2 rounded-full bg-primary px-8 text-[15px] text-primary-foreground transition-transform active:scale-[0.99]"
          >
            {neu ? 'Schrank einrichten' : 'In den Schrank'}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
          </Link>
          {neu && (
            <Link to="/heute" className="text-[12px] text-gold underline decoration-gold/40 underline-offset-4">
              Erst mal umsehen
            </Link>
          )}
          <p className="text-[11px] tracking-wide text-muted-foreground">Alle Fotos bleiben privat.</p>
        </div>
      </div>
    </div>
  );
}