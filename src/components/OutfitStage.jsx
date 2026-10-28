import { useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles, UserRound, RotateCcw } from 'lucide-react';
import FileImage from '@/components/FileImage';
import { resolveFile } from '@/lib/files';
import { STANDARD_ZONEN } from '@/lib/kalibrierung';
import { zoneForItem } from '@/lib/constants';
import { cn } from '@/lib/utils';

// Reihenfolge der Zonen von hinten nach vorn. Accessoires liegen über der
// Kleidung, das Haarband über allem.
const ORDER = [
  ['fullbody', 20],
  ['bottom', 24],
  ['top', 26],
  ['shoes', 28],
  ['outer', 32],
  ['accessory', 34],
  ['accessory_hand', 36],
  ['accessory_hals', 38],
  ['accessory_kopf', 40],
];

const RUHE = { dx: 0, dy: 0, s: 1 };

/**
 * Zeigt die Datei ohne serverseitige Bildtransformation an.
 * Wichtig für die "Auf mir"-Ansicht: Ein Transformat könnte das Bild beschneiden
 * oder den Alphakanal verlieren, und dann sitzt die Kleidung nicht mehr.
 */
function RohesBild({ uri, alt, className, platzhalter }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let lebt = true;
    if (!uri) {
      setSrc(null);
      return undefined;
    }
    resolveFile(uri)
      .then((url) => lebt && setSrc(url))
      .catch(() => lebt && setSrc(null));
    return () => {
      lebt = false;
    };
  }, [uri]);

  if (!src) {
    return platzhalter ? (
      <div className={cn('flex items-center justify-center', className)}>{platzhalter}</div>
    ) : null;
  }
  return <img src={src} alt={alt} className={className} draggable={false} />;
}

