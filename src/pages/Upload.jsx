import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Loader2, Check, X, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { shrinkImage } from '@/lib/constants';
import UploadReview from '@/components/UploadReview';
import BackHeader from '@/components/BackHeader';
import { freistellen, alsPngDatei } from '@/lib/cutout';
import { cn } from '@/lib/utils';

const STATUS_TEXT = {
  wartet: 'Wartet',
  laedt: 'Wird hochgeladen',
  freistellen: 'Wird freigestellt',
  verarbeitung: 'Wird erkannt',
  fertig: 'Fertig',
  fehler: 'Nicht geklappt',
};

export default function Upload() {
  const navigate = useNavigate();
  const [modus, setModus] = useState(
    new URLSearchParams(window.location.search).get('modus') === 'look' ? 'look' : 'kleidung'
  );
  const [queue, setQueue] = useState([]);
  const [phase, setPhase] = useState('auswahl');
  const [review, setReview] = useState([]);
  const [lookBusy, setLookBusy] = useState(false);
  const [lookErgebnis, setLookErgebnis] = useState(null);
  const [lookFehler, setLookFehler] = useState('');
  const abort = useRef(false);
  const inputRef = useRef(null);
  const lookRef = useRef(null);

  const update = (key, patch) =>
    setQueue((q) => q.map((e) => (e.key === key ? { ...e, ...patch } : e)));

  const starten = async (files) => {
    const eintraege = Array.from(files).slice(0, 40).map((file) => ({
      key: `${file.name}-${Date.now()}-${Math.random()}`,
      name: file.name,
      status: 'wartet',
      file,
    }));
    if (eintraege.length === 0) return;

    abort.current = false;
    setQueue(eintraege);
    setReview([]);
    setPhase('laeuft');

    const ergebnisse = [];
    let cursor = 0;

    const arbeiter = async () => {
      while (cursor < eintraege.length && !abort.current) {
        const entry = eintraege[cursor];
        cursor += 1;
        try {
          update(entry.key, { status: 'laedt' });
          const klein = await shrinkImage(entry.file, 1200);
          const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: klein });
          const created = await base44.entities.Kleidungsstueck.create({
            name: 'Neues Teil',
            foto_original: file_uri,
            verarbeitungs_status: 'hochgeladen',
            status: 'Aktiv',
            favorit: false,
            nutzungszaehler: 0,
          });
          update(entry.key, { status: 'freistellen', itemId: created.id });

          // Echtes Freistellen auf dem Gerät: keine Credits, echter Alphakanal.
          let ohneFreistellung = false;
          try {
            const png = alsPngDatei(await freistellen(klein));
            const { file_uri: png_uri } = await base44.integrations.Core.UploadPrivateFile({ file: png });
            await base44.entities.Kleidungsstueck.update(created.id, {
              foto_freigestellt: png_uri,
              verarbeitungs_status: 'freigestellt',
            });
          } catch (_e) {
            // Ohne Freistellung bleibt nur das Originalfoto – das Tagging läuft trotzdem.
            ohneFreistellung = true;
            update(entry.key, { ohneFreistellung: true });
          }

          update(entry.key, { status: 'verarbeitung' });
          const res = await base44.functions.invoke('processClothingImage', { item_id: created.id });
          if (res.data?.error) throw new Error(res.data.error);
          ergebnisse.push(res.data.item);
          update(entry.key, { status: 'fertig' });
        } catch (_e) {
          update(entry.key, { status: 'fehler' });
        }
      }
    };

    await Promise.all([arbeiter(), arbeiter(), arbeiter()]);

    setReview(ergebnisse);
    setPhase(ergebnisse.length ? 'pruefen' : 'auswahl');
  };

  const lookStarten = async (file) => {
    if (!file) return;
    setLookBusy(true);
    setLookFehler('');
    setLookErgebnis(null);
    try {
      const klein = await shrinkImage(file, 1200);
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: klein });
      const res = await base44.functions.invoke('extractLookFromPhoto', { foto_uri: file_uri });
      if (res.data?.error) setLookFehler(res.data.error);
      else setLookErgebnis(res.data.outfit);
    } catch (e) {
      setLookFehler(e?.response?.data?.error || 'Der Look konnte nicht übernommen werden.');
    }
    setLookBusy(false);
  };

  const fertig = queue.filter((e) => e.status === 'fertig' || e.status === 'fehler').length;
  const fortschritt = queue.length ? Math.round((fertig / queue.length) * 100) : 0;

  return (
    <div className="px-4 pb-8 pt-7 md:px-8 md:pt-10">
      <BackHeader label="Zurück" />
      <header>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Neu aufnehmen</p>
        <h1 className="mt-1 font-heading text-[2rem] leading-none md:text-4xl">
          {phase === 'pruefen' ? 'Kurz prüfen' : 'Teile hinzufügen'}
        </h1>
      </header>

      {phase === 'auswahl' && (
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-full border border-border bg-card p-1">
          {[
            { key: 'kleidung', label: 'Kleidung' },
            { key: 'look', label: 'Look vom Foto' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setModus(tab.key)}
              className={cn(
                'min-h-[44px] rounded-full text-[12px] transition-colors',
                modus === tab.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {modus === 'kleidung' && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => starten(e.target.files)}
          />

          {phase === 'auswahl' && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center rounded-3xl border border-dashed border-gold/40 bg-card/60 px-6 py-14 text-center"
              >
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gold/40">
                  <Camera className="h-6 w-6 text-gold" strokeWidth={1.4} />
                </span>
                <span className="font-heading text-lg">Fotos auswählen</span>
                <span className="mt-2 max-w-[240px] text-[12px] leading-relaxed text-muted-foreground">
                  Mehrere auf einmal sind kein Problem. Am besten jedes Teil einzeln auf hellem Untergrund.
                </span>
              </button>
              <p className="mt-4 text-center text-[11px] text-muted-foreground">
                Deine Fotos liegen im privaten Speicher und sind nur für dich sichtbar.
              </p>
              <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
                Das Freistellen passiert direkt auf deinem Gerät. Beim allerersten Teil lädt die App dafür
                einmalig ein Modell, das dauert einen Moment.
              </p>
            </div>
          )}

          {(phase === 'laeuft' || phase === 'auswahl') && queue.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{fertig} von {queue.length} verarbeitet</span>
                {phase === 'laeuft' && (
                  <button type="button" onClick={() => (abort.current = true)} className="text-destructive">
                    Abbrechen
                  </button>
                )}
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-gold transition-all duration-500" style={{ width: `${fortschritt}%` }} />
              </div>
              <div className="mt-5 space-y-2">
                {queue.map((e) => (
                  <div key={e.key} className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3">
                    <span className="mr-3 truncate text-[12px]">{e.name}</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                      {e.status === 'fertig' && <Check className="h-3.5 w-3.5 text-gold" />}
                      {e.status === 'fehler' && <X className="h-3.5 w-3.5 text-destructive" />}
                      {(e.status === 'laedt' || e.status === 'verarbeitung') && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
                      )}
                      {STATUS_TEXT[e.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase === 'pruefen' && review.length > 0 && (
            <div className="mt-6">
              <UploadReview items={review} onFinished={() => navigate('/schrank')} />
            </div>
          )}
        </>
      )}

      {modus === 'look' && (
        <div className="mt-6">
          <input
            ref={lookRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => lookStarten(e.target.files?.[0])}
          />

          {!lookErgebnis && (
            <button
              type="button"
              onClick={() => lookRef.current?.click()}
              disabled={lookBusy}
              className="flex w-full flex-col items-center justify-center rounded-3xl border border-dashed border-gold/40 bg-card/60 px-6 py-14 text-center disabled:opacity-60"
            >
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gold/40">
                {lookBusy ? (
                  <Loader2 className="h-6 w-6 animate-spin text-gold" />
                ) : (
                  <Sparkles className="h-6 w-6 text-gold" strokeWidth={1.4} />
                )}
              </span>
              <span className="font-heading text-lg">
                {lookBusy ? 'Ich schaue mir das Foto an …' : 'Foto von deinem Look'}
              </span>
              <span className="mt-2 max-w-[260px] text-[12px] leading-relaxed text-muted-foreground">
                Ich erkenne, was du trägst, und lege daraus ein Outfit und die Teile in deinem Schrank an.
              </span>
            </button>
          )}

          {lookFehler && (
            <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
              {lookFehler}
            </p>
          )}

          {lookErgebnis && (
            <div className="mt-6 rounded-2xl border border-border/70 bg-card p-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Übernommen</p>
              <p className="mt-2 font-heading text-xl">{lookErgebnis.name}</p>
              {lookErgebnis.ki_kommentar && (
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{lookErgebnis.ki_kommentar}</p>
              )}
              <Link
                to="/galerie"
                className="mt-5 flex min-h-[48px] items-center justify-center rounded-full bg-primary text-[13px] text-primary-foreground"
              >
                Zur Galerie
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}