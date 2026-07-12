// Branded 1200x630 share card, rendered per car from the Supabase inventory.
// /api/og            -> brand card (home/inventory shares)
// /api/og?id=<carId> -> car card: photo, name, specs, price
import { ImageResponse } from '@vercel/og';

const BG = '#0A0A0B';
const RED = '#E10600';
const INK = '#F4F1EC';

// Inter 600/800 from Google Fonts, fetched once per instance and cached at module scope.
const FONT_BASE = 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVu';
const semibold = fetch(FONT_BASE + 'GKYMZg.ttf').then(r => r.arrayBuffer());
const extrabold = fetch(FONT_BASE + 'DyYMZg.ttf').then(r => r.arrayBuffer());

const fmtEur = n => Number(n).toLocaleString('ro-RO').replace(/ /g, '.') + ' €';
const fmtNum = n => Number(n).toLocaleString('ro-RO').replace(/ /g, '.');

const el = (type, style, children, extra) => ({ type, props: { style, children, ...(extra || {}) } });

function wordmark(size) {
  return el('div', { display: 'flex', fontSize: size, fontWeight: 800, letterSpacing: '0.08em', color: RED }, 'PEAKAUTO');
}

function brandCard() {
  return el('div', {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', background: BG, gap: 26,
  }, [
    wordmark(84),
    el('div', { display: 'flex', width: 240, height: 2, background: 'rgba(255,255,255,.18)' }),
    el('div', { display: 'flex', fontSize: 30, fontWeight: 600, color: 'rgba(244,241,236,.72)' },
      'Automobile premium & business class · Chișinău'),
  ]);
}

function carCard(c, host) {
  // mirrors img900() in js/app.js: full URL / site-relative path / bare 999 CDN filename
  const src = c.images && c.images[0];
  const img = !src ? null
    : /^https?:/.test(src) ? src
    : src.indexOf('/') !== -1 ? 'https://' + host + '/' + src.replace(/^\//, '')
    : 'https://i.simpalsmedia.com/999.md/BoardImages/900x900/' + src;
  const meta = [c.year, c.km != null ? fmtNum(c.km) + ' km' : null, c.fuel].filter(Boolean).join('  ·  ');
  return el('div', { width: '100%', height: '100%', display: 'flex', background: BG, color: INK }, [
    // left: identity + price
    el('div', {
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      width: 520, padding: '54px 10px 54px 60px', flexShrink: 0,
    }, [
      wordmark(30),
      el('div', { display: 'flex', flexDirection: 'column' }, [
        el('div', { display: 'flex', fontSize: 54, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 }, c.name || ''),
        el('div', { display: 'flex', fontSize: 24, fontWeight: 600, color: 'rgba(244,241,236,.55)', marginTop: 18 }, meta),
        el('div', { display: 'flex', fontSize: 66, fontWeight: 800, color: RED, marginTop: 34 }, c.price ? fmtEur(c.price) : ''),
      ]),
      el('div', { display: 'flex', alignItems: 'center', gap: 14 }, [
        el('div', { display: 'flex', width: 46, height: 2, background: RED }),
        el('div', { display: 'flex', fontSize: 19, fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(244,241,236,.6)' }, host.toUpperCase()),
      ]),
    ]),
    // right: photo bleeding under a left-edge gradient
    el('div', { display: 'flex', flexGrow: 1, position: 'relative' }, [
      img ? el('img', { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }, undefined, { src: img, width: 900, height: 900 })
          : el('div', { position: 'absolute', width: '100%', height: '100%', background: '#141416' }),
      el('div', {
        position: 'absolute', width: '100%', height: '100%',
        background: 'linear-gradient(90deg, #0A0A0B 0%, rgba(10,10,11,0.25) 34%, rgba(10,10,11,0) 60%, rgba(10,10,11,0.35) 100%)',
      }),
      el('div', {
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 120,
        background: 'linear-gradient(180deg, rgba(10,10,11,0) 0%, rgba(10,10,11,0.55) 100%)',
      }),
    ]),
  ]);
}

export default async function handler(req, res) {
  const id = String(req.query.id || '');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'peakauto-site.vercel.app').replace(/^www\./, '');

  let car = null;
  if (id && /^[\w-]+$/.test(id)) {
    try {
      const r = await fetch(
        process.env.SUPABASE_URL + '/rest/v1/cars?id=eq.' + id + '&select=data',
        { headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_ANON_KEY } }
      );
      if (r.ok) { const rows = await r.json(); car = rows[0] && rows[0].data; }
    } catch (e) { /* brand card fallback */ }
  }

  const [sb, xb] = await Promise.all([semibold, extrabold]);
  const img = new ImageResponse(car ? carCard(car, host) : brandCard(), {
    width: 1200, height: 630,
    fonts: [
      { name: 'Inter', data: sb, weight: 600, style: 'normal' },
      { name: 'Inter', data: xb, weight: 800, style: 'normal' },
    ],
  });
  const buf = Buffer.from(await img.arrayBuffer());
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.status(200).send(buf);
}
