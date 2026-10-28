import OutfitCollage from '@/components/OutfitCollage';
import { ArrowRight } from 'lucide-react';

export default function SuggestionList({ vorschlaege = [], items = [], onPick, loading }) {
  if (loading) {
    return (
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }
  if (!vorschlaege.length) return null;

  return (
    <div className="mt-8">
      <h2 className="font-heading text-xl">Drei Ideen für dich</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {vorschlaege.map((v, index) => {
          const teile = v.item_ids.map((id) => items.find((i) => i.id === id)).filter(Boolean);
          return (
            <button
              key={index}
              type="button"
              onClick={() => onPick(v)}
              className="overflow-hidden rounded-2xl border border-border/70 bg-card text-left transition-colors hover:border-gold/50"
            >
              <div className="aspect-[4/3] w-full bg-foto">
                <OutfitCollage items={teile} count={4} />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px]">{v.name}</p>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gold" />
                </div>
                <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
                  {v.ki_kommentar}
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {v.temperatur_min}–{v.temperatur_max} °C
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}