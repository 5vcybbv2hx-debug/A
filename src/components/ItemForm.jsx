import {
  KATEGORIEN,
  SLOTS,
  SLOT_LABEL,
  ACCESSOIRE_PLAETZE,
  MUSTER,
  SAISONS,
  ANLAESSE,
} from '@/lib/constants';
import { cn } from '@/lib/utils';

const inputClass =
  'min-h-[44px] w-full rounded-xl border border-input bg-card px-3 text-[14px] text-foreground outline-none focus:border-gold/60';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function ItemForm({ value, onChange }) {
  const set = (key, val) => onChange({ [key]: val });
  const anlaesse = value.anlaesse || [];
  const farbenText = (value.farben || []).join(', ');

  const toggleAnlass = (a) => {
    set('anlaesse', anlaesse.includes(a) ? anlaesse.filter((x) => x !== a) : [...anlaesse, a]);
  };

  return (
    <div className="space-y-4">
      <Field label="Name">
        <input
          className={inputClass}
          value={value.name || ''}
          onChange={(e) => set('name', e.target.value)}
          placeholder="z. B. Cremefarbene Leinenbluse"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Kategorie">
          <select className={inputClass} value={value.kategorie || ''} onChange={(e) => set('kategorie', e.target.value)}>
            <option value="">–</option>
            {KATEGORIEN.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label="Slot">
          <select className={inputClass} value={value.slot_typ || ''} onChange={(e) => set('slot_typ', e.target.value)}>
            <option value="">–</option>
            {SLOTS.map((s) => (
              <option key={s} value={s}>{SLOT_LABEL[s]}</option>
            ))}
          </select>
        </Field>
      </div>

      {value.slot_typ === 'accessory' && (
        <Field label="Platz am Körper">
          <select
            className={inputClass}
            value={value.accessoire_platz || 'sonstige'}
            onChange={(e) => set('accessoire_platz', e.target.value)}
          >
            {ACCESSOIRE_PLAETZE.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Farben (mit Komma trennen)">
        <input
          className={inputClass}
          value={farbenText}
          onChange={(e) =>
            set(
              'farben',
              e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
            )
          }
          placeholder="Creme, Sand"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Muster">
          <select className={inputClass} value={value.muster || ''} onChange={(e) => set('muster', e.target.value)}>
            <option value="">–</option>
            {MUSTER.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="Saison">
          <select className={inputClass} value={value.saison || ''} onChange={(e) => set('saison', e.target.value)}>
            <option value="">–</option>
            {SAISONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Anlässe">
        <div className="flex flex-wrap gap-2">
          {ANLAESSE.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => toggleAnlass(a)}
              className={cn(
                'min-h-[44px] rounded-full border px-3.5 text-[12px] transition-colors',
                anlaesse.includes(a)
                  ? 'border-gold/60 bg-gold/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground'
              )}
            >
              {a}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Marke">
          <input className={inputClass} value={value.marke || ''} onChange={(e) => set('marke', e.target.value)} />
        </Field>
        <Field label="Größe">
          <input className={inputClass} value={value.groesse || ''} onChange={(e) => set('groesse', e.target.value)} />
        </Field>
      </div>
    </div>
  );
}