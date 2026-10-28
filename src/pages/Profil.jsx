import { useEffect, useState } from 'react';
import { Lock, Check, Sun, Moon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import BasismodellSection from '@/components/BasismodellSection';

const inputClass =
  'min-h-[44px] w-full rounded-xl border border-input bg-card px-3 text-[14px] outline-none focus:border-gold/60';

function Feld({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export default function Profil() {
  const [modelle, setModelle] = useState([]);
  const [profil, setProfil] = useState(null);
  const [form, setForm] = useState({});
  const [reload, setReload] = useState(0);
  const [gespeichert, setGespeichert] = useState(false);
  const [dunkel, setDunkel] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  const erscheinungsbild = (istDunkel) => {
    setDunkel(istDunkel);
    document.documentElement.classList.toggle('dark', istDunkel);
    localStorage.setItem('aura-theme', istDunkel ? 'dark' : 'light');
  };

  useEffect(() => {
    let alive = true;
    Promise.all([
      base44.entities.Basismodell.filter({}, { sort: '-created_date', limit: 30 }),
      base44.entities.ProfilEinstellung.filter({}, { limit: 1 }),
    ]).then(([modellePage, profilPage]) => {
      if (!alive) return;
      setModelle(modellePage.items || []);
      const p = profilPage.items?.[0] || null;
      setProfil(p);
      setForm(p ? { ...p } : {});
    });
    return () => {
      alive = false;
    };
  }, [reload]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const speichern = async () => {
    const payload = {
      groesse_oben: form.groesse_oben || '',
      groesse_unten: form.groesse_unten || '',
      schuhgroesse: form.schuhgroesse || '',
      lieblingsfarben: form.lieblingsfarben || [],
      no_go_farben: form.no_go_farben || [],
      style_beschreibung: form.style_beschreibung || '',
      koerper_beschreibung: form.koerper_beschreibung || '',
      widmung: form.widmung || '',
    };
    if (profil?.id) await base44.entities.ProfilEinstellung.update(profil.id, payload);
    else await base44.entities.ProfilEinstellung.create(payload);
    setGespeichert(true);
    setReload((r) => r + 1);
    setTimeout(() => setGespeichert(false), 2500);
  };

  const farbenFeld = (key, platzhalter) => (
    <input
      className={inputClass}
      placeholder={platzhalter}
      value={(form[key] || []).join(', ')}
      onChange={(e) => set(key, e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
    />
  );

  return (
    <div className="px-4 pb-8 pt-7 md:px-8 md:pt-10">
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Profil</p>
        <h1 className="mt-1 font-heading text-[2rem] leading-none md:text-4xl">Über dich</h1>
      </header>

      <div className="mt-7">
        <BasismodellSection modelle={modelle} onChanged={() => setReload((r) => r + 1)} />
      </div>

      <section className="mt-9">
        <h2 className="font-heading text-xl">Maße & Stil</h2>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Feld label="Größe oben">
              <input className={inputClass} value={form.groesse_oben || ''} onChange={(e) => set('groesse_oben', e.target.value)} placeholder="38" />
            </Feld>
            <Feld label="Größe unten">
              <input className={inputClass} value={form.groesse_unten || ''} onChange={(e) => set('groesse_unten', e.target.value)} placeholder="38" />
            </Feld>
            <Feld label="Schuhe">
              <input className={inputClass} value={form.schuhgroesse || ''} onChange={(e) => set('schuhgroesse', e.target.value)} placeholder="39" />
            </Feld>
          </div>

          <Feld label="Lieblingsfarben">
            {farbenFeld('lieblingsfarben', 'Creme, Sand, Oliv')}
          </Feld>
          <Feld label="No-Go-Farben">
            {farbenFeld('no_go_farben', 'Neon, Pink')}
          </Feld>

          <Feld label="Dein Stil" hint="Ein paar Worte reichen – die KI orientiert sich daran.">
            <textarea
              className="min-h-[80px] w-full rounded-xl border border-input bg-card px-3 py-2 text-[14px] outline-none focus:border-gold/60"
              value={form.style_beschreibung || ''}
              onChange={(e) => set('style_beschreibung', e.target.value)}
              placeholder="eher klassisch, gern beige und creme"
            />
          </Feld>

          <Feld label="Körperbeschreibung" hint="Hilft der KI-Anprobe, dich richtig darzustellen.">
            <textarea
              className="min-h-[80px] w-full rounded-xl border border-input bg-card px-3 py-2 text-[14px] outline-none focus:border-gold/60"
              value={form.koerper_beschreibung || ''}
              onChange={(e) => set('koerper_beschreibung', e.target.value)}
              placeholder="schlank, 1,68 m, dunkle lange Haare"
            />
          </Feld>

          <Feld label="Widmung" hint="Erscheint auf dem Willkommens-Bildschirm.">
            <input
              className={inputClass}
              value={form.widmung || ''}
              onChange={(e) => set('widmung', e.target.value)}
              placeholder="Für A, mit Liebe"
            />
          </Feld>

          <button
            type="button"
            onClick={speichern}
            className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-primary text-[14px] text-primary-foreground"
          >
            {gespeichert ? <Check className="h-4 w-4" /> : null}
            {gespeichert ? 'Gespeichert' : 'Speichern'}
          </button>
        </div>
      </section>

      <section className="mt-9">
        <h2 className="font-heading text-xl">Erscheinungsbild</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => erscheinungsbild(false)}
            className={`flex min-h-[46px] items-center justify-center gap-2 rounded-full border text-[13px] ${
              !dunkel ? 'border-gold/60 bg-gold/10' : 'border-border text-muted-foreground'
            }`}
          >
            <Sun className="h-4 w-4" /> Hell
          </button>
          <button
            type="button"
            onClick={() => erscheinungsbild(true)}
            className={`flex min-h-[46px] items-center justify-center gap-2 rounded-full border text-[13px] ${
              dunkel ? 'border-gold/60 bg-gold/10' : 'border-border text-muted-foreground'
            }`}
          >
            <Moon className="h-4 w-4" /> Dunkel
          </button>
        </div>
      </section>

      <section className="mt-9 rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-gold" />
          <p className="text-[12px]">Deine Fotos gehören dir</p>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Alle Bilder liegen im privaten Speicher und werden nur über kurzlebige, signierte Links angezeigt.
          Sie werden nie öffentlich geteilt.
        </p>
      </section>
    </div>
  );
}