/* PEAK AUTO admin — edits data/overrides.js in the GitHub repo; Vercel redeploys on commit. */
(function () {
  'use strict';

  var REPO = 'VadimT7/peakauto-site';
  var FILE = 'data/overrides.js';
  var WORKFLOW = 'refresh-stock.yml';
  var API = 'https://api.github.com';

  var CARS = window.PK_CARS || [];
  var base = window.PK_OVERRIDES || { cars: {}, featured: [] };
  var ovr = JSON.parse(JSON.stringify({ cars: base.cars || {}, featured: base.featured || [] }));
  var dirty = false;
  var q = '';

  var $ = function (id) { return document.getElementById(id); };
  var STATUSES = [
    ['disponibil', 'Disponibil'],
    ['rezervat', 'Rezervat'],
    ['tranzit', 'În tranzit'],
    ['vandut', 'Vândut'],
    ['ascuns', 'Ascuns (scos de pe site)']
  ];

  function token() { try { return localStorage.getItem('pk-admin-token') || ''; } catch (e) { return ''; } }

  function msg(text, cls) {
    var m = $('msg');
    m.textContent = text;
    m.className = 'msg ' + (cls || '');
    m.style.display = 'block';
    clearTimeout(msg._t);
    msg._t = setTimeout(function () { m.style.display = 'none'; }, 5200);
  }

  function entry(id) {
    if (!ovr.cars[id]) ovr.cars[id] = {};
    return ovr.cars[id];
  }
  function prune(id) {
    var e = ovr.cars[id];
    if (e && (e.status == null || e.status === 'disponibil') && (e.price == null || e.price === '')) delete ovr.cars[id];
  }
  function markDirty() {
    dirty = true;
    $('btn-publish').disabled = false;
    renderStats();
  }

  function carState(c) {
    var e = ovr.cars[c.id] || {};
    return {
      status: e.status || 'disponibil',
      price: (e.price != null && e.price !== '') ? e.price : null,
      featured: ovr.featured.indexOf(c.id) !== -1
    };
  }

  function fmtEur(n) { return Number(n).toLocaleString('ro-RO').replace(/ /g, '.') + ' €'; }

  function renderStats() {
    var vis = 0, sold = 0, hidden = 0;
    CARS.forEach(function (c) {
      var s = carState(c).status;
      if (s === 'ascuns') hidden++;
      else if (s === 'vandut') { sold++; vis++; }
      else vis++;
    });
    $('stats').innerHTML =
      '<div class="stat"><b>' + CARS.length + '</b><span>Total scrapate</span></div>' +
      '<div class="stat"><b>' + vis + '</b><span>Pe site</span></div>' +
      '<div class="stat"><b>' + sold + '</b><span>Vândute</span></div>' +
      '<div class="stat"><b>' + hidden + '</b><span>Ascunse</span></div>' +
      '<div class="stat"><b>' + ovr.featured.length + '</b><span>Featured ★</span></div>' +
      '<div class="stat"><b>' + (dirty ? 'DA' : 'nu') + '</b><span>Modificări nepublicate</span></div>';
  }

  function renderRows() {
    var needle = q.toLowerCase();
    var html = CARS.filter(function (c) {
      return !needle || (c.name + ' ' + c.year).toLowerCase().indexOf(needle) !== -1;
    }).map(function (c) {
      var s = carState(c);
      return '<div class="row" data-id="' + c.id + '">' +
        '<img src="https://i.simpalsmedia.com/999.md/BoardImages/320x240/' + c.images[0] + '" alt="" loading="lazy">' +
        '<div class="nm"><b>' + c.name + '</b><span>' + c.year + ' · ' + Number(c.km).toLocaleString('ro-RO') + ' km · 999.md: ' + fmtEur(c.price) + '</span></div>' +
        '<div><input type="number" class="f-price" placeholder="' + c.price + '" value="' + (s.price != null ? s.price : '') + '"></div>' +
        '<div class="c4"><select class="f-status st-' + s.status + '">' + STATUSES.map(function (st) {
          return '<option value="' + st[0] + '"' + (s.status === st[0] ? ' selected' : '') + '>' + st[1] + '</option>';
        }).join('') + '</select></div>' +
        '<div class="c5"><button class="fstar' + (s.featured ? ' on' : '') + '">★</button></div>' +
        '</div>';
    }).join('');
    $('rows').innerHTML = html || '<p style="color:rgba(244,241,236,.5);padding:30px 0">Niciun rezultat.</p>';

    $('rows').querySelectorAll('.row').forEach(function (row) {
      var id = row.getAttribute('data-id');
      row.querySelector('.f-price').addEventListener('input', function () {
        var v = this.value.trim();
        entry(id).price = v === '' ? null : +v;
        prune(id);
        row.classList.add('dirty');
        markDirty();
      });
      var sel = row.querySelector('.f-status');
      sel.addEventListener('change', function () {
        entry(id).status = sel.value;
        prune(id);
        sel.className = 'f-status st-' + sel.value;
        row.classList.add('dirty');
        markDirty();
      });
      row.querySelector('.fstar').addEventListener('click', function () {
        var i = ovr.featured.indexOf(id);
        if (i === -1) {
          if (ovr.featured.length >= 6) { msg('Maxim 6 mașini featured.', 'err'); return; }
          ovr.featured.push(id);
        } else ovr.featured.splice(i, 1);
        this.classList.toggle('on', ovr.featured.indexOf(id) !== -1);
        row.classList.add('dirty');
        markDirty();
      });
    });
  }

  /* ---------- GitHub API ---------- */
  function gh(path, opts) {
    opts = opts || {};
    opts.headers = {
      'Authorization': 'Bearer ' + token(),
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    return fetch(API + path, opts);
  }

  function b64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function publish() {
    var btn = $('btn-publish');
    btn.disabled = true;
    btn.textContent = 'Se publică…';
    var payload = { cars: ovr.cars, featured: ovr.featured, updatedAt: new Date().toISOString() };
    var body = '// Managed by /admin.html — do not edit by hand.\nwindow.PK_OVERRIDES = ' + JSON.stringify(payload, null, 1) + ';\n';

    gh('/repos/' + REPO + '/contents/' + FILE)
      .then(function (r) {
        if (r.status === 401 || r.status === 403) throw new Error('Token invalid sau fără permisiuni (Contents: Read and write).');
        if (!r.ok) throw new Error('GitHub: HTTP ' + r.status);
        return r.json();
      })
      .then(function (cur) {
        return gh('/repos/' + REPO + '/contents/' + FILE, {
          method: 'PUT',
          body: JSON.stringify({
            message: 'admin: update car overrides',
            content: b64(body),
            sha: cur.sha
          })
        });
      })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (j) { throw new Error('GitHub: ' + (j.message || r.status)); });
        dirty = false;
        document.querySelectorAll('.row.dirty').forEach(function (el) { el.classList.remove('dirty'); });
        renderStats();
        btn.textContent = 'Publicat ✓';
        msg('Publicat. Site-ul se actualizează în ~1 minut (deploy Vercel).', 'ok');
        setTimeout(function () { btn.textContent = 'Publică modificările'; }, 2500);
      })
      .catch(function (e) {
        btn.disabled = false;
        btn.textContent = 'Publică modificările';
        msg(e.message, 'err');
      });
  }

  function refreshStock() {
    var btn = $('btn-refresh');
    btn.disabled = true;
    gh('/repos/' + REPO + '/actions/workflows/' + WORKFLOW + '/dispatches', {
      method: 'POST',
      body: JSON.stringify({ ref: 'main' })
    }).then(function (r) {
      btn.disabled = false;
      if (r.status === 204) msg('Pornit. Stocul se recitește de pe 999.md — site-ul se actualizează în ~3 minute.', 'ok');
      else if (r.status === 401 || r.status === 403) msg('Tokenul nu are permisiunea Actions: Read and write.', 'err');
      else msg('GitHub: HTTP ' + r.status, 'err');
    }).catch(function (e) { btn.disabled = false; msg(e.message, 'err'); });
  }

  /* ---------- boot ---------- */
  function show() {
    var has = !!token();
    $('setup').style.display = has ? 'none' : 'block';
    $('panel').style.display = has ? 'block' : 'none';
    if (has) { renderStats(); renderRows(); }
  }

  $('token-save').addEventListener('click', function () {
    var v = $('token-in').value.trim();
    if (!v) { msg('Introdu tokenul.', 'err'); return; }
    try { localStorage.setItem('pk-admin-token', v); } catch (e) {}
    show();
  });
  $('btn-logout').addEventListener('click', function () {
    try { localStorage.removeItem('pk-admin-token'); } catch (e) {}
    show();
  });
  $('btn-publish').addEventListener('click', publish);
  $('btn-refresh').addEventListener('click', refreshStock);
  $('q').addEventListener('input', function () { q = this.value; renderRows(); });

  show();
})();
