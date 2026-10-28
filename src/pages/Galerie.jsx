import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Sparkles, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import OutfitCard from '@/components/OutfitCard';
import FileImage from '@/components/FileImage';
import OutfitCollage from '@/components/OutfitCollage';
import FilterChips from '@/components/FilterChips';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ANLAESSE, SAISONS, formatDate } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function Galerie() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('outfits');
  const [outfits, setOutfits] = useState([]);
  const [items, setItems] = useState([]);
  const [protokolle, setProtokolle] = useState([]);
  const [anlass, setAnlass] = useState(null);
  const [saison, setSaison] = useState(null);
  const [nurFavoriten, setNurFavoriten] = useState(false);
  const [aktiv, setAktiv] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([
      base44.entities.Outfit.filter({}, { sort: '-created_date', limit: 100 }),
      base44.entities.Kleidungsstueck.filter({ status: 'Aktiv' }, { limit: 300 }),
      base44.entities.TrageProtokoll.list({ sort: '-datum', limit: 100 }),
    ]).then(([outfitPage, itemPage, protokollPage]) => {
      if (!alive) return;
      setOutfits(outfitPage.items || []);
      setItems(itemPage.items || []);
      setProtokolle(protokollPage.items || []);
    });
    return () => {
      alive = false;
    };
  }, [reload]);

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const teile = (ids = []) => ids.map((id) => itemMap.get(id)).filter(Boolean);

  const gefiltert = outfits.filter((o) => {
    if (anlass && o.anlass !== anlass) return false;
    if (saison && o.saison !== saison) return false;
    if (nurFavoriten && !o.favorit) return false;
    return true;
  });

  const favorit = async (outfit) => {
    await base44.entities.Outfit.update(outfit.id, { favorit: !outfit.favorit });
    setAktiv((a) => (a ? { ...a, favorit: !a.favorit } : a));
    setReload((r) => r + 1);
  };

  const loeschen = async (outfit) => {
    await base44.entities.Outfit.delete(outfit.id);
    setAktiv(null);
    setReload((r) => r + 1);
  };

  return (
    <div className="px-4 pb-6 pt-7 md:px-8 md:pt-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Outfit-Galerie</p>
          <h1 className="mt-1 font-heading text-[2rem] leading-none md:text-4xl">Deine Looks</h1>
        </div>
        <Link to="/upload?modus=look" className="pb-1 text-[12px] text-gold underline decoration-gold/40 underline-offset-4">
          Look vom Foto
        </Link>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-full border border-border bg-card p-1">
        {[
          { key: 'outfits', label: 'Outfits' },
          { key: 'historie', label: 'Historie' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'min-h-[40px] rounded-full text-[12px] transition-colors',
              tab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'outfits' ? (
        <>
          <div className="mt-4 space-y-2">
            <FilterChips options={ANLAESSE} value={anlass} onChange={setAnlass} allLabel="Alle Anlässe" />
            <div className="flex items-center gap-2">
              <FilterChips
                options={SAISONS}
                value={saison}
                onChange={setSaison}
                allLabel="Alle Saisons"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => setNurFavoriten((v) => !v)}
                className={cn(
                  'mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                  nurFavoriten ? 'border-gold/60 bg-gold/10' : 'border-border text-muted-foreground'
                )}
                aria-label="Nur Favoriten"
              >
                <Star className={cn('h-3.5 w-3.5', nurFavoriten && 'fill-gold text-gold')} />
              </button>
            </div>
          </div>

          {gefiltert.length === 0 ? (
            <div className="mt-16 text-center">
              <p className="font-heading text-xl">Noch keine Outfits</p>
              <p className="mt-2 text-[13px] text-muted-foreground">
                Stelle im Studio dein erstes Outfit zusammen.
              </p>
              <Link
                to="/studio"
                className="mt-6 inline-flex min-h-[46px] items-center rounded-full bg-primary px-6 text-[13px] text-primary-foreground"
              >
                Ins Studio
              </Link>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {gefiltert.map((outfit) => (
                <OutfitCard
                  key={outfit.id}
                  outfit={outfit}
                  items={teile(outfit.item_ids)}
                  onClick={() => setAktiv(outfit)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="mt-6">
          {protokolle.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Noch nichts getragen – das kommt mit der Zeit.</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {protokolle.map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-[13px]">{p.outfit_name || 'Outfit'}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {[p.anlass, p.wetter].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{formatDate(p.datum)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Sheet open={Boolean(aktiv)} onOpenChange={(open) => !open && setAktiv(null)}>
        <SheetContent side="bottom" className="h-[88vh] overflow-y-auto rounded-t-3xl border-border bg-card p-0">
          {aktiv && (
            <>
              <SheetHeader className="border-b border-border/70 px-5 py-4">
                <SheetTitle className="font-heading text-lg font-normal">{aktiv.name}</SheetTitle>
              </SheetHeader>
              <div className="p-5">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border/70 bg-accent/60">
                  {aktiv.tryon_bild ? (
                    <FileImage uri={aktiv.tryon_bild} fittingType="fill" className="absolute inset-0 h-full w-full" />
                  ) : (
                    <OutfitCollage items={teile(aktiv.item_ids)} count={4} />
                  )}
                </div>

                {aktiv.ki_kommentar && (
                  <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">{aktiv.ki_kommentar}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {teile(aktiv.item_ids).map((teil) => (
                    <span key={teil.id} className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground">
                      {teil.name}
                    </span>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => favorit(aktiv)}
                    className="flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-border text-[13px]"
                  >
                    <Star className={cn('h-4 w-4', aktiv.favorit && 'fill-gold text-gold')} /> Favorit
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/studio?outfit=${aktiv.id}`)}
                    className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-primary text-[13px] text-primary-foreground"
                  >
                    <Sparkles className="h-4 w-4" /> Im Studio
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => loeschen(aktiv)}
                  className="mx-auto mt-4 flex min-h-[44px] items-center gap-2 text-[12px] text-muted-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Outfit löschen
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}