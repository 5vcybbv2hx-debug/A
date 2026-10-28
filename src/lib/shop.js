import { base44 } from '@/api/base44Client';
import { teilAufnehmen } from '@/lib/teilAufnehmen';

function base64ZuDatei(base64, typ) {
  const binaer = atob(base64);
  const bytes = new Uint8Array(binaer.length);
  for (let i = 0; i < binaer.length; i += 1) bytes[i] = binaer.charCodeAt(i);
  const endung = typ.includes('png') ? 'png' : typ.includes('webp') ? 'webp' : 'jpg';
  return new File([bytes], `shop-bild.${endung}`, { type: typ });
}

/**
 * Nimmt ein Teil direkt aus einem Shop-Link auf: Produktdaten holen, Bild
 * freistellen, taggen und mit Herkunft und Preis ablegen.
 */
export async function teilAusShop(link, melde = () => {}) {
  melde('shop');

  const antwort = await base44.functions.invoke('shopArtikel', { url: link });
  const daten = antwort.data || {};
  if (daten.error) throw new Error(daten.error);

  const datei = base64ZuDatei(daten.bild_base64, daten.bild_typ || 'image/jpeg');
  const item = await teilAufnehmen(datei, melde);

  // Erst nach dem Tagging setzen, sonst überschreibt die Erkennung Name und Marke.
  const gepatcht = await base44.entities.Kleidungsstueck.update(item.id, {
    name: daten.titel ? daten.titel.slice(0, 60) : item.name,
    marke: daten.marke || item.marke || null,
    quelle_url: daten.quelle_url || link,
    shop_name: daten.shop || null,
    preis: typeof daten.preis === 'number' ? daten.preis : null,
    verarbeitungs_status: 'fertig',
  });

  return gepatcht;
}

export function shopAnzeige(item) {
  if (!item?.quelle_url) return null;
  const teile = [item.shop_name];
  if (typeof item.preis === 'number') teile.push(`${item.preis.toFixed(2).replace('.', ',')} €`);
  return teile.filter(Boolean).join(' · ');
}
