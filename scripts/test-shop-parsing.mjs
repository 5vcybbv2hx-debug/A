// Prüft das Auslesen von Shop-Seiten ohne Base44.
// Aufruf: npx esbuild base44/shared/shopParsing.ts --format=esm --platform=node --outfile=/tmp/shopparsing.mjs && node scripts/test-shop-parsing.mjs
import { ausHtml, ausShopify, pruefeUrl } from '/tmp/shopparsing.mjs';

const faelle = [
  ['Shopify-Produkt (JS-Shop)', 'https://www.armedangels.com/products/parka-5cio0gap10080738', true],
  ['Shop-Startseite', 'https://www.armedangels.com/', false],
  ['404-Seite', 'https://www.armedangels.com/de-de/p/parka-5cio0gap10080738', false],
];

let fehler = 0;
for (const [label, link, erwartet] of faelle) {
  const url = pruefeUrl(link);
  const shop = await ausShopify(url);
  let daten = shop;
  if (!daten?.bild) {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/124.0' } });
    daten = ausHtml(await res.text());
  }
  const ok = Boolean(daten?.istProdukt) === erwartet;
  if (!ok) fehler += 1;
  console.log(`${ok ? 'ok  ' : 'FEHL'} ${label}: Produkt erkannt = ${Boolean(daten?.istProdukt)} (erwartet ${erwartet})`);
}

for (const b of ['http://localhost/x', 'http://192.168.1.5/a', 'file:///etc/passwd', 'http://10.0.0.1/']) {
  try {
    pruefeUrl(b);
    fehler += 1;
    console.log('FEHL nicht blockiert:', b);
  } catch {
    console.log('ok   blockiert:', b);
  }
}

console.log(fehler === 0 ? '\nAlles wie erwartet.' : `\n${fehler} Abweichungen.`);
process.exit(fehler === 0 ? 0 : 1);
