import { Star, Sparkles } from 'lucide-react';
import FileImage from '@/components/FileImage';
import OutfitCollage from '@/components/OutfitCollage';
import { cn } from '@/lib/utils';

export default function OutfitCard({ outfit, items = [], onClick, footer = null, className }) {
  const hatKiBild = Boolean(outfit.tryon_bild);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border/70 bg-card transition-shadow',
        onClick && 'cursor-pointer hover:shadow-[0_18px_40px_-32px_rgba(60,45,30,0.6)]',
        className
      )}
      onClick={onClick}
    >
      <div className="relative aspect-[3/4] w-full bg-foto">
        {hatKiBild ? (
          <FileImage uri={outfit.tryon_bild} fittingType="fill" className="absolute inset-0 h-full w-full" />
        ) : (
          <OutfitCollage items={items} />
        )}
        {outfit.favorit && (
          <Star className="absolute right-2 top-2 h-4 w-4 fill-gold text-gold" strokeWidth={1.2} />
        )}
        {hatKiBild && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-background/85 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-foreground backdrop-blur">
            <Sparkles className="h-2.5 w-2.5 text-gold" /> KI
          </span>
        )}
      </div>
      <div className="px-3 py-3">
        <p className="truncate text-[13px] leading-tight">{outfit.name}</p>
        <p className="mt-1 truncate text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {[outfit.anlass, outfit.saison].filter(Boolean).join(' · ') || 'Ohne Angabe'}
        </p>
        {outfit.ki_kommentar && (
          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
            {outfit.ki_kommentar}
          </p>
        )}
        {footer}
      </div>
    </div>
  );
}