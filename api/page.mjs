// Serves /auto/<id> with per-car meta baked into the HTML shell so WhatsApp,
// Telegram, and Google see the real title, description, and branded OG card.
// Humans get the identical shell; the SPA hydrates on top as usual.
export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const base = (req.headers['x-forwarded-proto'] || 'https') + '://' + host;
  const id = String(req.query.id || '').match(/^[\w-]+$/) ? req.query.id : null;

  const shellR = await fetch(base + '/index.html');
  let html = await shellR.text();

  let car = null;
  if (id) {
    try {
      const r = await fetch(
        process.env.SUPABASE_URL + '/rest/v1/cars?id=eq.' + id + '&select=data',
        { headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_ANON_KEY } }
      );
      if (r.ok) { const rows = await r.json(); car = rows[0] && rows[0].data; }
    } catch (e) { /* serve shell with defaults */ }
  }

  if (car) {
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const eur = Number(car.price).toLocaleString('ro-RO').replace(/ /g, '.') + ' €';
    const km = Number(car.km).toLocaleString('ro-RO').replace(/ /g, '.');
    const title = esc(car.name + ' ' + car.year + ' — ' + eur + ' · PEAK AUTO');
    const desc = esc(car.name + ' ' + car.year + ', ' + km + ' km, ' + (car.fuel || '') +
      ' — ' + eur + '. Verificat, în Chișinău la PEAK AUTO. +373 61 249 999.');
    const ogImg = base + '/api/og?id=' + encodeURIComponent(id);
    const ogUrl = base + '/auto/' + encodeURIComponent(id);

    html = html
      .replace(/<title>[^<]*<\/title>/, '<title>' + title + '</title>')
      .replace(/(<meta name="description" content=")[^"]*(")/, '$1' + desc + '$2')
      .replace(/(<meta property="og:title" content=")[^"]*(")/, '$1' + title + '$2')
      .replace(/(<meta property="og:description" content=")[^"]*(")/, '$1' + desc + '$2')
      .replace(/(<meta property="og:image" content=")[^"]*(")/, '$1' + ogImg + '$2')
      .replace(/(<meta property="og:url" content=")[^"]*(")/, '$1' + ogUrl + '$2');
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  res.status(200).send(html);
}
