import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Check, ExternalLink, Layers, Star, Trash2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { todayISO } from '@/lib/constants';
import FileImage from '@/components/FileImage';
import ItemForm from '@/components/ItemForm';
import { cn } from '@/lib/utils';

export default function ItemSheet({ item, open, onOpenChange, onChanged }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [loeschen, setLoeschen] = useState(false);

  useEffect(() => {
    if (item) setForm({ ...item });
    setLoeschen(false);
  }, [item, open]);

  if (!item) return null;

  const patch = (data) => setForm((f) => ({ ...f, ...data }));

  const speichern = async () => {
    setSaving(true);
    await base44.entities.Kleidungsstueck.update(item.id, {
      name: form.name || 'Ohne Namen',
      kategorie: form.kategorie,
      slot_typ: form.slot_typ,
      farben: form.farben || [],
      muster: form.muster,
      saison: form.saison,
      anlaesse: form.anlaesse || [],
      marke: form.marke || '',
      groesse: form.groesse || '',
      status: form.status || 'Aktiv',
      verarbeitungs_status: 'geprueft',
    });
    setSaving(false);
    onChanged?.();
    onOpenChange(false);
  };

  const heuteGetragen = async () => {
    await base44.entities.Kleidungsstueck.update(item.id, {
      letzte_nutzung: todayISO(),
      nutzungszaehler: (item.nutzungszaehler || 0) + 1,
    });
    onChanged?.();
    onOpenChange(false);
  };

  const favoritUmschalten = async () => {
    const neu = !form.favorit;
    patch({ favorit: neu });
    try {
      await base44.entities.Kleidungsstueck.update(item.id, { favorit: neu });
      onChanged?.();
    } catch (_e) {
      patch({ favorit: !neu });
    }
  };

  const loeschenBestaetigen = async () => {
    await base44.entities.Kleidungsstueck.delete(item.id);
    onChanged?.();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] overflow-y-auto overscroll-contain rounded-t-3xl border-border bg-card p-0"
      >
        <SheetHeader className="sticky top-0 z-10 flex flex-row items-center justify-between border-b border-border/70 bg-card/95 px-5 py-3 backdrop-blur">
          <SheetTitle className="font-heading text-lg font-normal">Teil bearbeiten</SheetTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        <div className="px-5 pb-8 pt-4">
          <div className="relative mb-5 aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border/70 bg-foto">
            <FileImage
              uri={item.foto_freigestellt || item.foto_original}
              fittingType="fit"
              alt={item.name}
              className="absolute inset-0 h-full w-full object-contain p-4"
            />
            <button
              type="button"
              onClick={favoritUmschalten}
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-card/90 backdrop-blur"
              aria-label="Favorit"
            >
              <Star
                className={cn('h-4 w-4', form.favorit ? 'fill-gold text-gold' : 'text-muted-foreground')}
                strokeWidth={1.5}
              />
            </button>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {item.letzte_nutzung && <span>Zuletzt: {item.letzte_nutzung}</span>}
            <span>· {item.nutzungszaehler || 0}× getragen</span>
            {item.shop_name && <span>· {item.shop_name}</span>}
            {typeof item.preis === 'number' && (
              <span>· {item.preis.toFixed(2).replace('.', ',')} €</span>
            )}
            {item.quelle_url && (
              <a
                href={item.quelle_url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-h-[44px] items-center gap-1 text-gold underline decoration-gold/40 underline-offset-4"
              >
                <ExternalLink className="h-3 w-3" strokeWidth={1.6} />
                zum Produkt
              </a>
            )}
          </div>

          <ItemForm value={form} onChange={patch} />

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={heuteGetragen}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-border text-[13px]"
            >
              <Check className="h-4 w-4" /> Heute getragen
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                navigate(`/studio?item=${item.id}`);
              }}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-border text-[13px]"
            >
              <Layers className="h-4 w-4" /> Zu Outfit
            </button>
          </div>

          <button
            type="button"
            onClick={speichern}
            disabled={saving}
            className="mt-3 min-h-[52px] w-full rounded-full bg-primary text-[14px] text-primary-foreground disabled:opacity-50"
          >
            {saving ? 'Speichern …' : 'Speichern'}
          </button>

          <div className="mt-5 text-center">
            {loeschen ? (
              <div className="flex items-center justify-center gap-3 text-[13px]">
                <span className="text-muted-foreground">Wirklich löschen?</span>
                <button type="button" onClick={loeschenBestaetigen} className="text-destructive">
                  Ja, löschen
                </button>
                <button type="button" onClick={() => setLoeschen(false)} className="text-muted-foreground">
                  Abbrechen
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setLoeschen(true)}
                className="inline-flex min-h-[44px] items-center gap-2 text-[12px] text-muted-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" /> Teil löschen
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}