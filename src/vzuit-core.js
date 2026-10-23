/* vzUit 运行时：core 段
   只依赖 DOM，不碰任何站点接口，跨站可以直接单引。
   site 段（登录、验证码、公告、打赏、内容注入）留在各站自己的脚本里，不进本文件。

   本文件分五节：
     HTML 转义与轻量 Markdown
     时间格式化
     加载圈
     弹窗
     页眉页脚外壳

   用法：
     <link rel="stylesheet" href="vzuit.css">
     <script src="vzuit-core.js"></script>
     之后用 window.VZCore.escapeHtml(...) 这类形式调用。
   样式：弹窗、加载圈、外壳的类名都由 vzuit.css 提供，缺了它只会出来裸 DOM。

   从 CF_vzs 的 public/vzuit.js 搬来，函数体逐字保留，行为与源头站一致。
   源头站仍用自己那份，切换按站逐个做，不做批量替换。
*/
(function (w) {
  'use strict';

  /* HTML 转义与轻量 Markdown */

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      if (m === '"') return '&quot;';
      if (m === "'") return '&#39;';
      return m;
    });
  }

  /* 行内 Markdown：先整体转义，链接另加协议白名单，杜绝 javascript: 这类注入 */
  function inlineMd(t) {
    var bt = String.fromCharCode(96);
    var s = escapeHtml(t);
    s = s.replace(/\[(.*?)\]\((.*?)\)/g, function (m, txt, url) {
      if (!/^(https?:|mailto:|\/|#|\.)/i.test(url.trim())) return txt;
      return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + txt + '</a>';
    });
    return s
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/~~(.*?)~~/g, '<s>$1</s>')
      .replace(new RegExp(bt + '(.*?)' + bt, 'g'), '<code>$1</code>');
  }

  /* 内容里是否含 Markdown 语法：纯文本直接原样显示，避免行首 * - # 被误渲染 */
  function hasMarkdownSyntax(text) {
    if (!text) return false;
    return /(?:^|\n)\s{0,3}(?:#{1,6}\s|[*+-]\s|\d+\.\s|>|\s*```)/.test(text)
      || /\*\*[^*\n]+\*\*|__[^_\n]+__/.test(text)
      || /`[^`\n]+`/.test(text)
      || /\[[^\]]+\]\([^)]+\)/.test(text)
      || /(?:^|\n)\s*\|[^|\n]+\|/.test(text);
  }

  /* 块级 Markdown：标题、引用、列表、代码块，够博客正文用 */
  function simpleMd(t) {
    var bt = String.fromCharCode(96), tb = bt + bt + bt;
    var L = String(t).split('\n'), h = '', cb = false, cc = '', il = false, lc = '';
    for (var i = 0; i < L.length; i++) {
      var l = L[i];
      if (l.trim().indexOf(tb) === 0) {
        if (cb) { h += '<pre><code>' + escapeHtml(cc) + '</code></pre>'; cc = ''; cb = false; } else { cb = true; }
        continue;
      }
      if (cb) { cc += l + '\n'; continue; }
      if (il && l.indexOf('- ') !== 0 && l.indexOf('* ') !== 0 && !/^\d+\.\s/.test(l)) {
        h += lc + (lc.indexOf('<ol>') === 0 ? '</ol>' : '</ul>'); il = false; lc = '';
      }
      if (l.indexOf('# ') === 0) { h += '<h1>' + inlineMd(l.substring(2)) + '</h1>'; continue; }
      if (l.indexOf('## ') === 0) { h += '<h2>' + inlineMd(l.substring(3)) + '</h2>'; continue; }
      if (l.indexOf('### ') === 0) { h += '<h3>' + inlineMd(l.substring(4)) + '</h3>'; continue; }
      if (l.indexOf('> ') === 0) { h += '<blockquote>' + inlineMd(l.substring(2)) + '</blockquote>'; continue; }
      if (l.indexOf('- ') === 0 || l.indexOf('* ') === 0) {
        if (!il) { il = true; lc = '<ul>'; }
        lc += '<li>' + inlineMd(l.substring(2)) + '</li>';
        continue;
      }
      if (/^\d+\.\s/.test(l)) {
        if (!il) { il = true; lc = '<ol>'; }
        lc += '<li>' + inlineMd(l.replace(/^\d+\.\s/, '')) + '</li>';
        continue;
      }
      if (l.trim() === '') { h += '<br>'; continue; }
      h += '<p>' + inlineMd(l) + '</p>';
    }
    if (il) h += lc + (lc.indexOf('<ol>') === 0 ? '</ol>' : '</ul>');
    if (cb) h += '<pre><code>' + escapeHtml(cc) + '</code></pre>';
    return h;
  }

  /* 时间格式化：库里存的是 UTC 文本，统一按东八区展示 */

  function formatDate(dateStr) {
    try {
      var utcStr = String(dateStr).replace(' ', 'T');
      if (utcStr.indexOf('Z') === -1 && utcStr.indexOf('+') === -1) utcStr += 'Z';
      var d = new Date(utcStr);
      return d.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  }

  /* 加载圈 */

  var loadingEl = null;

  function showLoading() {
    if (!loadingEl) {
      loadingEl = document.createElement('div');
      loadingEl.className = 'loading-overlay hidden';
      loadingEl.innerHTML = '<div class="loading-spinner"></div>';
      document.body.appendChild(loadingEl);
    }
    loadingEl.classList.remove('hidden');
  }

  function hideLoading() {
    if (loadingEl) loadingEl.classList.add('hidden');
  }

  /* 弹窗：插入后等下一帧再加 .show，同一帧加类会被合并进初始态、动画不触发 */

  var modalSeq = 0;
  var MODAL_MS = 280;   /* 与 vzuit.css 里 .vz-modal-overlay 的 opacity 过渡时长一致 */

  function modalOpen(overlay) {
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('show'); });
  }

  /* 先摘 .show 播退场，transitionend 或兜底超时后再移除；done 用于 resolve 调用方 Promise */
  function modalClose(overlay, done) {
    overlay.classList.remove('show');
    var settled = false;
    function finish() {
      if (settled) return;
      settled = true;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (typeof done === 'function') done();
    }
    overlay.addEventListener('transitionend', function (e) {
      if (e.target === overlay && e.propertyName === 'opacity') finish();
    });
    setTimeout(finish, MODAL_MS + 80);
  }

  function VZAlert(msg, opts) {
    var o = opts || {};
    var title = o.title || '提示';
    var okText = o.okText || '确定';
    return new Promise(function (resolve) {
      var id = 'vzModal' + (++modalSeq);
      var overlay = document.createElement('div');
      overlay.className = 'vz-modal-overlay';
      overlay.innerHTML = '<div class="vz-modal"><div class="vz-modal-title">' + escapeHtml(title) +
        '</div><div class="vz-modal-body">' + escapeHtml(msg) +
        '</div><div class="vz-modal-actions"><button class="vz-modal-btn primary" id="' + id +
        'Ok">' + escapeHtml(okText) + '</button></div></div>';
      overlay.querySelector('#' + id + 'Ok').onclick = function () { modalClose(overlay, resolve); };
      overlay.addEventListener('click', function (e) { if (e.target === overlay) modalClose(overlay, resolve); });
      modalOpen(overlay);
    });
  }

  function VZConfirm(msg, opts) {
    var o = opts || {};
    var title = o.title || '确认';
    var okText = o.okText || '确定';
    var cancelText = o.cancelText || '取消';
    return new Promise(function (resolve) {
      var id = 'vzModal' + (++modalSeq);
      var overlay = document.createElement('div');
      overlay.className = 'vz-modal-overlay';
      overlay.innerHTML = '<div class="vz-modal"><div class="vz-modal-title">' + escapeHtml(title) +
        '</div><div class="vz-modal-body">' + escapeHtml(msg) +
        '</div><div class="vz-modal-actions"><button class="vz-modal-btn" id="' + id + 'Cancel">' +
        escapeHtml(cancelText) + '</button><button class="vz-modal-btn danger" id="' + id + 'Ok">' +
        escapeHtml(okText) + '</button></div></div>';
      overlay.querySelector('#' + id + 'Ok').onclick = function () { modalClose(overlay, function () { resolve(true); }); };
      overlay.querySelector('#' + id + 'Cancel').onclick = function () { modalClose(overlay, function () { resolve(false); }); };
      overlay.addEventListener('click', function (e) { if (e.target === overlay) modalClose(overlay, function () { resolve(false); }); });
      modalOpen(overlay);
    });
  }

  /* 页眉页脚外壳
     导航与页脚链接由站点传入，core 不写死任何站点的板块清单。
     登录按钮只出位置，登录态与菜单交给站点自己接（那是 site 层的事）。 */

  var shellCfg = {
    brand: { name: 'VZService', href: '/', logo: '/favicon.ico' },
    nav: [],
    footer: []
  };

  function setup(opts) {
    var o = opts || {};
    if (o.brand) shellCfg.brand = { name: o.brand.name || shellCfg.brand.name, href: o.brand.href || '/', logo: o.brand.logo || shellCfg.brand.logo };
    if (Array.isArray(o.nav)) shellCfg.nav = o.nav;
    if (Array.isArray(o.footer)) shellCfg.footer = o.footer;
    return shellCfg;
  }

  /* 当前页所属板块：pathname 前缀取最长命中，详情页也能落到父板块 */
  function activeId(here) {
    var best = '', bestLen = -1;
    shellCfg.nav.concat(shellCfg.footer).forEach(function (p) {
      if (p.id === 'home') {
        if (here === p.href && bestLen < 1) { best = 'home'; bestLen = 1; }
        return;
      }
      if (here === p.href || here.indexOf(p.href + '/') === 0) {
        if (p.href.length > bestLen) { best = p.id; bestLen = p.href.length; }
      }
    });
    return best;
  }

  function headerHtml(on) {
    var b = shellCfg.brand;
    /* logo 传空串就不出 img，避免浏览器显示破图占位 */
    var logo = b.logo ? '<img src="' + b.logo + '" alt="" class="brand-logo">' : '';
    var links = shellCfg.nav.map(function (p) {
      var isOn = p.id === on;
      return '<a href="' + p.href + '"' + (isOn ? ' style="color:var(--vz-brand-from);"' : '') + '>' + p.label + '</a>';
    }).join('\n        ');
    return '<div class="header">\n' +
      '    <div class="nav">\n' +
      '        <a href="' + b.href + '" class="brand">' + logo + '<span class="brand-text">' + b.name + '</span></a>\n' +
      '        ' + links + '\n' +
      '        <div class="header-right">\n' +
      '            <div class="user-menu" id="userMenu"></div>\n' +
      '        </div>\n' +
      '    </div>\n' +
      '</div>';
  }

  function footerHtml(on) {
    var links = shellCfg.footer.map(function (p) {
      var isOn = p.id === on;
      return '<a href="' + p.href + '"' + (isOn ? ' class="vz-text-brand"' : '') + '>' + p.label + '</a>';
    }).join('\n        ');
    return '<div class="footer">\n' +
      '    <div class="footer-links">\n' +
      '        ' + links + '\n' +
      '    </div>\n' +
      '</div>';
  }

  /* 幂等：同一份内容不重写，省得每次切页白重建一次 DOM */
  function renderShell() {
    var here = '/';
    try { here = location.pathname; } catch (e) {}
    var on = activeId(here);
    var h = document.getElementById('vzHeader');
    if (h) {
      var nh = headerHtml(on);
      if (h.getAttribute('data-vz-shell') !== nh) {
        h.setAttribute('data-vz-shell', nh);
        h.innerHTML = nh;
      }
    }
    var f = document.getElementById('vzFooter');
    if (f) {
      var nf = footerHtml(on);
      if (f.getAttribute('data-vz-shell') !== nf) {
        f.setAttribute('data-vz-shell', nf);
        f.innerHTML = nf;
      }
    }
  }

  w.VZCore = {
    escapeHtml: escapeHtml,
    inlineMd: inlineMd,
    hasMarkdownSyntax: hasMarkdownSyntax,
    simpleMd: simpleMd,
    formatDate: formatDate,
    showLoading: showLoading,
    hideLoading: hideLoading,
    modalOpen: modalOpen,
    modalClose: modalClose,
    VZAlert: VZAlert,
    VZConfirm: VZConfirm,
    setup: setup,
    renderShell: renderShell,
    MODAL_MS: MODAL_MS
  };

  /* 老站点把 escapeHtml 当全局函数用，这里只在没人占用时补上，不覆盖站内已有实现 */
  if (!w.escapeHtml) w.escapeHtml = escapeHtml;
})(window);
