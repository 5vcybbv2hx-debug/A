import { weatherText } from '../../shared/aura.ts';

function symbolText(code) {
  const s = String(code || '').replace(/_(day|night|polartwilight)$/, '');
  const map = {
    clearsky: 'Klar', fair: 'Heiter', partlycloudy: 'Teils bewölkt', cloudy: 'Bewölkt', fog: 'Neblig',
    lightrain: 'Leichter Regen', rain: 'Regen', heavyrain: 'Starker Regen',
    lightrainshowers: 'Leichte Schauer', rainshowers: 'Schauer', heavyrainshowers: 'Starke Schauer',
    lightsleet: 'Schneeregen', sleet: 'Schneeregen', heavysleet: 'Schneeregen',
    lightsnow: 'Leichter Schnee', snow: 'Schnee', heavysnow: 'Starker Schnee',
    lightsnowshowers: 'Schneeschauer', snowshowers: 'Schneeschauer',
    rainandthunder: 'Gewitter', thunderstorm: 'Gewitter', sleetandthunder: 'Gewitter', snowandthunder: 'Gewitter',
  };
  return map[s] || 'Wechselhaft';
}

async function openMeteo(latitude, longitude) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    '&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max' +
    '&timezone=auto&forecast_days=3';
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) return null;
  const daily = (await res.json()).daily || {};
  const tage = (daily.time || []).map((datum, i) => ({
    datum,
    temp_min: Math.round(daily.temperature_2m_min?.[i] ?? 0),
    temp_max: Math.round(daily.temperature_2m_max?.[i] ?? 0),
    regen: daily.precipitation_probability_max?.[i] ?? 0,
    beschreibung: weatherText(daily.weather_code?.[i] ?? 0),
  }));
  return tage.length ? tage : null;
}

async function metNo(latitude, longitude) {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude}&lon=${longitude}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(25000),
    headers: { 'User-Agent': 'A-Kleiderschrank/1.0 (personal wardrobe app)' },
  });
  if (!res.ok) return null;
  const ts = (await res.json())?.properties?.timeseries || [];
  const byDay = new Map();
  for (const entry of ts) {
    const tag = String(entry.time).slice(0, 10);
    if (!byDay.has(tag)) byDay.set(tag, []);
    byDay.get(tag).push(entry);
  }
  const tage = [...byDay.entries()].slice(0, 3).map(([datum, entries]) => {
    const temps = entries
      .map((e) => e.data?.instant?.details?.air_temperature)
      .filter((n) => typeof n === 'number');
    const regenAnteil = entries.filter(
      (e) => (e.data?.next_1_hours?.details?.precipitation_amount ?? 0) > 0.1
    ).length;
    const mitte = entries[Math.floor(entries.length / 2)];
    const symbol =
      mitte?.data?.next_1_hours?.summary?.symbol_code ||
      mitte?.data?.next_6_hours?.summary?.symbol_code ||
      '';
    return {
      datum,
      temp_min: Math.round(Math.min(...temps)),
      temp_max: Math.round(Math.max(...temps)),
      regen: Math.round((regenAnteil / Math.max(entries.length, 1)) * 100),
      beschreibung: symbolText(symbol),
    };
  });
  return tage.length ? tage : null;
}

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const lat = Number(body.latitude);
    const lon = Number(body.longitude);
    const latitude = Number.isFinite(lat) ? lat : 52.52;
    const longitude = Number.isFinite(lon) ? lon : 13.405;

    let tage = null;
    let quelle = 'open-meteo';
    try {
      tage = await openMeteo(latitude, longitude);
    } catch (_e) {
      tage = null;
    }
    if (!tage) {
      tage = await metNo(latitude, longitude);
      quelle = 'met.no';
    }
    if (!tage) {
      return Response.json({ error: 'Wetter konnte gerade nicht geladen werden.' }, { status: 502 });
    }

    return Response.json({ tage, quelle });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}