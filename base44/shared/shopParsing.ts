// Reines Auslesen von Shop-Seiten. Liegt hier, damit es sich außerhalb von
// Base44 mit esbuild testen lässt (siehe Testskript im Repo).

export const MAX_BILD_BYTES = 3_500_000;
export const MAX_HTML_BYTES = 4_000_000;
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function interneAdresse(host: string) {
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h === '0.0.0.0' || h === '[::1]' || h === '::1') return true;
  return false;
}

export function pruefeUrl(roh: string) {
  let url: URL;
  try {
    url = new URL(String(roh).trim());
  } catch {
    throw new Error('Das ist kein gültiger Link.');
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error('Nur http- und https-Links.');
  if (interneAdresse(url.hostname)) throw new Error('Diese Adresse ist nicht erlaubt.');
  return url;
}

export async function hole(url: string, maxBytes: number) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
      'Accept-Language': 'de-DE,de;q=0.9',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Der Shop antwortet mit ${res.status}.`);
  const typ = res.headers.get('content-type') || '';
  const puffer = await res.arrayBuffer();
  if (puffer.byteLength > maxBytes) throw new Error('Die Antwort ist zu groß.');
  return { text: new TextDecoder('utf-8').decode(puffer), typ, bytes: puffer };
}

function zahl(wert: unknown): number | null {
  if (wert === null || wert === undefined) return null;
  const n = Number(String(wert).replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function bildAusJsonLd(knoten: any): string | null {
  const bild = knoten?.image;
  if (typeof bild === 'string') return bild;
  if (Array.isArray(bild) && bild.length) {
    const erstes = bild[0];
    if (typeof erstes === 'string') return erstes;
    if (erstes?.url) return erstes.url;
  }
  if (bild?.url) return bild.url;
  return null;
}

function produktAusJsonLd(daten: any): any | null {
  if (!daten) return null;
  const liste = Array.isArray(daten) ? daten : daten['@graph'] ? daten['@graph'] : [daten];
  for (const knoten of liste) {
    if (!knoten || typeof knoten !== 'object') continue;
    const typ = String(knoten['@type'] || '');
    if (typ === 'Product' || typ === 'ProductGroup') {
      const angebot = Array.isArray(knoten.offers) ? knoten.offers[0] : knoten.offers;
      return {
        titel: knoten.name || null,
        marke: typeof knoten.brand === 'object' ? knoten.brand?.name || null : knoten.brand || null,
        preis: zahl(angebot?.price ?? angebot?.lowPrice),
        waehrung: angebot?.priceCurrency || null,
        bild: bildAusJsonLd(knoten),
      };
    }
    if (typ.includes('Product')) {
      const tiefer = produktAusJsonLd(knoten);
      if (tiefer) return tiefer;
    }
  }
  return null;
}

export function ausHtml(html: string) {
  const ldBloecke = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of ldBloecke) {
    try {
      const produkt = produktAusJsonLd(JSON.parse(block[1].trim()));
      if (produkt) return { ...produkt, istProdukt: true, herkunft: 'jsonld' };
    } catch {
      // Manche Shops schreiben kaputtes JSON-LD, dann weiter zum nächsten Block.
    }
  }

  const meta = (name: string) => {
    const muster = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, 'i'),
    ];
    for (const m of muster) {
      const treffer = html.match(m);
      if (treffer) return treffer[1];
    }
    return null;
  };

  const ogTyp = meta('og:type');

  const titel =
    meta('og:title') ||
    (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '').trim() ||
    null;

  return {
    titel,
    marke: meta('product:brand'),
    preis: zahl(meta('product:price:amount')),
    waehrung: meta('product:price:currency'),
    bild: meta('og:image:secure_url') || meta('og:image') || meta('twitter:image'),
    // Nur wenn die Seite sich selbst als Produkt ausweist, ist das og:image auch
    // das Produkt. Sonst bekommt man das Titelbild des Shops und würde eine
    // Werbegrafik freistellen.
    istProdukt: /product/i.test(ogTyp || ''),
    herkunft: 'html',
  };
}

export async function ausShopify(url: URL) {
  const treffer = url.pathname.match(/\/products\/([^/?#]+)/);
  if (!treffer) return null;
  const jsonUrl = `${url.origin}/products/${treffer[1]}.json`;
  try {
    const { text } = await hole(jsonUrl, 1_500_000);
    const produkt = JSON.parse(text)?.product;
    if (!produkt) return null;
    return {
      titel: produkt.title || null,
      marke: produkt.vendor || null,
      preis: zahl(produkt.variants?.[0]?.price),
      waehrung: null,
      bild: produkt.images?.[0]?.src || produkt.image?.src || null,
      kategorie: produkt.product_type || null,
      istProdukt: true,
      herkunft: 'shopify',
    };
  } catch {
    return null;
  }
}

export async function alsBase64(bildUrl: string) {
  const res = await fetch(bildUrl, {
    headers: { 'User-Agent': UA, Accept: 'image/*' },
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error('Das Produktbild ließ sich nicht laden.');
  const typ = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
  if (!typ.startsWith('image/')) throw new Error('Der Link zeigt auf kein Bild.');
  const puffer = await res.arrayBuffer();
  if (puffer.byteLength > MAX_BILD_BYTES) throw new Error('Das Produktbild ist zu groß.');

  const bytes = new Uint8Array(puffer);
  let binaer = '';
  const block = 0x8000;
  for (let i = 0; i < bytes.length; i += block) {
    binaer += String.fromCharCode(...bytes.subarray(i, i + block));
  }
  return { base64: btoa(binaer), typ, groesse: puffer.byteLength };
}

