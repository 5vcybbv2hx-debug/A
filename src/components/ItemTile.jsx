import { Star } from 'lucide-react';
import FileImage from '@/components/FileImage';
import { cn } from '@/lib/utils';

export default function ItemTile({ item, onClick, selected = false, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-card text-left transition-all',
        selected ? 'border-gold ring-1 ring-gold/40' : 'border-border/70',
        className
      )}
    >
      <div className="relative aspect-[3/4] w-full bg-foto">
        <FileImage
          uri={item.foto_freigestellt || item.foto_original}
          fittingType="fit"
          alt={item.name}
          className="absolute inset-0 h-full w-full object-contain p-2 mix-blend-multiply"
        />
        {item.favorit && (
          <Star className="absolute right-2 top-2 h-4 w-4 fill-gold text-gold" strokeWidth={1.2} />
        )}
      </div>
      <div className="px-2.5 pb-2.5 pt-2">
        <p className="truncate text-[12px] leading-tight text-foreground">{item.name}</p>
        <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {item.kategorie}
        </p>
      </div>
    </button>
  );
}