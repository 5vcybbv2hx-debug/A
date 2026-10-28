import { useRef, useState } from 'react';
import { Camera, Loader2, Star, Trash2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { shrinkImage } from '@/lib/constants';
import FileImage from '@/components/FileImage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function BasismodellSection({ modelle, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [varianten, setVarianten] = useState([]);
  const [fehler, setFehler] = useState('');
  const kiRef = useRef(null);
  const originalRef = useRef(null);

  const hatAnker = modelle.some((m) => m.ist_anker);

  const hochladen = async (file) => {
    const klein = await shrinkImage(file, 1200);
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: klein });
    return file_uri;
  };

  const generieren = async (files) => {
    const liste = Array.from(files).slice(0, 6);
    if (liste.length === 0) return;
    setBusy(true);
    setFehler('');
    try {
      const uris = [];
      for (const file of liste) uris.push(await hochladen(file));
      const res = await base44.functions.invoke('generateBasismodell', { foto_uris: uris });
      if (res.data?.error) setFehler(res.data.error);
      else setVarianten(res.data.varianten || []);
    } catch (e) {
      setFehler(e?.response?.data?.error || 'Die Varianten konnten nicht erzeugt werden.');
    }
    setBusy(false);
  };

  const originalUebernehmen = async (file) => {
    if (!file) return;
    setBusy(true);
    setFehler('');
    try {
      const foto = await hochladen(file);
      await base44.entities.Basismodell.create({
        foto,
        pose_beschreibung: 'Originalfoto',
        herkunft: 'original_foto',
        ist_anker: !hatAnker,
        aktiv: true,
      });
      onChanged();
    } catch (_e) {
      setFehler('Das Foto konnte nicht gespeichert werden.');
    }
    setBusy(false);
  };

  const varianteWaehlen = async (variante) => {
    await base44.entities.Basismodell.create({
      foto: variante.foto,
      pose_beschreibung: variante.pose_beschreibung,
      herkunft: 'ki_generiert',
      ist_anker: !hatAnker,
      aktiv: true,
    });
    setVarianten([]);
    onChanged();
  };

  const ankerSetzen = async (id) => {
    await base44.entities.Basismodell.updateMany({ ist_anker: true }, { $set: { ist_anker: false } });
    await base44.entities.Basismodell.update(id, { ist_anker: true });
    onChanged();
  };

  const entfernen = async (id) => {
    await base44.entities.Basismodell.delete(id);
    onChanged();
  };

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-xl">Dein Basismodell</h2>
        {hatAnker && <span className="text-[10px] uppercase tracking-[0.16em] text-gold">Anker gesetzt</span>}
      </div>

      <div className="mt-3 rounded-2xl border border-gold/40 bg-gold/5 p-4">
        <p className="text-[12px] font-medium">So sieht das Foto ideal aus</p>
        <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-muted-foreground">
          <li>· Ganzkörper, von Kopf bis Fuß</li>
          <li>· frontal, Arme leicht vom Körper weg</li>
          <li>· einfarbiger Hintergrund, Tageslicht</li>
          <li>· keine Jacke, nichts Verdeckendes</li>
        </ul>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <input ref={kiRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => generieren(e.target.files)} />
        <input ref={originalRef} type="file" accept="image/*" className="hidden" onChange={(e) => originalUebernehmen(e.target.files?.[0])} />
        <button
          type="button"
          onClick={() => kiRef.current?.click()}
          disabled={busy}
          className="flex min-h-[70px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-primary text-[12px] text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Varianten erzeugen
        </button>
        <button
          type="button"
          onClick={() => originalRef.current?.click()}
          disabled={busy}
          className="flex min-h-[70px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-border text-[12px] text-muted-foreground disabled:opacity-50"
        >
          <Camera className="h-4 w-4" />
          Eigenes Foto nutzen
        </button>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        Für die Varianten 4 bis 6 Fotos auswählen. Je ähnlicher Licht, Abstand und Winkel, desto stimmiger
        das Ergebnis – ein zusammengesetztes Bild aus verschiedenen Fotos wird bewusst nicht erzeugt.
      </p>

      {fehler && (
        <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
          {fehler}
        </p>
      )}

      {modelle.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {modelle.map((modell) => (
            <div key={modell.id} className="overflow-hidden rounded-2xl border border-border/70 bg-card">
              <div className="relative aspect-[3/4] w-full bg-accent/60">
                <FileImage uri={modell.foto} fittingType="fill" className="absolute inset-0 h-full w-full" />
                {modell.ist_anker && (
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-background/85 px-2 py-1 text-[9px] uppercase tracking-[0.12em] backdrop-blur">
                    <Star className="h-2.5 w-2.5 fill-gold text-gold" /> Anker
                  </span>
                )}
              </div>
              <div className="p-2.5">
                <p className="truncate text-[11px] text-muted-foreground">{modell.pose_beschreibung || 'Basismodell'}</p>
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => ankerSetzen(modell.id)}
                    className={cn(
                      'min-h-[32px] rounded-full px-2.5 text-[10px]',
                      modell.ist_anker ? 'text-gold' : 'border border-border text-muted-foreground'
                    )}
                  >
                    {modell.ist_anker ? 'primär' : 'als Anker'}
                  </button>
                  <button
                    type="button"
                    onClick={() => entfernen(modell.id)}
                    className="flex h-8 w-8 items-center justify-center text-muted-foreground"
                    aria-label="Löschen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={varianten.length > 0} onOpenChange={(open) => !open && setVarianten([])}>
        <DialogContent className="max-w-2xl rounded-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-normal">Drei Varianten für dich</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            {varianten.map((variante, i) => (
              <button
                key={i}
                type="button"
                onClick={() => varianteWaehlen(variante)}
                className="overflow-hidden rounded-xl border border-border/70 hover:border-gold"
              >
                <div className="relative aspect-[3/4] w-full bg-accent/60">
                  <FileImage uri={variante.foto} fittingType="fill" className="absolute inset-0 h-full w-full" />
                </div>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Tippe auf das Bild, das dir am ähnlichsten sieht. Es wird als Basismodell gespeichert.
          </p>
        </DialogContent>
      </Dialog>
    </section>
  );
}