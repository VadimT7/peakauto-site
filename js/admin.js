/* PEAK AUTO admin — Supabase-backed system of record.
   Auth: Supabase email/password. Data: PostgREST (cars, settings). Photos: Storage bucket car-photos.
   Every save is live on the site within seconds — no deploys involved. */
(function () {
  'use strict';

  var SB = window.PK_SB || {};
  var CDN = 'https://i.simpalsmedia.com/999.md/BoardImages/';
  var MAX_DIM = 1400, JPEG_Q = 0.8;

  var cars = [];          // [{id, data, position}]
  var featured = [];
  var editingId = null;   // car id or '__new'
  var draft = null;
  var pendingBlobs = {};  // public URL -> Blob (photos staged in the open editor)
  var q = '', fStatus = 'all';

  var $ = function (id) { return document.getElementById(id); };

  var STATUSES = [
    ['disponibil', 'Disponibil'],
    ['rezervat', 'Rezervat'],
    ['tranzit', 'În tranzit'],
    ['vandut', 'Vândut'],
    ['ascuns', 'Ascuns (nu apare pe site)']
  ];
  var OPTS = {
    fuel: ['Benzină', 'Diesel', 'Electricitate', 'Hibrid', 'Plagin-hibrid (benzină)', 'Plagin-hibrid (diesel)', 'Gaz/Benzină'],
    box: ['Automată', 'Mecanică', 'Robotizată', 'Variator'],
    drive: ['4x4', 'Din față', 'Din spate'],
    body: ['Sedan', 'Crossover', 'SUV', 'Coupe', 'Cabriolet', 'Camionetă', 'Universal', 'Minivan', 'Hatchback'],
    wheel: ['Stânga', 'Dreapta']
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtEur(n) { return Number(n || 0).toLocaleString('ro-RO').replace(/ /g, '.') + ' €'; }
  function imgUrl(entry) {
    if (/^https?:/.test(entry)) return entry;
    if (entry.indexOf('/') !== -1) return '/' + entry;
    return CDN + '320x240/' + entry;
  }
  function msg(text, cls) {
    var m = $('msg');
    m.textContent = text;
    m.className = 'msg ' + (cls || '');
    m.style.display = 'block';
    clearTimeout(msg._t);
    msg._t = setTimeout(function () { m.style.display = 'none'; }, 6000);
  }

  /* ---------- auth ---------- */
  function sess() {
    try { return JSON.parse(localStorage.getItem('pk-adm-sess') || 'null'); } catch (e) { return null; }
  }
  function setSess(s) {
    try {
      if (s) localStorage.setItem('pk-adm-sess', JSON.stringify(s));
      else localStorage.removeItem('pk-adm-sess');
    } catch (e) {}
  }
  function login(email, pass) {
    return fetch(SB.url + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: SB.anon, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: pass })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.j.error_description || res.j.msg || 'Email sau parolă greșită.');
        setSess({ at: res.j.access_token, rt: res.j.refresh_token, exp: Date.now() + (res.j.expires_in - 60) * 1000 });
      });
  }
  function refreshSession() {
    var s = sess();
    if (!s) return Promise.reject(new Error('no session'));
    return fetch(SB.url + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: SB.anon, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.rt })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error('refresh failed');
        setSess({ at: res.j.access_token, rt: res.j.refresh_token, exp: Date.now() + (res.j.expires_in - 60) * 1000 });
      });
  }
  function authed(path, opts) {
    opts = opts || {};
    var run = function () {
      var s = sess();
      opts.headers = Object.assign({}, opts.headers || {}, {
        apikey: SB.anon,
        Authorization: 'Bearer ' + (s ? s.at : SB.anon)
      });
      return fetch(SB.url + path, opts);
    };
    var s = sess();
    var pre = (s && s.exp < Date.now()) ? refreshSession().catch(function () {}) : Promise.resolve();
    return pre.then(run).then(function (r) {
      if (r.status !== 401) return r;
      return refreshSession().then(run).catch(function () {
        setSess(null); show();
        throw new Error('Sesiune expirată — intră din nou.');
      });
    });
  }

  /* ---------- data ---------- */
  function loadAll() {
    return Promise.all([
      authed('/rest/v1/cars?select=id,data,position&order=position.asc').then(function (r) { return r.json(); }),
      authed('/rest/v1/settings?key=eq.featured&select=value').then(function (r) { return r.ok ? r.json() : []; })
    ]).then(function (res) {
      cars = res[0];
      featured = (res[1][0] && res[1][0].value) || [];
    });
  }
  function saveCarRow(id, data, position) {
    return authed('/rest/v1/cars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ id: id, data: data, position: position }])
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error('Salvare eșuată: ' + t.slice(0, 120)); });
    });
  }
  function deleteCarRow(id) {
    return authed('/rest/v1/cars?id=eq.' + encodeURIComponent(id), { method: 'DELETE' })
      .then(function (r) { if (!r.ok) throw new Error('Ștergere eșuată (' + r.status + ')'); });
  }
  function saveFeatured() {
    return authed('/rest/v1/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ key: 'featured', value: featured }])
    }).then(function (r) { if (!r.ok) throw new Error('Salvarea featured a eșuat'); });
  }
  function uploadPhoto(publicUrl, blob) {
    var path = publicUrl.split('/object/public/car-photos/')[1];
    return authed('/storage/v1/object/car-photos/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
      body: blob
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error('Upload poză eșuat: ' + t.slice(0, 100)); });
    });
  }

  /* ---------- stats + list ---------- */
  function carData(id) {
    for (var i = 0; i < cars.length; i++) if (cars[i].id === id) return cars[i];
    return null;
  }
  function renderStats() {
    var vis = 0, sold = 0, hidden = 0;
    cars.forEach(function (row) {
      var s = row.data.status || 'disponibil';
      if (s === 'ascuns') hidden++;
      else { vis++; if (s === 'vandut') sold++; }
    });
    $('stats').innerHTML =
      '<div class="stat"><b>' + cars.length + '</b><span>Total</span></div>' +
      '<div class="stat"><b>' + vis + '</b><span>Pe site</span></div>' +
      '<div class="stat"><b>' + sold + '</b><span>Vândute</span></div>' +
      '<div class="stat"><b>' + hidden + '</b><span>Ascunse</span></div>' +
      '<div class="stat"><b>' + featured.length + '</b><span>Featured ★</span></div>';
  }
  function renderRows() {
    var needle = q.toLowerCase();
    var html = cars.filter(function (row) {
      var c = row.data;
      if (fStatus !== 'all' && (c.status || 'disponibil') !== fStatus) return false;
      return !needle || ((c.name || '') + ' ' + c.year).toLowerCase().indexOf(needle) !== -1;
    }).map(function (row) {
      var c = row.data;
      var s = c.status || 'disponibil';
      var stLabel = (STATUSES.filter(function (x) { return x[0] === s; })[0] || STATUSES[0])[1].split(' (')[0];
      var starred = featured.indexOf(row.id) !== -1;
      return '<div class="row" data-id="' + esc(row.id) + '">' +
        '<img src="' + (c.images && c.images.length ? esc(imgUrl(c.images[0])) : '') + '" alt="" loading="lazy">' +
        '<div class="nm"><b>' + esc(c.name || '(fără nume)') + '</b><span>' + esc((c.year || '—') + ' · ' + Number(c.km || 0).toLocaleString('ro-RO') + ' km · ' + (c.images ? c.images.length : 0) + ' poze') + '</span><div class="price-m">' + fmtEur(c.price) + '</div></div>' +
        '<div class="price">' + fmtEur(c.price) + '</div>' +
        '<div class="stc"><span class="st-pill st-' + s + '"><i></i>' + stLabel + '</span></div>' +
        '<div class="racts">' +
          '<button class="act-star' + (starred ? ' on' : '') + '" data-act="star" title="' + (starred ? 'În prim-plan pe site — apasă ca să scoți' : 'Pune în prim-plan pe site') + '">★</button>' +
          '<button class="act-edit" data-act="edit">Editează</button>' +
          '<button class="act-del" data-act="del" title="Șterge">✕</button>' +
        '</div>' +
        '</div>';
    }).join('');
    $('rows').innerHTML = html || '<p style="color:rgba(244,241,236,.5);padding:30px 0">Niciun rezultat.</p>';
    var rowsEls = $('rows').querySelectorAll('.row');
    for (var ri = 0; ri < rowsEls.length; ri++) rowsEls[ri].style.animationDelay = Math.min(ri, 12) * 28 + 'ms';

    $('rows').querySelectorAll('.row').forEach(function (rowEl) {
      var id = rowEl.getAttribute('data-id');
      rowEl.querySelector('[data-act="edit"]').addEventListener('click', function () { openEditor(id); });
      rowEl.querySelector('[data-act="star"]').addEventListener('click', function () {
        var btn = this;
        var i = featured.indexOf(id);
        if (i === -1) {
          if (featured.length >= 6) { msg('Maxim 6 mașini featured.', 'err'); return; }
          featured.push(id);
        } else featured.splice(i, 1);
        var on = featured.indexOf(id) !== -1;
        btn.classList.toggle('on', on);
        btn.title = on ? 'În prim-plan pe site — apasă ca să scoți' : 'Pune în prim-plan pe site';
        saveFeatured().then(function () {
          renderStats();
          msg(on ? 'Adăugat în prim-plan — live pe site.' : 'Scos din prim-plan — live pe site.', 'ok');
        }).catch(function (e) {
          // revert on failure
          var j = featured.indexOf(id);
          if (on && j !== -1) featured.splice(j, 1); else if (!on && j === -1) featured.push(id);
          btn.classList.toggle('on', !on);
          msg(e.message, 'err');
        });
      });
      rowEl.querySelector('[data-act="del"]').addEventListener('click', function () {
        var c = carData(id).data;
        if (!confirm('Ștergi definitiv „' + (c.name || id) + '"?\n(Dacă vrei doar să dispară de pe site, folosește statusul „Ascuns".)')) return;
        rowEl.classList.add('saving');
        deleteCarRow(id).then(function () {
          cars = cars.filter(function (x) { return x.id !== id; });
          var fi = featured.indexOf(id);
          var p = fi !== -1 ? (featured.splice(fi, 1), saveFeatured()) : Promise.resolve();
          return p;
        }).then(function () {
          if (editingId === id) closeEditor();
          renderStats(); renderRows();
          msg('Șters. Live pe site.', 'ok');
        }).catch(function (e) { rowEl.classList.remove('saving'); msg(e.message, 'err'); });
      });
    });
  }

  /* ---------- editor ---------- */
  function fld(label, key, type, opts) {
    var v = draft[key];
    if (opts) {
      var found = v && opts.indexOf(v) !== -1;
      return '<div class="fld"><label>' + label + '</label><select data-k="' + key + '">' +
        '<option value=""' + (!v ? ' selected' : '') + '>—</option>' +
        opts.map(function (o) { return '<option value="' + esc(o) + '"' + (v === o ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') +
        (v && !found ? '<option value="' + esc(v) + '" selected>' + esc(v) + '</option>' : '') +
        '</select></div>';
    }
    return '<div class="fld"><label>' + label + '</label><input data-k="' + key + '" type="' + (type || 'text') + '" value="' + esc(v == null ? '' : v) + '"></div>';
  }

  function openEditor(id) {
    editingId = id;
    pendingBlobs = {};
    if (id === '__new') {
      draft = { id: 'a' + Date.now().toString(36), make: '', model: '', name: '', gen: '', year: new Date().getFullYear(),
        price: null, km: 0, power: null, engine: '', fuel: '', box: '', drive: '', body: '', seats: '5', doors: '5',
        wheel: 'Stânga', vin: '', reg: '', origin: '', status: 'disponibil', prose: '', equip: [], images: [] };
    } else {
      draft = JSON.parse(JSON.stringify(carData(id).data));
    }
    renderEditor();
    $('editor-host').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function closeEditor() {
    Object.keys(pendingBlobs).forEach(function (u) { delete pendingBlobs[u]; });
    editingId = null; draft = null;
    $('editor-host').innerHTML = '';
  }

  function renderEditor() {
    var isNew = editingId === '__new';
    $('editor-host').innerHTML =
      '<div class="ed">' +
        '<div class="ed-head"><h2>' + (isNew ? 'Automobil nou' : 'Editezi: ' + esc(draft.name || draft.id)) + '</h2>' +
        '<span style="font-size:11px;color:rgba(244,241,236,.35);letter-spacing:.1em">ID ' + esc(draft.id) + '</span></div>' +
        '<div class="ed-grid">' +
          fld('Marcă *', 'make') + fld('Model *', 'model') + fld('Generație', 'gen') +
          fld('An *', 'year', 'number') + fld('Preț EUR *', 'price', 'number') + fld('Rulaj km', 'km', 'number') +
          fld('Putere CP', 'power', 'number') + fld('Motor (ex: 3.0 l)', 'engine') +
          fld('Combustibil', 'fuel', null, OPTS.fuel) + fld('Cutie', 'box', null, OPTS.box) +
          fld('Tracțiune', 'drive', null, OPTS.drive) + fld('Caroserie', 'body', null, OPTS.body) +
          fld('Locuri', 'seats') + fld('Uși', 'doors') + fld('Volan', 'wheel', null, OPTS.wheel) +
          fld('VIN', 'vin') + fld('Înmatriculare', 'reg') + fld('Origine', 'origin') +
          '<div class="fld"><label>Status</label><select data-k="status">' + STATUSES.map(function (s) {
            return '<option value="' + s[0] + '"' + ((draft.status || 'disponibil') === s[0] ? ' selected' : '') + '>' + s[1] + '</option>';
          }).join('') + '</select></div>' +
        '</div>' +
        '<div class="ed-wide"><label>Descriere</label><textarea data-k="prose">' + esc(draft.prose || '') + '</textarea></div>' +
        '<div class="ed-wide"><label>Dotări (una pe linie)</label><textarea data-k="equip">' + esc((draft.equip || []).join('\n')) + '</textarea>' +
        '<div class="ed-note">Apar în secțiunea „Dotări" pe pagina mașinii.</div></div>' +
        '<div class="ph-head"><label>Poze (' + (draft.images || []).length + ') — prima e coperta</label></div>' +
        '<div class="ph-grid" id="ph-grid">' + phGridHtml() + '</div>' +
        '<div class="ed-foot">' +
          '<button class="btn red" id="ed-save">Salvează pe site</button>' +
          '<button class="btn" id="ed-cancel">Renunță</button>' +
        '</div>' +
      '</div>';

    $('editor-host').querySelectorAll('[data-k]').forEach(function (el) {
      el.addEventListener('input', function () {
        var k = el.getAttribute('data-k'), v = el.value;
        if (k === 'equip') draft.equip = v.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        else if (el.type === 'number') draft[k] = v === '' ? null : +v;
        else draft[k] = v;
      });
    });
    bindPhotoGrid();
    $('ed-save').addEventListener('click', saveDraft);
    $('ed-cancel').addEventListener('click', closeEditor);
  }

  function phGridHtml() {
    return (draft.images || []).map(function (im, i) {
      return '<div class="ph' + (pendingBlobs[im] ? ' pending' : '') + '" data-i="' + i + '">' +
        '<img src="' + esc(pendingBlobs[im] ? pendingBlobs[im].preview : imgUrl(im)) + '" alt="" loading="lazy">' +
        (i === 0 ? '<span class="cover-tag">Copertă</span>' : '') +
        '<div class="tools">' +
          '<button data-ph="left" title="Mută în stânga">←</button>' +
          '<button data-ph="cover" title="Fă copertă">★</button>' +
          '<button data-ph="del" title="Șterge">✕</button>' +
          '<button data-ph="right" title="Mută în dreapta">→</button>' +
        '</div>' +
        '</div>';
    }).join('') +
    '<div class="ph-add" id="ph-add"><b>+</b>Adaugă poze</div>';
  }
  function refreshPhotoGrid() {
    $('ph-grid').innerHTML = phGridHtml();
    bindPhotoGrid();
    var lbl = $('editor-host').querySelector('.ph-head label');
    if (lbl) lbl.textContent = 'Poze (' + (draft.images || []).length + ') — prima e coperta';
  }
  function bindPhotoGrid() {
    $('ph-add').addEventListener('click', function () { $('file-in').click(); });
    $('ph-grid').querySelectorAll('.ph').forEach(function (ph) {
      var i = +ph.getAttribute('data-i');
      ph.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          var act = b.getAttribute('data-ph');
          var ims = draft.images;
          if (act === 'del') { var rm = ims.splice(i, 1)[0]; delete pendingBlobs[rm]; }
          else if (act === 'cover') { ims.unshift(ims.splice(i, 1)[0]); }
          else if (act === 'left' && i > 0) { ims.splice(i - 1, 0, ims.splice(i, 1)[0]); }
          else if (act === 'right' && i < ims.length - 1) { ims.splice(i + 1, 0, ims.splice(i, 1)[0]); }
          refreshPhotoGrid();
        });
      });
    });
  }

  /* photo intake: resize in browser, stage Blob + preview; upload happens on save */
  function handleFiles(files) {
    var list = [].slice.call(files);
    if (!list.length || !draft) return;
    msg('Se procesează ' + list.length + ' poze…');
    var done = 0;
    list.forEach(function (file, idx) {
      var fr = new FileReader();
      fr.onload = function () {
        var img = new Image();
        img.onload = function () {
          var k = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
          var cv = document.createElement('canvas');
          cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          cv.toBlob(function (blob) {
            var name = Date.now().toString(36) + '-' + idx + '.jpg';
            var publicUrl = SB.url + '/storage/v1/object/public/car-photos/' + draft.id + '/' + name;
            blob.preview = URL.createObjectURL(blob);
            pendingBlobs[publicUrl] = blob;
            draft.images.push(publicUrl);
            done++;
            if (done === list.length) { refreshPhotoGrid(); msg(list.length + ' poze pregătite — apasă „Salvează pe site".', 'ok'); }
          }, 'image/jpeg', JPEG_Q);
        };
        img.onerror = function () { done++; msg('O poză nu a putut fi citită.', 'err'); };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  function saveDraft() {
    if (!draft.make || !draft.model) { msg('Completează marca și modelul.', 'err'); return; }
    if (!draft.year || !draft.price) { msg('Completează anul și prețul.', 'err'); return; }
    draft.name = (draft.make + ' ' + draft.model).trim();
    var btn = $('ed-save');
    btn.disabled = true;

    var uploads = Object.keys(pendingBlobs).filter(function (u) { return draft.images.indexOf(u) !== -1; });
    var chain = Promise.resolve();
    uploads.forEach(function (u, n) {
      chain = chain.then(function () {
        btn.textContent = 'Poze ' + (n + 1) + '/' + uploads.length + '…';
        return uploadPhoto(u, pendingBlobs[u]);
      });
    });

    var isNew = editingId === '__new';
    var position;
    if (isNew) {
      position = cars.length ? Math.min.apply(null, cars.map(function (r) { return r.position; })) - 1 : 0;
    } else {
      position = carData(draft.id) ? carData(draft.id).position : 0;
    }

    chain.then(function () {
      btn.textContent = 'Se salvează…';
      return saveCarRow(draft.id, draft, position);
    }).then(function () {
      if (isNew) cars.unshift({ id: draft.id, data: draft, position: position });
      else carData(draft.id).data = draft;
      closeEditor();
      renderStats(); renderRows();
      msg('Salvat — live pe site în câteva secunde.', 'ok');
    }).catch(function (e) {
      btn.disabled = false;
      btn.textContent = 'Salvează pe site';
      msg(e.message, 'err');
    });
  }

  /* ---------- boot ---------- */
  function show() {
    var logged = !!sess();
    $('login').style.display = logged ? 'none' : 'block';
    $('panel').style.display = logged ? 'block' : 'none';
    $('btn-add').style.display = logged ? '' : 'none';
    $('live-dot').style.display = logged ? '' : 'none';
    if (logged) {
      loadAll().then(function () { renderStats(); renderRows(); })
        .catch(function (e) { msg('Nu s-au putut încărca datele: ' + e.message, 'err'); });
    }
  }

  $('l-go').addEventListener('click', doLogin);
  $('l-pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
  function doLogin() {
    var err = $('l-err');
    err.style.display = 'none';
    $('l-go').disabled = true;
    login($('l-email').value.trim(), $('l-pass').value)
      .then(function () { $('l-go').disabled = false; show(); })
      .catch(function (e) {
        $('l-go').disabled = false;
        err.textContent = e.message;
        err.style.display = 'block';
      });
  }
  $('btn-logout').addEventListener('click', function () { setSess(null); show(); });
  $('btn-add').addEventListener('click', function () { openEditor('__new'); });
  $('q').addEventListener('input', function () { q = this.value; renderRows(); });
  $('f-status').addEventListener('change', function () { fStatus = this.value; renderRows(); });
  $('file-in').addEventListener('change', function () { handleFiles(this.files); this.value = ''; });
  window.addEventListener('beforeunload', function (e) {
    if (editingId) { e.preventDefault(); e.returnValue = ''; }
  });

  show();
})();
