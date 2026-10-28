import { useState } from 'react';
import ItemTile from '@/components/ItemTile';
import { SLOTS, SLOT_LABEL } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function StudioShelf({ items, selectedIds, onToggle }) {
  const [slot, setSlot] = useState(null);
  const gefiltert = slot ? items.filter((i) => i.slot_typ === slot) : items;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-xl">Dein Regal</h2>
        <span className="text-[11px] text-muted-foreground">{gefiltert.length} Teile</span>
      </div>

      <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1">
        {[{ value: null, label: 'Alle' }, ...SLOTS.map((s) => ({ value: s, label: SLOT_LABEL[s] }))].map(
          (option) => (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => setSlot(option.value)}
              className={cn(
                'min-h-[36px] shrink-0 rounded-full border px-3.5 text-[12px] transition-colors',
                (slot ?? null) === option.value
                  ? 'border-gold/60 bg-gold/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground'
              )}
            >
              {option.label}
            </button>
          )
        )}
      </div>

      {gefiltert.length === 0 ? (
        <p className="mt-6 text-[13px] text-muted-foreground">In diesem Bereich ist noch nichts.</p>
      ) : (
        <div className="no-scrollbar -mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-2">
          {gefiltert.map((item) => (
            <ItemTile
              key={item.id}
              item={item}
              selected={selectedIds.includes(item.id)}
              onClick={() => onToggle(item)}
              className="w-[104px] shrink-0"
            />
          ))}
        </div>
      )}
    </div>
  );
}