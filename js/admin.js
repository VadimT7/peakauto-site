/* PEAK AUTO admin — the system of record. Edits data/inventory.js + uploads photos
   to the GitHub repo in ONE batch commit (Git Data API); Vercel redeploys on push. */
(function () {
  'use strict';

  var REPO = 'VadimT7/peakauto-site';
  var FILE = 'data/inventory.js';
  var API = 'https://api.github.com';
  var CDN = 'https://i.simpalsmedia.com/999.md/BoardImages/';
  var MAX_DIM = 1400, JPEG_Q = 0.8;

  var base = window.PK_INVENTORY || { cars: [], featured: [] };
  var inv = JSON.parse(JSON.stringify({ cars: base.cars || [], featured: base.featured || [] }));
  var pending = {};        // repo path -> base64 (photos staged for upload)
  var dirty = false;
  var dirtyIds = {};
  var newIds = {};
  var editingId = null;    // car id being edited, or '__new'
  var draft = null;        // working copy inside the editor
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

  function token() { try { return localStorage.getItem('pk-admin-token') || ''; } catch (e) { return ''; } }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtEur(n) { return Number(n || 0).toLocaleString('ro-RO').replace(/ /g, '.') + ' €'; }
  function imgUrl(entry) {
    if (pending[entry]) return 'data:image/jpeg;base64,' + pending[entry];
    return entry.indexOf('/') !== -1 ? '/' + entry : CDN + '320x240/' + entry;
  }
  function msg(text, cls) {
    var m = $('msg');
    m.textContent = text;
    m.className = 'msg ' + (cls || '');
    m.style.display = 'block';
    clearTimeout(msg._t);
    msg._t = setTimeout(function () { m.style.display = 'none'; }, 6000);
  }
  function markDirty(id) {
    dirty = true;
    if (id) dirtyIds[id] = 1;
    $('btn-publish').disabled = false;
    renderStats();
  }
  function carById(id) {
    for (var i = 0; i < inv.cars.length; i++) if (inv.cars[i].id === id) return inv.cars[i];
    return null;
  }

  /* ---------- stats + list ---------- */
  function renderStats() {
    var vis = 0, sold = 0, hidden = 0;
    inv.cars.forEach(function (c) {
      var s = c.status || 'disponibil';
      if (s === 'ascuns') hidden++;
      else { vis++; if (s === 'vandut') sold++; }
    });
    $('stats').innerHTML =
      '<div class="stat"><b>' + inv.cars.length + '</b><span>Total</span></div>' +
      '<div class="stat"><b>' + vis + '</b><span>Pe site</span></div>' +
      '<div class="stat"><b>' + sold + '</b><span>Vândute</span></div>' +
      '<div class="stat"><b>' + hidden + '</b><span>Ascunse</span></div>' +
      '<div class="stat"><b>' + inv.featured.length + '</b><span>Featured ★</span></div>' +
      '<div class="stat"><b>' + Object.keys(pending).length + '</b><span>Poze noi</span></div>' +
      '<div class="stat"><b>' + (dirty ? 'DA' : 'nu') + '</b><span>Nepublicat</span></div>';
  }

  function renderRows() {
    var needle = q.toLowerCase();
    var html = inv.cars.filter(function (c) {
      if (fStatus !== 'all' && (c.status || 'disponibil') !== fStatus) return false;
      return !needle || ((c.name || '') + ' ' + c.year).toLowerCase().indexOf(needle) !== -1;
    }).map(function (c) {
      var s = c.status || 'disponibil';
      var stLabel = (STATUSES.filter(function (x) { return x[0] === s; })[0] || STATUSES[0])[1].split(' (')[0];
      var starred = inv.featured.indexOf(c.id) !== -1;
      return '<div class="row' + (dirtyIds[c.id] ? ' dirty' : '') + (newIds[c.id] ? ' is-new' : '') + '" data-id="' + esc(c.id) + '">' +
        '<img src="' + (c.images && c.images.length ? esc(imgUrl(c.images[0])) : '') + '" alt="" loading="lazy">' +
        '<div class="nm"><b>' + esc(c.name || '(fără nume)') + '</b><span>' + esc((c.year || '—') + ' · ' + Number(c.km || 0).toLocaleString('ro-RO') + ' km · ' + (c.images ? c.images.length : 0) + ' poze') + '</span></div>' +
        '<div class="price">' + fmtEur(c.price) + '</div>' +
        '<div class="stc"><span class="st-pill st-' + s + '"><i></i>' + stLabel + '</span></div>' +
        '<div class="stars"><span class="rstar' + (starred ? ' on' : '') + '">★</span></div>' +
        '<div class="racts">' +
          '<button data-act="edit">Editează</button>' +
          '<button data-act="star" title="În prim-plan">★</button>' +
          '<button data-act="del" title="Șterge">✕</button>' +
        '</div>' +
        '</div>';
    }).join('');
    $('rows').innerHTML = html || '<p style="color:rgba(244,241,236,.5);padding:30px 0">Niciun rezultat.</p>';

    $('rows').querySelectorAll('.row').forEach(function (row) {
      var id = row.getAttribute('data-id');
      row.querySelector('[data-act="edit"]').addEventListener('click', function () { openEditor(id); });
      row.querySelector('[data-act="star"]').addEventListener('click', function () {
        var i = inv.featured.indexOf(id);
        if (i === -1) {
          if (inv.featured.length >= 6) { msg('Maxim 6 mașini featured.', 'err'); return; }
          inv.featured.push(id);
        } else inv.featured.splice(i, 1);
        markDirty(id);
        renderRows();
      });
      row.querySelector('[data-act="del"]').addEventListener('click', function () {
        var c = carById(id);
        if (!confirm('Ștergi definitiv „' + (c.name || id) + '" din inventar?\n(Dacă vrei doar să dispară de pe site, folosește statusul „Ascuns".)')) return;
        inv.cars = inv.cars.filter(function (x) { return x.id !== id; });
        inv.featured = inv.featured.filter(function (x) { return x !== id; });
        (c.images || []).forEach(function (im) { delete pending[im]; });
        if (editingId === id) closeEditor();
        markDirty();
        renderRows();
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
    if (id === '__new') {
      draft = { id: 'a' + Date.now().toString(36), make: '', model: '', name: '', gen: '', year: new Date().getFullYear(),
        price: null, km: 0, power: null, engine: '', fuel: '', box: '', drive: '', body: '', seats: '5', doors: '5',
        wheel: 'Stânga', vin: '', reg: '', origin: '', status: 'disponibil', prose: '', equip: [], images: [] };
    } else {
      draft = JSON.parse(JSON.stringify(carById(id)));
    }
    renderEditor();
    $('editor-host').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeEditor() {
    // drop pending photos that only the abandoned draft referenced
    if (draft && editingId === '__new') {
      (draft.images || []).forEach(function (im) { delete pending[im]; });
    }
    editingId = null;
    draft = null;
    $('editor-host').innerHTML = '';
    renderStats();
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
          '<button class="btn red" id="ed-save">Salvează în listă</button>' +
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
      return '<div class="ph' + (pending[im] ? ' pending' : '') + '" data-i="' + i + '">' +
        '<img src="' + esc(imgUrl(im)) + '" alt="" loading="lazy">' +
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
          if (act === 'del') { var rm = ims.splice(i, 1)[0]; delete pending[rm]; }
          else if (act === 'cover') { ims.unshift(ims.splice(i, 1)[0]); }
          else if (act === 'left' && i > 0) { ims.splice(i - 1, 0, ims.splice(i, 1)[0]); }
          else if (act === 'right' && i < ims.length - 1) { ims.splice(i + 1, 0, ims.splice(i, 1)[0]); }
          refreshPhotoGrid();
        });
      });
    });
  }

  /* photo intake: resize to <=1400px JPEG in the browser, stage as base64 */
  function handleFiles(files) {
    var list = [].slice.call(files);
    if (!list.length) return;
    msg('Se procesează ' + list.length + ' poze…');
    var done = 0;
    list.forEach(function (file, idx) {
      var fr = new FileReader();
      fr.onload = function () {
        var img = new Image();
        img.onload = function () {
          var w = img.width, h = img.height;
          var k = Math.min(1, MAX_DIM / Math.max(w, h));
          var cv = document.createElement('canvas');
          cv.width = Math.round(w * k); cv.height = Math.round(h * k);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          var b64 = cv.toDataURL('image/jpeg', JPEG_Q).split(',')[1];
          var path = 'assets/cars/' + draft.id + '/' + Date.now().toString(36) + '-' + idx + '.jpg';
          pending[path] = b64;
          draft.images.push(path);
          done++;
          if (done === list.length) { refreshPhotoGrid(); renderStats(); msg(list.length + ' poze adăugate. Nu uita „Salvează în listă" apoi „Publică pe site".', 'ok'); }
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
    if (!draft.images.length) msg('Atenție: mașina nu are nicio poză.', 'err');
    var isNew = editingId === '__new';
    if (isNew) {
      inv.cars.unshift(draft);
      newIds[draft.id] = 1;
    } else {
      for (var i = 0; i < inv.cars.length; i++) if (inv.cars[i].id === draft.id) inv.cars[i] = draft;
    }
    markDirty(draft.id);
    editingId = null; draft = null;
    $('editor-host').innerHTML = '';
    renderRows();
    msg('Salvat în listă. Apasă „Publică pe site" când ești gata.', 'ok');
  }

  /* ---------- publish: one batch commit via Git Data API ---------- */
  function gh(path, opts) {
    opts = opts || {};
    opts.headers = {
      'Authorization': 'Bearer ' + token(),
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    return fetch(API + path, opts).then(function (r) {
      if (r.status === 401 || r.status === 403) throw new Error('Token invalid sau fără permisiunea Contents: Read and write.');
      if (!r.ok && r.status !== 409) return r.json().catch(function () { return {}; }).then(function (j) {
        throw new Error('GitHub: ' + (j.message || ('HTTP ' + r.status)));
      });
      return r.json();
    });
  }

  function inventorySource() {
    var payload = { cars: inv.cars, featured: inv.featured, updatedAt: new Date().toISOString() };
    return '// Managed by /admin.html — do not edit by hand.\nwindow.PK_INVENTORY = ' + JSON.stringify(payload) + ';\n';
  }

  function publish() {
    if (editingId) { msg('Ai un automobil deschis în editor — apasă întâi „Salvează în listă" sau „Renunță".', 'err'); return; }
    var btn = $('btn-publish');
    btn.disabled = true;
    btn.textContent = 'Se publică…';

    // only upload photos still referenced by the inventory
    var referenced = {};
    inv.cars.forEach(function (c) { (c.images || []).forEach(function (im) { referenced[im] = 1; }); });
    var uploads = Object.keys(pending).filter(function (p) { return referenced[p]; });

    var headSha, treeItems = [];
    gh('/repos/' + REPO + '/git/ref/heads/main')
      .then(function (ref) {
        headSha = ref.object.sha;
        var chain = Promise.resolve();
        uploads.forEach(function (path, n) {
          chain = chain.then(function () {
            btn.textContent = 'Poze ' + (n + 1) + '/' + uploads.length + '…';
            return gh('/repos/' + REPO + '/git/blobs', {
              method: 'POST',
              body: JSON.stringify({ content: pending[path], encoding: 'base64' })
            }).then(function (b) { treeItems.push({ path: path, mode: '100644', type: 'blob', sha: b.sha }); });
          });
        });
        return chain;
      })
      .then(function () {
        btn.textContent = 'Se salvează…';
        return gh('/repos/' + REPO + '/git/blobs', {
          method: 'POST',
          body: JSON.stringify({ content: inventorySource(), encoding: 'utf-8' })
        });
      })
      .then(function (b) {
        treeItems.push({ path: FILE, mode: '100644', type: 'blob', sha: b.sha });
        return gh('/repos/' + REPO + '/git/trees', {
          method: 'POST',
          body: JSON.stringify({ base_tree: headSha, tree: treeItems })
        });
      })
      .then(function (tree) {
        var n = inv.cars.length;
        return gh('/repos/' + REPO + '/git/commits', {
          method: 'POST',
          body: JSON.stringify({
            message: 'admin: update inventory (' + n + ' cars' + (uploads.length ? ', +' + uploads.length + ' photos' : '') + ')',
            tree: tree.sha,
            parents: [headSha]
          })
        });
      })
      .then(function (commit) {
        return gh('/repos/' + REPO + '/git/refs/heads/main', {
          method: 'PATCH',
          body: JSON.stringify({ sha: commit.sha })
        });
      })
      .then(function () {
        uploads.forEach(function (p) { delete pending[p]; });
        dirty = false; dirtyIds = {}; newIds = {};
        renderStats(); renderRows();
        btn.textContent = 'Publicat ✓';
        msg('Publicat. Site-ul se actualizează în ~1 minut.', 'ok');
        setTimeout(function () { btn.textContent = 'Publică pe site'; btn.disabled = true; }, 2600);
      })
      .catch(function (e) {
        btn.disabled = false;
        btn.textContent = 'Publică pe site';
        msg(e.message, 'err');
      });
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
  $('btn-add').addEventListener('click', function () { openEditor('__new'); });
  $('btn-publish').addEventListener('click', publish);
  $('q').addEventListener('input', function () { q = this.value; renderRows(); });
  $('f-status').addEventListener('change', function () { fStatus = this.value; renderRows(); });
  $('file-in').addEventListener('change', function () { handleFiles(this.files); this.value = ''; });
  window.addEventListener('beforeunload', function (e) {
    if (dirty || Object.keys(pending).length) { e.preventDefault(); e.returnValue = ''; }
  });

  show();
})();
