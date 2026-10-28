import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, Check, Images, Loader2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import BasismodellSection from '@/components/BasismodellSection';
import { teilAufnehmen } from '@/lib/teilAufnehmen';
import { BEISPIELTEILE, beispieleAnlegen } from '@/lib/beispiele';
import { cn } from '@/lib/utils';
import { useFarbschema } from '@/lib/theme';

const SCHRITTE = ['Willkommen', 'Basisfoto', 'Erste Teile', 'Fertig'];

const STATUS_TEXT = {
  wartet: 'Wartet',
  laedt: 'Wird hochgeladen',
  freistellen: 'Wird freigestellt',
  verarbeitung: 'Wird erkannt',
  fertig: 'Fertig',
  fehler: 'Nicht geklappt',
};

export default function Erststart() {
  const navigate = useNavigate();
  const [geladen, setGeladen] = useState(false);
  const [profil, setProfil] = useState(null);
  const [modelle, setModelle] = useState([]);
  const [teile, setTeile] = useState([]);
  const [schritt, setSchritt] = useState(0);
  const [aufnahmen, setAufnahmen] = useState([]);
  const [fehler, setFehler] = useState('');
  const [beispielLaeuft, setBeispielLaeuft] = useState(false);
  const [beispielStatus, setBeispielStatus] = useState('');
  const teileRef = useRef(null);
  const erstResume = useRef(true);
  useFarbschema();

  const laden = useCallback(async () => {
    const [profilPage, modellePage, teilePage] = await Promise.all([
      base44.entities.ProfilEinstellung.filter({}, { limit: 1 }),
      base44.entities.Basismodell.filter({}, { limit: 10 }),
      base44.entities.Kleidungsstueck.filter({ status: 'Aktiv' }, { limit: 300 }),
    ]);
    const p = profilPage.items?.[0] || null;
    setProfil(p);
    setModelle(modellePage.items || []);
    setTeile(teilePage.items || []);
    setGeladen(true);

    // Dort weitermachen, wo sie aufgehört hat – aber nur beim ersten Laden,
    // sonst springt die Seite nach jedem Foto wieder zurück.
    if (erstResume.current) {
      erstResume.current = false;
      if (p && !p.erststart_fertig && Number.isInteger(p.erststart_schritt)) {
        setSchritt(Math.min(3, Math.max(0, p.erststart_schritt)));
      }
    }
  }, []);

  useEffect(() => {
    laden().catch(() => setGeladen(true));
  }, [laden]);

  const merken = async (patch) => {
    if (profil?.id) {
      const aktualisiert = await base44.entities.ProfilEinstellung.update(profil.id, patch);
      setProfil(aktualisiert);
    } else {
      const angelegt = await base44.entities.ProfilEinstellung.create(patch);
      setProfil(angelegt);
    }
  };

  const weiter = async (ziel) => {
    const naechster = Math.min(3, ziel);
    setSchritt(naechster);
    try {
      await merken({ erststart_schritt: naechster });
    } catch (_e) {
      // Der Schritt ist auch ohne gespeicherten Stand bedienbar.
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const ueberspringen = async () => {
    try {
      await merken({ erststart_fertig: true, erststart_uebersprungen: true, erststart_schritt: 3 });
    } catch (_e) {
      // egal, sie landet ohnehin in der App
    }
    navigate('/heute', { replace: true });
  };

  const abschliessen = async () => {
    try {
      await merken({ erststart_fertig: true, erststart_uebersprungen: false, erststart_schritt: 3 });
    } catch (_e) {
      // egal
    }
    navigate('/studio', { replace: true });
  };

  const aufnehmen = async (files) => {
    const liste = Array.from(files || []).slice(0, 8);
    if (liste.length === 0) return;
    setFehler('');

    const eintraege = liste.map((file) => ({
      key: `${file.name}-${Date.now()}-${Math.random()}`,
      name: file.name,
      status: 'wartet',
    }));
    setAufnahmen((alt) => [...alt, ...eintraege]);

    const setze = (key, status) =>
      setAufnahmen((alt) => alt.map((e) => (e.key === key ? { ...e, status } : e)));

    let fertig = 0;
    for (let i = 0; i < liste.length; i += 1) {
      const eintrag = eintraege[i];
      try {
        await teilAufnehmen(liste[i], (phase) => setze(eintrag.key, phase));
        setze(eintrag.key, 'fertig');
        fertig += 1;
      } catch (_e) {
        setze(eintrag.key, 'fehler');
      }
    }

    await laden();
    if (fertig === 0) {
      setFehler('Kein Teil konnte aufgenommen werden. Versuch es noch einmal, oder mache das Foto heller.');
    }
  };

  const beispieleUebernehmen = async () => {
    setBeispielLaeuft(true);
    setFehler('');
    try {
      await beispieleAnlegen((nummer, gesamt, name) => {
        setBeispielStatus(`${nummer} von ${gesamt}: ${name}`);
      });
      setBeispielStatus('');
      await laden();
      await weiter(3);
    } catch (_e) {
      setFehler('Die Beispielteile konnten nicht angelegt werden. Versuch es noch einmal.');
    }
    setBeispielLaeuft(false);
  };

  const anker = modelle.find((m) => m.ist_anker && m.foto);
  const andereModelle = modelle.filter((m) => m.id !== anker?.id);
  const teileAnzahl = teile.length;
  const fertigAufgenommen = aufnahmen.filter((a) => a.status === 'fertig').length;
  const darfWeiter = schritt === 1 ? Boolean(anker) : schritt === 2 ? teileAnzahl > 0 : true;

  if (!geladen) {
    return (
      <div className="sand-surface flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="sand-surface min-h-screen">
      <div className="mx-auto w-full max-w-2xl px-6 pb-16 pt-10 md:pt-16">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {SCHRITTE.map((label, i) => (
              <span
                key={label}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === schritt ? 'w-8 bg-gold' : i < schritt ? 'w-4 bg-gold/50' : 'w-4 bg-border'
                )}
              />
            ))}
          </div>
          {schritt < 3 && (
            <button
              type="button"
              onClick={ueberspringen}
              className="min-h-[44px] px-2 text-[12px] text-muted-foreground underline decoration-border underline-offset-4"
            >
              Später
            </button>
          )}
        </div>

        <p className="mt-6 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          Schritt {schritt + 1} von 4
        </p>

        {schritt === 0 && (
          <div className="mt-3">
            <h1 className="font-display text-[2.1rem] leading-[1.12] tracking-tight md:text-5xl">
              Fangen wir mit <span className="italic text-gold">dir</span> an
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Drei Dinge, dann steht dein Schrank: ein Ganzkörperfoto von dir, ein paar Lieblingsstücke
              und ein erster Look. Dauert beim ersten Mal ein paar Minuten, danach nie wieder.
            </p>

            <ol className="mt-8 space-y-3">
              {[
                { icon: Camera, titel: 'Ein Foto von dir', text: 'Damit du dich in jedem Teil siehst.' },
                { icon: Images, titel: 'Deine Teile', text: 'Fotografieren, den Rest mache ich.' },
                { icon: Sparkles, titel: 'Der erste Look', text: 'Ziehe Teile an und sieh sie an dir.' },
              ].map(({ icon: Icon, titel, text }, i) => (
                <li key={titel} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/70 p-4">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/40">
                    <Icon className="h-3.5 w-3.5 text-gold" strokeWidth={1.6} />
                  </span>
                  <div>
                    <p className="text-[14px]">{i + 1}. {titel}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {schritt === 1 && (
          <div className="mt-3">
            <h1 className="font-display text-[2rem] leading-tight tracking-tight md:text-4xl">
              Ein Foto, auf dem du ganz <span className="italic text-gold">du</span> bist
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              Am besten von einer anderen Person fotografiert: ganzes Bild, frontal, Tageslicht, ruhige Wand.
              Ich schneide den Hintergrund weg und messe Hals, Schultern, Taille und Hüfte, damit die Teile
              später richtig sitzen.
            </p>

            <div className="mt-6">
              <BasismodellSection modelle={modelle} onChanged={laden} />
            </div>

            {!anker && (
              <p className="mt-4 rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                Noch ist kein Foto gesetzt. Nimm eines auf, oder lass dir Varianten erzeugen, die du als
                Basisfoto wählst. Die Varianten kosten Credits und laufen nur, wenn du den Knopf drückst.
              </p>
            )}
          </div>
        )}

        {schritt === 2 && (
          <div className="mt-3">
            <h1 className="font-display text-[2rem] leading-tight tracking-tight md:text-4xl">
              Jetzt deine <span className="italic text-gold">Teile</span>
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              Leg die Sachen flach auf ein Bett oder häng sie an die Tür, Tageslicht, ein Teil pro Foto.
              Ich stelle frei, erkenne Farbe, Muster und Anlass und sortiere sie in den Schrank.
            </p>

            <input
              ref={teileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                aufnehmen(e.target.files);
                e.target.value = '';
              }}
            />

            <button
              type="button"
              onClick={() => teileRef.current?.click()}
              className="mt-6 flex min-h-[96px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gold/50 bg-gold/5 text-[13px]"
            >
              <Images className="h-5 w-5 text-gold" strokeWidth={1.5} />
              Fotos auswählen
              <span className="text-[11px] text-muted-foreground">mehrere auf einmal möglich</span>
            </button>

            <div className="mt-3 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">oder</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              onClick={beispieleUebernehmen}
              disabled={beispielLaeuft}
              className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card/70 px-4 text-[13px] disabled:opacity-50"
            >
              {beispielLaeuft ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-gold" />
                  {beispielStatus || 'Wird angelegt'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-gold" strokeWidth={1.6} />
                  Mit {BEISPIELTEILE.length} Beispielteilen starten
                </>
              )}
            </button>
            <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
              Gezeichnete Teile zum Ausprobieren, später mit einem Griff wieder zu entfernen.
            </p>

            {aufnahmen.length > 0 && (
              <ul className="mt-4 space-y-2">
                {aufnahmen.slice(-8).map((a) => (
                  <li
                    key={a.key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/60 px-3 py-2.5"
                  >
                    <span className="truncate text-[12px] text-muted-foreground">{a.name}</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-[11px]">
                      {a.status === 'fertig' ? (
                        <Check className="h-3.5 w-3.5 text-gold" strokeWidth={2} />
                      ) : a.status === 'fehler' ? null : (
                        <Loader2 className="h-3 w-3 animate-spin text-gold" />
                      )}
                      <span className={a.status === 'fehler' ? 'text-destructive' : 'text-muted-foreground'}>
                        {STATUS_TEXT[a.status]}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {fehler && (
              <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
                {fehler}
              </p>
            )}

            <p className="mt-4 text-[12px] text-muted-foreground">
              {teileAnzahl === 0
                ? 'Noch kein Teil im Schrank.'
                : `${teileAnzahl} ${teileAnzahl === 1 ? 'Teil' : 'Teile'} im Schrank`}
              {fertigAufgenommen > 0 ? `, ${fertigAufgenommen} gerade dazu` : ''}
            </p>
          </div>
        )}

        {schritt === 3 && (
          <div className="mt-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/40">
              <Check className="h-5 w-5 text-gold" strokeWidth={1.8} />
            </div>
            <h1 className="mt-5 font-display text-[2.1rem] leading-[1.12] tracking-tight md:text-5xl">
              Dein Schrank steht
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              {teileAnzahl} {teileAnzahl === 1 ? 'Teil' : 'Teile'}
              {anker ? ' und dein Basisfoto' : ''}. Jetzt kannst du Teile anklicken und siehst sie an dir,
              bevor du sie anziehst. Alles Weitere findest du unten in der Leiste.
            </p>

            <dl className="mt-6 space-y-2">
              {[
                ['Basisfoto', Boolean(anker)],
                ['Teile im Schrank', teileAnzahl > 0],
              ].map(([label, ok]) => (
                <div key={label} className="flex items-center justify-between rounded-xl border border-border/70 bg-card/60 px-3 py-2.5">
                  <dt className="text-[12px] text-muted-foreground">{label}</dt>
                  <dd className={cn('text-[11px]', ok ? 'text-gold' : 'text-destructive')}>
                    {ok ? 'bereit' : 'fehlt noch'}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="mt-10 flex flex-col gap-3">
          {schritt < 3 ? (
            <>
              <button
                type="button"
                onClick={() => weiter(schritt + 1)}
                disabled={!darfWeiter}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-primary px-8 text-[15px] text-primary-foreground transition-transform active:scale-[0.99] disabled:opacity-40"
              >
                {schritt === 1 && !anker ? 'Erst ein Basisfoto' : 'Weiter'}
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </button>
              {schritt > 0 && (
                <button
                  type="button"
                  onClick={() => weiter(schritt - 1)}
                  className="flex min-h-[44px] items-center justify-center gap-2 text-[12px] text-muted-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Zurück
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={abschliessen}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-primary px-8 text-[15px] text-primary-foreground transition-transform active:scale-[0.99]"
              >
                Ersten Look ansehen
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/upload')}
                className="min-h-[44px] text-[12px] text-gold underline decoration-gold/40 underline-offset-4"
              >
                Weiteres Teil hinzufügen
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
          Deine Fotos bleiben privat. Freistellen und Zonenmessung passieren auf deinem Gerät.
        </p>

        {schritt === 1 && andereModelle.length > 3 && (
          <p className="mt-1 text-center text-[11px] text-muted-foreground">
            {andereModelle.length} weitere Basisfotos im Profil.
          </p>
        )}
      </div>
    </div>
  );
}
