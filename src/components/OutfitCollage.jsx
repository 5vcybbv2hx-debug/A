import FileImage from '@/components/FileImage';
import { cn } from '@/lib/utils';

export default function OutfitCollage({ items = [], className, count = 4 }) {
  const sichtbar = items.slice(0, count);
  const gridClass =
    sichtbar.length <= 1
      ? 'grid-cols-1'
      : sichtbar.length === 2
        ? 'grid-cols-2'
        : 'grid-cols-2';

  return (
    <div className={cn('grid h-full w-full gap-[2px] bg-foto', gridClass, className)}>
      {sichtbar.map((item, index) => (
        <div key={item.id || index} className="relative overflow-hidden bg-foto">
          <FileImage
            uri={item.foto_freigestellt || item.foto_original}
            fittingType="fit"
            alt={item.name}
            className="absolute inset-0 h-full w-full object-contain p-1.5 mix-blend-multiply"
          />
        </div>
      ))}
    </div>
  );
}