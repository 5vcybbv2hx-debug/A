import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Sparkles, Save, RefreshCw, Check, UserRound } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import OutfitStage from '@/components/OutfitStage';
import StudioShelf from '@/components/StudioShelf';
import SuggestionList from '@/components/SuggestionList';
import { ANLAESSE, SAISONS, zoneForItem } from '@/lib/constants';
import { cn } from '@/lib/utils';

const VIEWS = [
  { key: 'silhouette', label: 'Silhouette' },
  { key: 'aufmir', label: 'Auf mir' },
  { key: 'ki', label: 'KI-Anprobe' },
];

const signaturOf = (ids) => [...ids].sort().join('|');

export default function Studio() {
  const [items, setItems] = useState([]);
  const [basismodelle, setBasismodelle] = useState([]);
  const [basisId, setBasisId] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [view, setView] = useState('silhouette');
  const [outfitId, setOutfitId] = useState(null);
  const [render, setRender] = useState({ bild: null, signatur: null, basisId: null });
  const [rendering, setRendering] = useState(false);
  const [fehler, setFehler] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggLoading, setSuggLoading] = useState(false);
  const [form, setForm] = useState({ name: '', anlass: '', saison: '' });
  const [showSave, setShowSave] = useState(false);
  const [gespeichert, setGespeichert] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [itemsPage, bmPage] = await Promise.all([
        base44.entities.Kleidungsstueck.filter({ status: 'Aktiv' }, { sort: '-created_date', limit: 100 }),
        base44.entities.Basismodell.filter({ aktiv: true }, { sort: '-created_date', limit: 20 }),
      ]);
      if (!alive) return;
      const geladen = itemsPage.items || [];
      const modelle = bmPage.items || [];
      setItems(geladen);
      setBasismodelle(modelle);
      const anker = modelle.find((b) => b.ist_anker) || modelle[0];
      setBasisId(anker?.id || '');
      setView(anker ? 'aufmir' : 'silhouette');

      const params = new URLSearchParams(window.location.search);
      const outfitParam = params.get('outfit');
      const itemParam = params.get('item');

      if (outfitParam) {
        const outfit = await base44.entities.Outfit.get(outfitParam);
        if (!alive || !outfit) return;
        setOutfitId(outfit.id);
        setSelectedIds(outfit.item_ids || []);
        setForm({ name: outfit.name || '', anlass: outfit.anlass || '', saison: outfit.saison || '' });
        if (outfit.tryon_bild) {
          setRender({
            bild: outfit.tryon_bild,
            signatur: outfit.tryon_item_signatur || signaturOf(outfit.item_ids || []),
            basisId: outfit.tryon_basismodell_id || anker?.id || '',
          });
          setView('ki');
        }
      } else if (itemParam) {
        const item = geladen.find((i) => i.id === itemParam);
        if (item) setSelectedIds([item.id]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const selectedItems = items.filter((i) => selectedIds.includes(i.id));
  const basis = basismodelle.find((b) => b.id === basisId);
  const signatur = signaturOf(selectedIds);
  const cacheGueltig = render.bild && render.signatur === signatur && render.basisId === basisId;

  // Ersetzt wird nur, was dieselbe Zone belegt. Dadurch gehen Kette und Tasche
  // gleichzeitig, zwei Ketten schließen sich weiterhin aus.
  const toggle = (item) => {
    setSelectedIds((prev) => {
      if (prev.includes(item.id)) return prev.filter((id) => id !== item.id);
      const zone = zoneForItem(item);
      const gleicheZone = prev.filter(
        (id) => zoneForItem(items.find((i) => i.id === id)) === zone
      );
      return [...prev.filter((id) => !gleicheZone.includes(id)), item.id];
    });
  };

  const anziehen = async (kraft = false) => {
    setFehler('');
    if (!basis?.foto) {
      setFehler('Bitte zuerst ein Basismodell im Profil hinterlegen.');
      return;
    }
    if (selectedIds.length === 0) {
      setFehler('Wähle zuerst ein paar Teile aus dem Regal.');
      return;
    }
    if (!kraft && cacheGueltig) {
      setView('ki');
      return;
    }
    setRendering(true);
    try {
      let id = outfitId;
      if (!id) {
        const created = await base44.entities.Outfit.create({
          name: form.name || 'Neues Outfit',
          item_ids: selectedIds,
          anlass: form.anlass || '',
          saison: form.saison || '',
          tryon_status: 'keins',
          nutzungszaehler: 0,
          favorit: false,
        });
        id = created.id;
        setOutfitId(id);
      } else {
        await base44.entities.Outfit.update(id, { item_ids: selectedIds });
      }
      const res = await base44.functions.invoke('renderTryOn', {
        outfit_id: id,
        basismodell_id: basisId,
        kraft,
      });
      if (res.data?.error) {
        setFehler(res.data.error);
      } else {
        setRender({
          bild: res.data.outfit.tryon_bild,
          signatur: res.data.outfit.tryon_item_signatur,
          basisId: res.data.outfit.tryon_basismodell_id,
        });
        setView('ki');
      }
    } catch (e) {
      setFehler(e?.response?.data?.error || 'Die Anprobe hat nicht geklappt. Bitte noch einmal versuchen.');
    }
    setRendering(false);
  };

  const vorschlagen = async () => {
    setSuggLoading(true);
    setFehler('');
    try {
      const res = await base44.functions.invoke('generateOutfitSuggestions', {
        anlass: form.anlass || 'Alltag',
        saison: form.saison || 'Ganzjahres',
        wetter_temp: 18,
      });
      if (res.data?.error) setFehler(res.data.error);
      else setSuggestions(res.data.vorschlaege || []);
    } catch (e) {
      setFehler(e?.response?.data?.error || 'Die Vorschläge konnten nicht geladen werden.');
    }
    setSuggLoading(false);
  };

  const vorschlagLaden = (v) => {
    setSelectedIds(v.item_ids);
    setForm((f) => ({ ...f, name: f.name || v.name, anlass: f.anlass || 'Alltag' }));
    setRender({ bild: null, signatur: null, basisId: null });
    setOutfitId(null);
  };

  const speichern = async () => {
    const payload = {
      name: form.name || 'Unbenanntes Outfit',
      anlass: form.anlass || '',
      saison: form.saison || '',
      item_ids: selectedIds,
    };
    if (outfitId) await base44.entities.Outfit.update(outfitId, payload);
    else {
      const created = await base44.entities.Outfit.create({ ...payload, tryon_status: 'keins', nutzungszaehler: 0, favorit: false });
      setOutfitId(created.id);
    }
    setGespeichert(true);
    setShowSave(false);
    setTimeout(() => setGespeichert(false), 2500);
  };

  return (
    <div className="px-4 pb-6 pt-7 md:px-8 md:pt-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Outfit-Studio</p>
          <h1 className="mt-1 font-heading text-[2rem] leading-none md:text-4xl">Zieh dich an</h1>
        </div>
        <Link to="/galerie" className="pb-1 text-[12px] text-muted-foreground underline decoration-gold/50 underline-offset-4">
          Galerie
        </Link>
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,400px)_1fr] lg:items-start">
        <div className="lg:sticky lg:top-6">
          <OutfitStage
            view={view}
            items={selectedItems}
            basismodellFoto={basis?.foto}
            basismodellFotoFreigestellt={basis?.foto_freigestellt}
            zonen={basis?.zonen}
            seitenverhaeltnis={basis?.seitenverhaeltnis}
            tryonBild={cacheGueltig ? render.bild : null}
            rendering={rendering}
            onRequestTryOn={() => anziehen(false)}
            onGoProfile={() => (window.location.href = '/profil')}
          />

          <div className="mt-3 grid grid-cols-3 gap-1 rounded-full border border-border bg-card p-1">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setView(v.key)}
                className={cn(
                  'min-h-[44px] rounded-full text-[12px] transition-colors',
                  view === v.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                )}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex min-h-[44px] flex-1 items-center gap-2 rounded-full border border-border bg-card px-3">
              <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <select
                value={basisId}
                onChange={(e) => setBasisId(e.target.value)}
                className="w-full bg-transparent text-[12px] text-foreground outline-none"
              >
                {basismodelle.length === 0 && <option value="">Kein Basismodell</option>}
                {basismodelle.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.ist_anker ? 'Anker · ' : ''}{b.pose_beschreibung || 'Basismodell'}
                  </option>
                ))}
              </select>
            </div>
            {cacheGueltig && (
              <button
                type="button"
                onClick={() => anziehen(true)}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-border text-muted-foreground"
                aria-label="Neu rendern"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {fehler && (
            <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
              {fehler}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => anziehen(false)}
              disabled={rendering}
              className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-full bg-primary text-[14px] text-primary-foreground disabled:opacity-50"
            >
              {rendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {rendering ? 'Einen Moment …' : 'Anziehen'}
            </button>
            <button
              type="button"
              onClick={() => setShowSave((s) => !s)}
              className="flex h-[50px] w-[50px] items-center justify-center rounded-full border border-gold/50 text-gold"
              aria-label="Speichern"
            >
              {gespeichert ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            </button>
          </div>

          {showSave && (
            <div className="mt-3 space-y-3 rounded-2xl border border-border bg-card p-4">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Name des Outfits"
                className="min-h-[44px] w-full rounded-xl border border-input bg-background px-3 text-[14px] outline-none focus:border-gold/60"
              />
              <div>
                <p className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Anlass</p>
                <div className="flex flex-wrap gap-1.5">
                  {ANLAESSE.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, anlass: f.anlass === a ? '' : a }))}
                      className={cn(
                        'min-h-[44px] rounded-full border px-3 text-[12px]',
                        form.anlass === a ? 'border-gold/60 bg-gold/10' : 'border-border text-muted-foreground'
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Saison</p>
                <div className="flex flex-wrap gap-1.5">
                  {SAISONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, saison: f.saison === s ? '' : s }))}
                      className={cn(
                        'min-h-[44px] rounded-full border px-3 text-[12px]',
                        form.saison === s ? 'border-gold/60 bg-gold/10' : 'border-border text-muted-foreground'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={speichern}
                className="min-h-[46px] w-full rounded-full bg-primary text-[13px] text-primary-foreground"
              >
                Outfit speichern
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={vorschlagen}
            disabled={suggLoading}
            className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full border border-border text-[13px] text-muted-foreground"
          >
            {suggLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-gold" />}
            KI vorschlagen
          </button>
        </div>

        <div>
          <StudioShelf items={items} selectedIds={selectedIds} onToggle={toggle} />
          <SuggestionList
            vorschlaege={suggestions}
            items={items}
            onPick={vorschlagLaden}
            loading={suggLoading}
          />
        </div>
      </div>
    </div>
  );
}