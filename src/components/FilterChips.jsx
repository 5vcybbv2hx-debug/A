import { cn } from '@/lib/utils';

export default function FilterChips({ options, value, onChange, allLabel = 'Alle', className }) {
  const items = [{ value: null, label: allLabel }, ...options.map((o) => (
    typeof o === 'string' ? { value: o, label: o } : o
  ))];

  return (
    <div className={cn('no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1', className)}>
      {items.map((option) => {
        const active = (value ?? null) === (option.value ?? null);
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-[44px] shrink-0 rounded-full border px-4 text-[13px] transition-colors',
              active
                ? 'border-gold/60 bg-gold/10 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}