function Ebene({ slot, item, zone, zIndex, aktiv, onAktiv, anpassung, onAnpassung, buehneBreite }) {
  const zeiger = useRef(new Map());
  const geste = useRef(null);
  const bewegt = useRef(false);
  const letzterTipp = useRef(0);

  const setze = (patch) => onAnpassung(slot, { ...anpassung, ...patch });

  const abstand = () => {
    const [a, b] = [...zeiger.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const runter = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    zeiger.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    bewegt.current = false;
    onAktiv();
    geste.current = {
      x: e.clientX,
      y: e.clientY,
      dx: anpassung.dx,
      dy: anpassung.dy,
      s: anpassung.s,
      abstand: zeiger.current.size === 2 ? abstand() : 0,
    };
  };

  const bewegen = (e) => {
    if (!zeiger.current.has(e.pointerId) || !geste.current) return;
    zeiger.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (zeiger.current.size >= 2 && geste.current.abstand > 0) {
      const faktor = abstand() / geste.current.abstand;
      setze({ s: Math.min(3, Math.max(0.4, geste.current.s * faktor)) });
      bewegt.current = true;
      return;
    }

    const breite = buehneBreite || 1;
    const versatzX = e.clientX - geste.current.x;
    const versatzY = e.clientY - geste.current.y;
    if (Math.abs(versatzX) > 3 || Math.abs(versatzY) > 3) bewegt.current = true;
    setze({
      dx: geste.current.dx + (versatzX / breite) * 100,
      dy: geste.current.dy + (versatzY / breite) * 100,
    });
  };

  const hoch = (e) => {
    zeiger.current.delete(e.pointerId);
    if (zeiger.current.size > 0) return;
    geste.current = null;
    if (bewegt.current) return;
    const jetzt = Date.now();
    if (jetzt - letzterTipp.current < 320) {
      onAnpassung(slot, { ...RUHE });
      letzterTipp.current = 0;
    } else {
      letzterTipp.current = jetzt;
    }
  };

  return (
    <div
      className="absolute"
      style={{
        left: `${zone.x}%`,
        top: `${zone.y}%`,
        width: `${zone.w}%`,
        height: `${zone.h}%`,
      }}
    >
      <div
        role="img"
        aria-label={item.name}
        onPointerDown={runter}
        onPointerMove={bewegen}
        onPointerUp={hoch}
        onPointerCancel={hoch}
        className={cn(
          'h-full w-full select-none',
          aktiv && 'outline outline-1 outline-dashed outline-gold/70'
        )}
        style={{
          transform: `translate(${((anpassung.dx || 0) / 100) * (buehneBreite || 0)}px, ${
            ((anpassung.dy || 0) / 100) * (buehneBreite || 0)
          }px) scale(${anpassung.s || 1})`,
          touchAction: aktiv ? 'none' : 'pan-y',
          WebkitUserSelect: 'none',
          zIndex,
        }}
      >
        <RohesBild
          uri={item.foto_freigestellt || item.foto_original}
          alt={item.name}
          className="h-full w-full object-contain"
        />
      </div>
    </div>
  );
}

export default function OutfitStage({
  view,
  items = [],
  basismodellFoto,
  basismodellFotoFreigestellt,
  zonen,
  seitenverhaeltnis,
  tryonBild,
  rendering = false,
  onRequestTryOn,
  onGoProfile,
}) {
  const leer = items.length === 0;
  const buehneRef = useRef(null);
  const [buehne, setBuehne] = useState({ breite: 0, hoehe: 0 });
  const [aktiverSlot, setAktiverSlot] = useState(null);
  const [anpassungen, setAnpassungen] = useState({});

  useEffect(() => {
    const knoten = buehneRef.current;
    if (!knoten || typeof ResizeObserver === 'undefined') return;
    const beobachter = new ResizeObserver((eintraege) => {
      const kasten = eintraege[0]?.contentRect;
      if (kasten) setBuehne({ breite: kasten.width, hoehe: kasten.height });
    });
    beobachter.observe(knoten);
    return () => beobachter.disconnect();
  }, []);

  const basisFoto = basismodellFotoFreigestellt || basismodellFoto;
  const karte = { ...STANDARD_ZONEN, ...(zonen || {}) };

  // Das Bild bekommt einen eigenen Rahmen im Seitenverhältnis des Fotos.
  // Nur so treffen die gemessenen Prozentwerte den Körper und nicht die Bühne.
  const rahmen = (() => {
    if (!buehne.breite || !buehne.hoehe) return null;
    const verhaeltnis = seitenverhaeltnis || buehne.breite / buehne.hoehe;
    let breite = buehne.breite;
    let hoehe = breite / verhaeltnis;
    if (hoehe > buehne.hoehe) {
      hoehe = buehne.hoehe;
      breite = hoehe * verhaeltnis;
    }
    return {
      left: (buehne.breite - breite) / 2,
      top: (buehne.hoehe - hoehe) / 2,
      width: breite,
      height: hoehe,
    };
  })();

  const hatAnpassung = Object.values(anpassungen).some(
    (a) => a && (Math.abs(a.dx) > 0.5 || Math.abs(a.dy) > 0.5 || Math.abs((a.s || 1) - 1) > 0.02)
  );

  const ebene = (slot, zIndex) => {
    const item = items.find((i) => zoneForItem(i) === slot);
    if (!item) return null;
    return (
      <Ebene
        key={slot}
        slot={slot}
        item={item}
        zone={karte[slot] || STANDARD_ZONEN[slot]}
        zIndex={zIndex}
        aktiv={aktiverSlot === slot}
        onAktiv={() => setAktiverSlot(slot)}
        anpassung={{ ...RUHE, ...(anpassungen[slot] || {}) }}
        onAnpassung={(schluessel, wert) =>
          setAnpassungen((alt) => ({ ...alt, [schluessel]: wert }))
        }
        buehneBreite={rahmen ? rahmen.width : buehne.breite}
      />
    );
  };

  return (
    <div
      ref={buehneRef}
      className="relative aspect-[3/4] w-full overflow-hidden rounded-[1.75rem] border border-border/70 bg-foto"
    >
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
          {basisFoto ? (
            <div
              className="absolute"
              style={
                rahmen
                  ? { left: rahmen.left, top: rahmen.top, width: rahmen.width, height: rahmen.height }
                  : { inset: 0 }
              }
            >
              <RohesBild
                uri={basisFoto}
                alt="Basisfoto"
                className="absolute inset-0 h-full w-full object-contain"
              />
              {ORDER.map(([slot, z]) => ebene(slot, z))}
            </div>
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
          {ORDER.map(([slot, z]) => ebene(slot, z))}
        </>
      )}

      {view === 'aufmir' && aktiverSlot && (
        <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[10px] text-foto-foreground/60">
          Ziehen verschiebt, zwei Finger skalieren, Doppeltipp setzt zurück
        </p>
      )}

      {hatAnpassung && (
        <button
          type="button"
          onClick={() => setAnpassungen({})}
          className="absolute right-2 top-2 flex min-h-[44px] items-center gap-1.5 rounded-full border border-border bg-background/85 px-3 text-[11px] text-foreground backdrop-blur"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Ausrichtung
        </button>
      )}

      {rendering && view !== 'ki' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      )}
    </div>
  );
}
