import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ItemForm from '@/components/ItemForm';
import FileImage from '@/components/FileImage';

export default function UploadReview({ items, onFinished }) {
  const [index, setIndex] = useState(0);
  const [form, setForm] = useState({ ...items[0] });
  const [busy, setBusy] = useState(false);
  const current = items[index];

  const weiter = async (patch, status) => {
    if (current) {
      await base44.entities.Kleidungsstueck.update(current.id, {
        name: form.name || current.name || 'Neues Teil',
        kategorie: form.kategorie,
        slot_typ: form.slot_typ,
        farben: form.farben || [],
        muster: form.muster,
        saison: form.saison,
        anlaesse: form.anlaesse || [],
        marke: form.marke || '',
        groesse: form.groesse || '',
        verarbeitungs_status: status,
        ...patch,
      });
    }
    const naechster = index + 1;
    if (naechster >= items.length) {
      onFinished();
      return;
    }
    setIndex(naechster);
    setForm({ ...items[naechster] });
  };

  const alleUebernehmen = async () => {
    setBusy(true);
    for (const item of items.slice(index)) {
      await base44.entities.Kleidungsstueck.update(item.id, { verarbeitungs_status: 'geprueft' });
    }
    setBusy(false);
    onFinished();
  };

  if (!current) return null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {index + 1} von {items.length}
        </p>
        <button
          type="button"
          onClick={alleUebernehmen}
          disabled={busy}
          className="min-h-[44px] text-[12px] text-gold disabled:opacity-50"
        >
          {busy ? 'Speichern …' : 'Alle übernehmen'}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <div className="relative aspect-[4/5] w-full bg-foto">
          <FileImage
            uri={current.foto_freigestellt || current.foto_original}
            fittingType="fit"
            alt={current.name}
            className="absolute inset-0 h-full w-full object-contain p-4"
          />
        </div>
        <div className="p-4">
          {!current.foto_freigestellt && (
            <p className="mb-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] leading-relaxed text-destructive">
              Für dieses Teil ist kein freigestelltes Bild entstanden. Es lässt sich speichern, sieht in der
              Anprobe aber noch nicht sauber aus – am besten später neu aufnehmen.
            </p>
          )}
          <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
            Das ist mein Vorschlag. Ändere gern alles, was nicht passt.
          </p>
          <ItemForm value={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => weiter({}, 'getaggt')}
              className="min-h-[48px] flex-1 rounded-full border border-border text-[13px] text-muted-foreground"
            >
              Später prüfen
            </button>
            <button
              type="button"
              onClick={() => weiter({}, 'geprueft')}
              className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-primary text-[13px] text-primary-foreground"
            >
              <Check className="h-4 w-4" /> Übernehmen
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={alleUebernehmen}
        className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 text-[12px] text-muted-foreground"
      >
        Restliche {items.length - index - 1} übernehmen <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}