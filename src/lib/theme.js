import { useEffect } from 'react';

/**
 * Setzt das gespeicherte Farbschema oder die Systemeinstellung.
 * Liegt hier, weil der Erststart ohne Layout läuft und trotzdem dunkel
 * aussehen soll, wenn sie dunkel eingestellt hat.
 */
export function useFarbschema() {
  useEffect(() => {
    const gespeichert = localStorage.getItem('aura-theme');
    const dunkel = gespeichert
      ? gespeichert === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dunkel);
  }, []);
}
