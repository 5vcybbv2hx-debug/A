import { useState } from 'react';
import { Loader2, LogOut, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AccountActions() {
  const [dialogOffen, setDialogOffen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState('');

  const abmelden = async () => {
    await base44.auth.logout('/login');
  };

  const kontoLoeschen = async () => {
    setBusy(true);
    setFehler('');
    try {
      await base44.functions.invoke('deleteAccount', {});
      await base44.auth.logout('/login');
    } catch (e) {
      setFehler(e?.response?.data?.error || 'Das Konto konnte nicht gelöscht werden.');
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={abmelden}
        className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full border border-border bg-card text-[14px]"
      >
        <LogOut className="h-4 w-4" strokeWidth={1.6} /> Abmelden
      </button>

      <div className="mt-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
        <p className="text-[12px]">Konto löschen</p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          Entfernt alle deine Teile, Outfits, Basismodelle, Packlisten und Einstellungen endgültig.
        </p>
        <button
          type="button"
          onClick={() => {
            setFehler('');
            setDialogOffen(true);
          }}
          className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-destructive/40 px-4 text-[12px] text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" /> Daten endgültig löschen
        </button>
      </div>

      <Dialog open={dialogOffen} onOpenChange={(open) => !busy && setDialogOffen(open)}>
        <DialogContent className="max-w-sm rounded-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-normal">Wirklich löschen?</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
              Alle deine Daten in Aura werden entfernt und du wirst abgemeldet. Das lässt sich nicht
              rückgängig machen.
            </DialogDescription>
          </DialogHeader>
          {fehler && <p className="text-[12px] text-destructive">{fehler}</p>}
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setDialogOffen(false)}
              disabled={busy}
              className="min-h-[46px] flex-1 rounded-full border border-border text-[13px] disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={kontoLoeschen}
              disabled={busy}
              className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-full bg-destructive text-[13px] text-destructive-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Endgültig löschen
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}