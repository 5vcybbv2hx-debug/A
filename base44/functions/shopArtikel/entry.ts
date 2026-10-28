import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { angemeldeterUser } from '../../shared/aura.ts';
import {
  MAX_HTML_BYTES,
  hole,
  pruefeUrl,
  ausHtml,
  ausShopify,
  alsBase64,
} from '../../shared/shopParsing.ts';

// Liest aus einem Shop-Link das Produkt: Name, Marke, Preis und ein Bild.
//
// Zwei Wege, weil Shops unterschiedlich gebaut sind:
// 1. Shopify: /products/<handle>.json liefert die Daten auch dann, wenn die
//    Seite selbst nur JavaScript ausliefert (getestet mit armedangels.com).
// 2. Klassische Shops: JSON-LD (schema.org/Product) oder og:image im HTML.
//    Klappt bei Shopware, WooCommerce und Magento, meist nicht bei großen
//    Häusern mit Bot-Schutz. Zalando antwortet zum Beispiel mit 403.
//
// Das Bild kommt als Base64 zurück, damit der Browser es ohne CORS direkt
// freistellen kann. Die Größe ist begrenzt, sonst wird der Aufruf zu teuer.

export default async function (req) {
  try {
    const { url: roh } = await req.json().catch(() => ({}));
    if (!roh) return Response.json({ error: 'Bitte einen Link einfügen.' }, { status: 400 });

    const url = pruefeUrl(roh);

    // Ohne Anmeldung kein Abruf: der Endpunkt soll kein offener Proxy sein.
    const base44 = createClientFromRequest(req);
    const user = await angemeldeterUser(base44);
    if (!user) return Response.json({ error: 'Bitte zuerst anmelden.' }, { status: 401 });

    let daten = await ausShopify(url);

    if (!daten?.bild) {
      const { text } = await hole(url.toString(), MAX_HTML_BYTES);
      const ausSeite = ausHtml(text);
      daten = {
        titel: daten?.titel || ausSeite.titel,
        marke: daten?.marke || ausSeite.marke,
        preis: daten?.preis ?? ausSeite.preis,
        waehrung: daten?.waehrung || ausSeite.waehrung,
        bild: daten?.bild || ausSeite.bild,
        istProdukt: Boolean(daten?.istProdukt || ausSeite.istProdukt),
        herkunft: daten ? 'shopify+html' : ausSeite.herkunft,
      };
    }

    if (!daten?.bild || !daten.istProdukt) {
      return Response.json(
        {
          error:
            'Diesen Link kann ich nicht auslesen. Entweder zeigt er nicht auf ein einzelnes Produkt, oder der Shop verrät sein Produktbild nicht. Speichere das Bild und lade es als Foto hoch, dann geht es genauso.',
        },
        { status: 422 }
      );
    }

    const bildUrl = new URL(daten.bild, url).toString();
    const bild = await alsBase64(bildUrl);

    return Response.json({
      titel: (daten.titel || '').slice(0, 120) || null,
      marke: daten.marke ? String(daten.marke).slice(0, 60) : null,
      preis: daten.preis ?? null,
      waehrung: daten.waehrung || null,
      shop: url.hostname.replace(/^www\./, ''),
      quelle_url: url.toString(),
      herkunft: daten.herkunft || 'html',
      bild_base64: bild.base64,
      bild_typ: bild.typ,
      bild_bytes: bild.groesse,
    });
  } catch (fehler) {
    return Response.json(
      { error: fehler?.message || 'Der Link konnte nicht gelesen werden.' },
      { status: 400 }
    );
  }
}
