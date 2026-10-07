// Search of the static wiki: titles from search-index.js (loaded on first use).
(function () {
  var root = document.body.getAttribute('data-root') || '';
  var index = null, waiting = [];
  function load(cb) {
    if (index) return cb();
    waiting.push(cb);
    if (waiting.length > 1) return;
    var s = document.createElement('script');
    s.src = root + 'assets/search-index.js';
    s.onload = function () { index = window.LOVE_SEARCH || []; waiting.splice(0).forEach(function (f) { f(); }); };
    document.head.appendChild(s);
  }
  function norm(s) { return s.toLowerCase().replace(/[_\s]+/g, ' '); }
  function search(q, limit, withText) {
    q = norm(q.trim());
    if (!q) return [];
    var cyr = /[Ѐ-ӿ]/.test(q), out = [];
    for (var i = 0; i < index.length; i++) {
      var e = index[i], t = norm(e[0]), score;
      if (t === q) score = 0;
      else if (t.indexOf(q) === 0) score = 1;
      else if (t.slice(-q.length - 1) === '.' + q || t.slice(-q.length - 1) === ':' + q) score = 1.5;
      else if (t.indexOf('.' + q) >= 0 || t.indexOf(':' + q) >= 0 || t.indexOf(' ' + q) >= 0) score = 2;
      else if (t.indexOf(q) >= 0) score = 3;
      else if (withText && e[2] && norm(e[2]).indexOf(q) >= 0) score = 5;
      else continue;
      if (e[3] && !cyr) score += 0.5;  // translations after English unless the query is Cyrillic
      if (e[4]) score += 0.25;         // redirects after pages
      out.push([score, t.length, e]);
    }
    out.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1] || (a[2][0] < b[2][0] ? -1 : 1); });
    return out.slice(0, limit).map(function (x) { return x[2]; });
  }
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    return e;
  }
  function item(e) { return el('a', { href: root + e[1] }, e[0]); }

  var input = document.getElementById('searchInput');
  if (input) {
    var list = el('ul', { id: 'search-suggest' }), sel = -1, results = [];
    list.style.display = 'none';
    input.parentNode.appendChild(list);
    function show() {
      results = search(input.value, 15, false);
      list.innerHTML = ''; sel = -1;
      results.forEach(function (e) { var li = el('li', {}); li.appendChild(item(e)); list.appendChild(li); });
      list.style.display = results.length ? '' : 'none';
    }
    function mark() {
      var links = list.getElementsByTagName('a');
      for (var i = 0; i < links.length; i++) links[i].className = i === sel ? 'sel' : '';
    }
    input.addEventListener('focus', function () { load(function () {}); });
    input.addEventListener('input', function () { load(show); });
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        if (!results.length) return;
        sel = (sel + (ev.key === 'ArrowDown' ? 1 : results.length)) % (results.length + 1);
        if (sel === results.length) sel = -1;
        mark(); ev.preventDefault();
      } else if (ev.key === 'Enter' && index) {
        var e = sel >= 0 ? results[sel] : results[0];
        if (e && (sel >= 0 || norm(e[0]) === norm(input.value.trim()))) {
          location.href = root + e[1]; ev.preventDefault();
        }
      } else if (ev.key === 'Escape') {
        list.style.display = 'none';
      }
    });
    document.addEventListener('click', function (ev) { if (ev.target !== input) list.style.display = 'none'; });
  }

  var box = document.getElementById('search-results');
  if (box) {
    var q = new URLSearchParams(location.search).get('q') || '';
    if (input) input.value = q;
    document.title = (q ? q + ' - ' : '') + document.title;
    load(function () {
      var found = search(q, 500, true);
      box.innerHTML = '';
      box.appendChild(el('p', {}, found.length ? 'Pages matching "' + q + '": ' + found.length + (found.length === 500 ? '+' : '')
                                               : q ? 'No pages match "' + q + '".' : 'Type a page name into the search box.'));
      var ul = el('ul', {});
      found.forEach(function (e) {
        var li = el('li', {});
        li.appendChild(item(e));
        if (e[2]) li.appendChild(el('div', { 'class': 'desc' }, e[2]));
        ul.appendChild(li);
      });
      box.appendChild(ul);
    });
  }
})();
