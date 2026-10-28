import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Moon, Shirt, Sparkles, LayoutGrid, User, Luggage } from 'lucide-react';
import { cn } from '@/lib/utils';
import { vorwaermen } from '@/lib/cutout';
import { useFarbschema } from '@/lib/theme';

const VORWAERM_SCHLUESSEL = 'a-freistellen-modell';

const NAV = [
  { to: '/heute', label: 'Heute', icon: Moon },
  { to: '/schrank', label: 'Schrank', icon: Shirt },
  { to: '/studio', label: 'Studio', icon: Sparkles, primary: true },
  { to: '/galerie', label: 'Galerie', icon: LayoutGrid },
  { to: '/profil', label: 'Profil', icon: User },
];

const SIDE_NAV = [...NAV, { to: '/packlisten', label: 'Packlisten', icon: Luggage }];

export default function Layout() {
  const { pathname } = useLocation();

  // Das Freistell-Modell einmal im Leerlauf holen, damit das erste Hochladen
  // nicht eine Minute vor leerem Bildschirm steht. Nicht bei Datensparmodus
  // und nicht im Mobilfunknetz mit schwacher Verbindung.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (localStorage.getItem(VORWAERM_SCHLUESSEL)) return undefined;

    const verbindung = navigator.connection;
    if (verbindung?.saveData) return undefined;
    if (verbindung?.effectiveType && verbindung.effectiveType !== '4g') return undefined;

    let abgebrochen = false;
    const starten = () => {
      if (abgebrochen) return;
      vorwaermen()
        .then((ok) => {
          if (ok) localStorage.setItem(VORWAERM_SCHLUESSEL, String(Date.now()));
        })
        .catch(() => {});
    };

    let kennung;
    if (typeof window.requestIdleCallback === 'function') {
      kennung = window.requestIdleCallback(starten, { timeout: 12000 });
    } else {
      kennung = window.setTimeout(starten, 8000);
    }

    return () => {
      abgebrochen = true;
      if (typeof window.cancelIdleCallback === 'function' && typeof kennung === 'number') {
        window.cancelIdleCallback(kennung);
      } else {
        window.clearTimeout(kennung);
      }
    };
  }, []);

  useFarbschema();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl">
        {/* Desktop / iPad Navigation */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between border-r border-border/70 px-6 py-10 md:flex">
          <div>
            <Link to="/" className="mb-12 flex flex-col items-start gap-1">
              <span className="font-display text-4xl leading-none text-gold">A</span>
              <span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                Mein Schrank
              </span>
            </Link>
            <nav className="flex flex-col gap-1">
              {SIDE_NAV.map(({ to, label, icon: Icon }) => {
                const active = pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      'flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm transition-colors',
                      active
                        ? 'bg-accent text-foreground'
                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                    )}
                  >
                    <Icon className={cn('h-[18px] w-[18px]', active && 'text-gold')} strokeWidth={1.6} />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Alle Fotos liegen im
            <br />
            privaten Speicher.
          </p>
        </aside>

        <main className="min-w-0 flex-1 pb-28 pt-[env(safe-area-inset-top)] md:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Mobile Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
          {NAV.map(({ to, label, icon: Icon, primary }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] tracking-wide transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
                    primary && 'bg-primary text-primary-foreground',
                    primary && active && 'ring-1 ring-gold'
                  )}
                >
                  <Icon
                    className={cn('h-[18px] w-[18px]', !primary && active && 'text-gold')}
                    strokeWidth={1.6}
                  />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}