import { useState } from 'react';
import { ChevronLeft, Check, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function PacklisteDetail({ pack, onBack, onChanged }) {
  const [busy, setBusy] = useState(false);
  const checkliste = pack.packliste_items || [];
  const erledigt = checkliste.filter((i) => i.erledigt).length;

  const abhaken = async (index) => {
    const next = checkliste.map((item, i) => (i === index ? { ...item, erledigt: !item.erledigt } : item));
    await base44.entities.Packliste.update(pack.id, { packliste_items: next });
    onChanged();
  };

  const statusSetzen = async (status) => {
    await base44.entities.Packliste.update(pack.id, { status });
    onChanged();
  };

  const loeschen = async () => {
    setBusy(true);
    await base44.entities.Packliste.delete(pack.id);
    setBusy(false);
    onBack();
  };

  return (
    <div>
      <button type="button" onClick={onBack} className="flex min-h-[44px] items-center gap-1 text-[12px] text-muted-foreground">
        <ChevronLeft className="h-4 w-4" /> Alle Packlisten
      </button>

      <h1 className="mt-2 font-heading text-[2rem] leading-tight">{pack.ziel}</h1>
      <p className="mt-1 text-[12px] text-muted-foreground">
        {formatDate(pack.startdatum)} – {formatDate(pack.enddatum)}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-1 rounded-full border border-border bg-card p-1">
        {['Geplant', 'Gepackt'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => statusSetzen(status)}
            className={cn(
              'min-h-[40px] rounded-full text-[12px]',
              pack.status === status ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {(pack.tage || []).length > 0 && (
        <section className="mt-7">
          <h2 className="font-heading text-xl">Dein Plan</h2>
          <ul className="mt-3 space-y-2">
            {pack.tage.map((tag, i) => (
              <li key={i} className="rounded-2xl border border-border/70 bg-card px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13px]">{tag.outfit_name}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{formatDate(tag.datum)}</span>
                </div>
                {tag.kommentar && (
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{tag.kommentar}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-7">
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-xl">Checkliste</h2>
          <span className="text-[11px] text-muted-foreground">
            {erledigt}/{checkliste.length}
          </span>
        </div>
        <ul className="mt-3 space-y-1.5">
          {checkliste.map((item, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => abhaken(index)}
                className="flex min-h-[46px] w-full items-center gap-3 rounded-xl border border-border/70 bg-card px-4 text-left"
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                    item.erledigt ? 'border-gold bg-gold text-gold-foreground' : 'border-border'
                  )}
                >
                  {item.erledigt && <Check className="h-3 w-3" strokeWidth={2.5} />}
                </span>
                <span className={cn('flex-1 text-[13px]', item.erledigt && 'text-muted-foreground line-through')}>
                  {item.label}
                </span>
                {item.kategorie && (
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {item.kategorie}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        onClick={loeschen}
        disabled={busy}
        className="mx-auto mt-8 flex min-h-[44px] items-center gap-2 text-[12px] text-muted-foreground"
      >
        <Trash2 className="h-3.5 w-3.5" /> Packliste löschen
      </button>
    </div>
  );
}