export const KATEGORIEN = [
  'T-Shirt', 'Bluse', 'Pullover', 'Kleid', 'Hose', 'Rock', 'Jacke', 'Mantel',
  'Schuh', 'Tasche', 'Schmuck', 'Accessoire', 'Sonstiges',
];

export const SLOTS = ['top', 'bottom', 'fullbody', 'outer', 'shoes', 'accessory'];

export const SLOT_LABEL = {
  top: 'Oberteil',
  bottom: 'Unterteil',
  fullbody: 'Komplett',
  outer: 'Jacke',
  shoes: 'Schuhe',
  accessory: 'Accessoire',
};

export const MUSTER = ['Unifarben', 'Gestreift', 'Gemustert', 'Blumen', 'Karriert', 'Sonstiges'];
export const SAISONS = ['Frühling', 'Sommer', 'Herbst', 'Winter', 'Übergang', 'Ganzjahres'];
export const ANLAESSE = ['Alltag', 'Business', 'Sport', 'Feier', 'Zuhause', 'Date'];

export function slotForKategorie(kategorie) {
  switch (kategorie) {
    case 'T-Shirt':
    case 'Bluse':
    case 'Pullover':
      return 'top';
    case 'Hose':
    case 'Rock':
      return 'bottom';
    case 'Kleid':
      return 'fullbody';
    case 'Jacke':
    case 'Mantel':
      return 'outer';
    case 'Schuh':
      return 'shoes';
    case 'Tasche':
    case 'Schmuck':
    case 'Accessoire':
      return 'accessory';
    default:
      return 'top';
  }
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function daysSince(dateStr) {
  if (!dateStr) return 9999;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 9999;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

// Verkleinert ein Bild im Browser auf max. 1200 px Breite, bevor es hochgeladen wird.
export function shrinkImage(file, maxWidth = 1200) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      if (img.width <= maxWidth) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }
      const scale = maxWidth / img.width;
      const canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file);
        },
        'image/jpeg',
        0.9
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}