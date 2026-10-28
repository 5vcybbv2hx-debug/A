import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Star, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import FilterChips from '@/components/FilterChips';
import ItemTile from '@/components/ItemTile';
import ItemSheet from '@/components/ItemSheet';
import { KATEGORIEN, SAISONS, ANLAESSE } from '@/lib/constants';
import { cn } from '@/lib/utils';

const PAGE = 24;

export default function Schrank() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [next, setNext] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [kategorie, setKategorie] = useState(null);
  const [saison, setSaison] = useState(null);
  const [anlass, setAnlass] = useState(null);
  const [nurFavoriten, setNurFavoriten] = useState(false);
  const [langeNicht, setLangeNicht] = useState(false);
  const [suche, setSuche] = useState('');
  const [debounced, setDebounced] = useState('');
  const [active, setActive] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(suche.trim()), 350);
    return () => clearTimeout(t);
  }, [suche]);

  const query = useMemo(() => {
    const q = { status: 'Aktiv' };
    if (kategorie) q.kategorie = kategorie;
    if (saison) q.saison = saison;
    if (anlass) q.anlaesse = { $in: [anlass] };
    if (nurFavoriten) q.favorit = true;
    if (debounced) q.name = { $regex: debounced, $options: 'i' };
    if (langeNicht) {
      const grenze = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
      q.$or = [
        { letzte_nutzung: { $lt: grenze } },
        { letzte_nutzung: null },
        { letzte_nutzung: { $exists: false } },
      ];
    }
    return q;
  }, [kategorie, saison, anlass, nurFavoriten, langeNicht, debounced]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    base44.entities.Kleidungsstueck.filter(query, { sort: '-created_date', limit: PAGE })
      .then((page) => {
        if (!alive) return;
        setItems(page.items || []);
        setNext(page.next_cursor || null);
        setHasMore(Boolean(page.has_more));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [query, reload]);

  useEffect(() => {
    base44.entities.Kleidungsstueck.count({ status: 'Aktiv' }).then(setTotal);
  }, [reload]);

  const mehrLaden = async () => {
    if (!next) return;
    setLoading(true);
    const page = await base44.entities.Kleidungsstueck.filter(query, {
      sort: '-created_date',
      limit: PAGE,
      cursor: next,
    });
    setItems((prev) => [...prev, ...(page.items || [])]);
    setNext(page.next_cursor || null);
    setHasMore(Boolean(page.has_more));
    setLoading(false);
  };

  const toggleChip = (aktiv, setAktiv, icon, label) => (
    <button
      type="button"
      onClick={() => setAktiv(!aktiv)}
      className={cn(
        'flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] transition-colors',
        aktiv ? 'border-gold/60 bg-gold/10 text-foreground' : 'border-border bg-card text-muted-foreground'
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="px-4 pt-7 md:px-8 md:pt-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Mein Schrank</p>
          <h1 className="mt-1 font-heading text-[2rem] leading-none md:text-4xl">
            {total} {total === 1 ? 'Teil' : 'Teile'}
          </h1>
        </div>
        <Link
          to="/upload"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/50 text-gold"
          aria-label="Teile hinzufügen"
        >
          <Plus className="h-5 w-5" strokeWidth={1.6} />
        </Link>
      </header>

      <div className="relative mt-5">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder="Suchen …"
          className="min-h-[46px] w-full rounded-full border border-border bg-card pl-11 pr-4 text-[14px] outline-none placeholder:text-muted-foreground/70 focus:border-gold/50"
        />
      </div>

      <div className="mt-4 space-y-2">
        <FilterChips options={KATEGORIEN} value={kategorie} onChange={setKategorie} allLabel="Alle Kategorien" />
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {toggleChip(nurFavoriten, setNurFavoriten, <Star className="h-3.5 w-3.5" />, 'Favoriten')}
          {toggleChip(langeNicht, setLangeNicht, <Clock className="h-3.5 w-3.5" />, 'Lange nicht getragen')}
        </div>
        <FilterChips options={SAISONS} value={saison} onChange={setSaison} allLabel="Alle Saisons" />
        <FilterChips options={ANLAESSE} value={anlass} onChange={setAnlass} allLabel="Alle Anlässe" />
      </div>

      {!loading && items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="mb-5 h-16 w-12 rounded-t-full border border-dashed border-gold/50" />
          <p className="font-heading text-xl">Noch nichts hier</p>
          <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
            Fotografiere deine Lieblingsstücke – wir schneiden sie frei und erkennen alles automatisch.
          </p>
          <Link
            to="/upload"
            className="mt-6 flex min-h-[48px] items-center rounded-full bg-primary px-6 text-[13px] text-primary-foreground"
          >
            Teile hinzufügen
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => (
              <ItemTile key={item.id} item={item} onClick={() => setActive(item)} />
            ))}
          </div>
          {loading && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          )}
          {hasMore && (
            <button
              type="button"
              onClick={mehrLaden}
              className="mx-auto mt-8 block min-h-[46px] rounded-full border border-border px-6 text-[13px] text-muted-foreground"
            >
              Mehr laden
            </button>
          )}
        </>
      )}

      <ItemSheet
        item={active}
        open={Boolean(active)}
        onOpenChange={(open) => !open && setActive(null)}
        onChanged={() => {
          setReload((r) => r + 1);
          setActive(null);
        }}
      />
    </div>
  );
}