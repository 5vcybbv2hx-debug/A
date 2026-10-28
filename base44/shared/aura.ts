export const KATEGORIEN = [
  'T-Shirt', 'Bluse', 'Pullover', 'Kleid', 'Hose', 'Rock', 'Jacke', 'Mantel',
  'Schuh', 'Tasche', 'Schmuck', 'Accessoire', 'Sonstiges',
];

export const SLOTS = ['top', 'bottom', 'fullbody', 'outer', 'shoes', 'accessory'];
export const MUSTER = ['Unifarben', 'Gestreift', 'Gemustert', 'Blumen', 'Karriert', 'Sonstiges'];
export const SAISONS = ['Frühling', 'Sommer', 'Herbst', 'Winter', 'Übergang', 'Ganzjahres'];
export const ANLAESSE = ['Alltag', 'Business', 'Sport', 'Feier', 'Zuhause', 'Date'];

export async function signedUrl(base44, uri, expiresIn = 1800) {
  if (!uri) return null;
  if (/^https?:\/\//.test(uri)) return uri;
  const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
    file_uri: uri,
    expires_in: expiresIn,
  });
  return signed_url;
}

// Lädt ein erzeugtes Bild herunter und legt es im privaten Speicher ab.
export async function toPrivateImage(base44, url, filename = 'bild.png') {
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error('Bild konnte nicht geladen werden');
  const blob = await res.blob();
  const type = blob.type || 'image/png';
  const ext = type.includes('jpeg') || type.includes('jpg') ? 'jpg' : 'png';
  const base = String(filename).replace(/\.\w+$/, '');
  const file = new File([blob], `${base}.${ext}`, { type });
  const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });
  return file_uri;
}

export function describeItem(item) {
  const teile = [item.kategorie];
  if (item.farben?.length) teile.push(item.farben.join(' und '));
  if (item.muster && item.muster !== 'Unifarben') teile.push(item.muster);
  const detail = teile.filter(Boolean).join(', ');
  return `- ${item.name} (${detail})`;
}

export function firstOf(result) {
  if (!result) return null;
  if (Array.isArray(result)) return result[0] || null;
  return result.items?.[0] || null;
}

export function asArray(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  return result.items || [];
}

export function signaturOf(itemIds) {
  return [...(itemIds || [])].sort().join('|');
}

export function weatherText(code) {
  if (code === 0) return 'Klar';
  if (code <= 3) return 'Leicht bewölkt';
  if (code === 45 || code === 48) return 'Neblig';
  if (code >= 51 && code <= 57) return 'Nieselregen';
  if (code >= 61 && code <= 67) return 'Regen';
  if (code >= 71 && code <= 77) return 'Schnee';
  if (code >= 80 && code <= 82) return 'Schauer';
  if (code >= 85 && code <= 86) return 'Schneeschauer';
  if (code >= 95) return 'Gewitter';
  return 'Wechselhaft';
}