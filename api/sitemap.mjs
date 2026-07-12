// Dynamic sitemap straight from the Supabase inventory — always in sync with the admin.
export default async function handler(req, res) {
  const base = 'https://' + (req.headers['x-forwarded-host'] || req.headers.host);
  const SB = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_ANON_KEY;
  let urls = [
    { loc: base + '/', pri: '1.0' },
    { loc: base + '/automobile', pri: '0.9' }
  ];
  try {
    const r = await fetch(SB + '/rest/v1/cars?select=id,data,updated_at&order=position.asc', {
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
    });
    if (r.ok) {
      const rows = await r.json();
      for (const row of rows) {
        const st = (row.data && row.data.status) || 'disponibil';
        if (st === 'ascuns') continue;
        urls.push({ loc: base + '/auto/' + row.id, lastmod: row.updated_at, pri: '0.7' });
      }
    }
  } catch (e) { /* fall through with the static pages only */ }

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u =>
      '  <url><loc>' + u.loc + '</loc>' +
      (u.lastmod ? '<lastmod>' + u.lastmod.slice(0, 10) + '</lastmod>' : '') +
      '<priority>' + u.pri + '</priority></url>'
    ).join('\n') +
    '\n</urlset>\n';

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
