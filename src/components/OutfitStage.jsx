import { Loader2, Sparkles, UserRound } from 'lucide-react';
import FileImage from '@/components/FileImage';
import { cn } from '@/lib/utils';

const ZONES = {
  fullbody: 'left-[12%] top-[12%] h-[64%] w-[76%]',
  top: 'left-[22%] top-[20%] h-[28%] w-[56%]',
  bottom: 'left-[26%] top-[46%] h-[32%] w-[48%]',
  shoes: 'left-[28%] bottom-[3%] h-[12%] w-[44%]',
  outer: 'left-[6%] top-[9%] h-[46%] w-[88%]',
  accessory: 'right-[5%] top-[32%] h-[18%] w-[26%]',
};

const ORDER = [
  ['fullbody', 'z-[20]'],
  ['top', 'z-[25]'],
  ['bottom', 'z-[25]'],
  ['shoes', 'z-[28]'],
  ['outer', 'z-[32]'],
  ['accessory', 'z-[38]'],
];

function Layers({ items, blend }) {
  return (
    <>
      {ORDER.map(([slot, z]) => {
        const item = items.find((i) => i.slot_typ === slot);
        if (!item) return null;
        return (
          <FileImage
            key={slot}
            uri={item.foto_freigestellt || item.foto_original}
            fittingType="fit"
            alt={item.name}
            className={cn(
              'absolute object-contain',
              ZONES[slot],
              z,
              'mix-blend-multiply'
            )}
          />
        );
      })}
    </>
  );
}

export default function OutfitStage({
  view,
  items = [],
  basismodellFoto,
  tryonBild,
  rendering = false,
  onRequestTryOn,
  onGoProfile,
}) {
  const leer = items.length === 0;

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[1.75rem] border border-border/70 bg-foto">
      {view === 'ki' && (
        <>
          {tryonBild ? (
            <FileImage uri={tryonBild} fittingType="fill" className="absolute inset-0 h-full w-full" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-gold/40">
                <Sparkles className="h-5 w-5 text-gold" strokeWidth={1.5} />
              </span>
              <p className="font-heading text-lg text-foto-foreground">Deine KI-Anprobe</p>
              <p className="mt-2 text-[12px] leading-relaxed text-foto-foreground/70">
                Ein fotorealistisches Bild von dir in genau diesem Outfit. Das dauert einen Moment.
              </p>
              <button
                type="button"
                onClick={onRequestTryOn}
                disabled={leer || rendering}
                className="mt-5 min-h-[44px] rounded-full bg-primary px-6 text-[13px] text-primary-foreground disabled:opacity-40"
              >
                {rendering ? 'Wird erstellt …' : 'Anziehen'}
              </button>
            </div>
          )}
        </>
      )}

      {view === 'aufmir' && (
        <>
          {basismodellFoto ? (
            <FileImage
              uri={basismodellFoto}
              fittingType="fill"
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
              <UserRound className="mb-3 h-8 w-8 text-foto-foreground/40" strokeWidth={1.2} />
              <p className="text-[13px] text-foto-foreground/70">
                Für diese Ansicht brauchst du ein Basisfoto von dir.
              </p>
              <button
                type="button"
                onClick={onGoProfile}
                className="mt-4 min-h-[44px] rounded-full border border-gold/60 px-5 text-[13px] text-foto-foreground"
              >
                Zum Profil
              </button>
            </div>
          )}
          <Layers items={items} blend />
        </>
      )}

      {view === 'silhouette' && (
        <>
          <div className="absolute inset-x-0 bottom-0 h-[86%] rounded-t-[45%] border border-dashed border-foto-foreground/20" />
          {leer && (
            <div className="absolute inset-0 flex items-center justify-center px-10 text-center text-[13px] text-foto-foreground/60">
              Tippe unten ein Teil an, um dein Outfit zu beginnen.
            </div>
          )}
          <Layers items={items} />
        </>
      )}

      {rendering && view !== 'ki' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      )}
    </div>
  );
}