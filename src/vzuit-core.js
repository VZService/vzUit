/* vzUit 运行时：core 段
   只依赖 DOM，不碰任何站点接口，跨站可以直接单引。
   site 段（登录、验证码、公告、打赏、内容注入）留在各站自己的脚本里，不进本文件。

   本文件分七节：
     HTML 转义与轻量 Markdown
     时间格式化
     加载圈
     弹窗
     轻提示
     页眉页脚外壳
     滑块

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

  /* 轻提示
     只做「告诉用户结果」，不做阻断。需要用户确认的走 VZAlert / VZConfirm。
     位置默认在页面上方，opts.position 传 bottom 挂到下方那层，两处互不影响。
     同一批操作连点时会堆一列，所以给了两件事：每层最多并存三条，超过关掉最旧的；
     传同一个 key 的提示只刷新那一条，不新增。
     鼠标悬停或键盘把焦点移进提示条时暂停计时，离开后接着走完剩余时长，
     否则长文案还没读完就消失了。 */

  var toastLayers = { top: null, bottom: null };
  var toastSeq = 0;
  var toastList = [];
  var TOAST_MAX = 3;
  var TOAST_MS = 3000;
  var TOAST_LEAVE_MS = 250;   /* 与 toast.css 里 .vz-toast 的 --vz-dur 过渡时长一致 */

  /* 图标取自 src/../icons/8-ui，path 与 viewBox 原样搬，保证与其他地方同一套造型。
     失败态用叉号，关闭按钮也是它，两者共用一份几何。 */
  var TOAST_CROSS = {
    box: '2.44 2.44 5.10 5.10',
    path: '<path d="M6.344 2.667a.7.7 0 0 1 .99.99l-.538.537c-.359.359-.538.538-.556.759a1 1 0 0 0 0 .094c.018.22.197.4.556.76l.538.537a.701.701 0 0 1-.99.989l-.538-.538c-.36-.359-.539-.538-.76-.555a1 1 0 0 0-.093 0c-.221.017-.4.196-.76.555l-.537.538a.7.7 0 0 1-.99-.99l.538-.537c.36-.359.539-.538.556-.759a1 1 0 0 0 0-.094c-.017-.22-.197-.4-.556-.76l-.537-.537a.7.7 0 1 1 .989-.989l.538.538c.359.359.538.538.759.555a1 1 0 0 0 .094 0c.22-.017.4-.196.759-.555z"/>'
  };

  var TOAST_ICON = {
    info: {
      box: '1.82 1.85 6.35 6.35',
      path: '<path d="M5.7 6.66c0 .15.076.29.2.373l.14.093A.587.587 0 0 1 5.713 8.2H4.286a.586.586 0 0 1-.325-1.074l.139-.093a.45.45 0 0 0 .2-.373v-.832c0-.058 0-.088-.003-.115a.5.5 0 0 0-.176-.328 1 1 0 0 0-.094-.067l-.066-.044A.587.587 0 0 1 4.286 4.2h.274c.508 0 .762 0 .93.144a1 1 0 0 1 .066.066c.144.169.144.423.144.93zm-.8-4.81a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6"/>'
    },
    success: {
      box: '1.85 1.86 6.29 6.29',
      path: '<path d="M6.956 2.905a.7.7 0 0 1 .989.99l-3.2 3.2a.7.7 0 0 1-.99 0l-1.7-1.7a.7.7 0 0 1 .99-.99l.265.264c.419.419.628.628.886.649a1 1 0 0 0 .11 0c.257-.02.466-.23.885-.649z"/>'
    },
    warning: {
      box: '1.75 1.75 6.50 6.50',
      path: '<path d="M4.2 7.45a.8.8 0 1 1 1.6 0 .8.8 0 0 1-1.6 0M4 2.65c0-.442.358-.9 1-.9s1 .458 1 .9-.2 2.058-.3 2.5-.258.8-.7.8-.6-.358-.7-.8S4 3.092 4 2.65"/>'
    },
    danger: TOAST_CROSS
  };
  var TOAST_ICON_KEYS = ['info', 'success', 'warning', 'danger'];

  function toastLayerEl(pos) {
    var key = pos === 'bottom' ? 'bottom' : 'top';
    if (!toastLayers[key]) {
      var el = document.createElement('div');
      el.className = 'vz-toast-layer' + (key === 'bottom' ? ' vz-toast-layer-bottom' : '');
      /* 播报交给容器，单条不再挂 aria-live，避免两条同时出现抢读 */
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
      toastLayers[key] = el;
    }
    return toastLayers[key];
  }

  function toastTiming(item, ms) {
    item.remain = ms;
    item.startedAt = Date.now();
    item.timer = setTimeout(function () { toastClose(item); }, ms);
  }

  function toastHold(item) {
    if (!item.timer) return;
    clearTimeout(item.timer);
    item.timer = null;
    /* 留 800ms 底，鼠标划过一下回来也不至于立刻消失 */
    item.remain = Math.max(800, item.remain - (Date.now() - item.startedAt));
  }

  function toastResume(item) {
    if (item.timer || item.closing || !item.remain) return;
    toastTiming(item, item.remain);
  }

  function toastClose(item) {
    if (!item || item.closing) return;
    item.closing = true;
    if (item.timer) { clearTimeout(item.timer); item.timer = null; }
    item.el.classList.remove('show');
    item.el.classList.add('leaving');
    var dropped = false;
    function drop() {
      if (dropped) return;
      dropped = true;
      if (item.el.parentNode) item.el.parentNode.removeChild(item.el);
      var at = toastList.indexOf(item);
      if (at > -1) toastList.splice(at, 1);
    }
    item.el.addEventListener('transitionend', function (e) {
      if (e.target === item.el && e.propertyName === 'opacity') drop();
    });
    setTimeout(drop, TOAST_LEAVE_MS + 80);
  }

  function toastSkin(item, type) {
    TOAST_ICON_KEYS.forEach(function (k) { item.el.classList.remove('vz-toast-' + k); });
    item.el.classList.add('vz-toast-' + type);
    item.icoEl.innerHTML = '<svg viewBox="' + TOAST_ICON[type].box + '" aria-hidden="true">' +
      TOAST_ICON[type].path + '</svg>';
    item.el.setAttribute('role', type === 'danger' ? 'alert' : 'status');
    item.type = type;
  }

  function toastShow(msg, opts) {
    if (!msg && msg !== 0) return null;
    var o = opts || {};
    var type = TOAST_ICON[o.type] ? o.type : 'info';
    var duration = typeof o.duration === 'number' ? o.duration : TOAST_MS;
    var key = o.key ? String(o.key) : '';
    var pos = o.position === 'bottom' ? 'bottom' : 'top';

    /* 同 key 只留一条：连点保存按钮时刷新文案与计时，不堆一列一样的条 */
    if (key) {
      for (var i = 0; i < toastList.length; i++) {
        if (toastList[i].key === key && !toastList[i].closing) {
          var hit = toastList[i];
          toastSkin(hit, type);
          hit.msgEl.textContent = String(msg);
          hit.duration = duration;
          if (hit.timer) { clearTimeout(hit.timer); hit.timer = null; }
          if (duration > 0) toastTiming(hit, duration);
          else hit.remain = 0;
          return hit;
        }
      }
    }

    var icon = TOAST_ICON[type];
    var item = {
      id: 'vzToast' + (++toastSeq),
      key: key,
      type: type,
      pos: pos,
      duration: duration,
      remain: duration,
      timer: null,
      startedAt: 0,
      closing: false
    };

    var el = document.createElement('div');
    el.className = 'vz-toast vz-toast-' + type;
    el.setAttribute('role', type === 'danger' ? 'alert' : 'status');

    var icoEl = document.createElement('span');
    icoEl.className = 'vz-toast-ico';
    icoEl.innerHTML = '<svg viewBox="' + icon.box + '" aria-hidden="true">' + icon.path + '</svg>';

    var msgEl = document.createElement('span');
    msgEl.className = 'vz-toast-msg';
    msgEl.textContent = String(msg);

    el.appendChild(icoEl);
    el.appendChild(msgEl);

    /* duration 为 0 表示常驻，必须给关闭入口，否则用户只能刷新页面 */
    if (o.closable || duration === 0) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vz-toast-close';
      btn.setAttribute('aria-label', '关闭提示');
      btn.innerHTML = '<svg viewBox="' + TOAST_CROSS.box + '" aria-hidden="true">' + TOAST_CROSS.path + '</svg>';
      btn.addEventListener('click', function () { toastClose(item); });
      el.appendChild(btn);
    }

    item.el = el;
    item.msgEl = msgEl;
    item.icoEl = icoEl;
    item.close = function () { toastClose(item); };

    el.addEventListener('mouseenter', function () { toastHold(item); });
    el.addEventListener('mouseleave', function () { toastResume(item); });
    el.addEventListener('focusin', function () { toastHold(item); });
    el.addEventListener('focusout', function () { toastResume(item); });

    toastLayerEl(pos).appendChild(el);
    toastList.push(item);
    requestAnimationFrame(function () { if (!item.closing) el.classList.add('show'); });

    /* 超出上限就关掉同一层最旧的几条。
       关闭是异步的：条目要等退场动画播完才从 toastList 里摘掉，
       所以不能拿列表长度做循环条件，否则 close 完长度不变，while 直接转死。 */
    var alive = toastList.filter(function (t) { return !t.closing && t.pos === pos; });
    while (alive.length > TOAST_MAX) toastClose(alive.shift());

    if (duration > 0) toastTiming(item, duration);
    else item.remain = 0;

    return item;
  }

  function toastTyped(type) {
    return function (msg, opts) {
      var o = {};
      if (opts) for (var k in opts) if (Object.prototype.hasOwnProperty.call(opts, k)) o[k] = opts[k];
      o.type = type;
      return toastShow(msg, o);
    };
  }

  function VZToast(msg, opts) { return toastShow(msg, opts); }
  VZToast.show = toastShow;
  VZToast.info = toastTyped('info');
  VZToast.success = toastTyped('success');
  VZToast.warning = toastTyped('warning');
  VZToast.danger = toastTyped('danger');
  VZToast.close = function (handle) { if (handle) toastClose(handle); };
  VZToast.closeAll = function () { toastList.slice().forEach(toastClose); };

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

  /* 滑块：拖动时数值做指数收敛，松手落到整档，档位变化给一次短震。
     原生 input 负责取值与键盘，这里只管视觉进度、读数与手感，
     JS 没跑起来时滑块照样能用，只是填充不跟手、读数不刷新。 */

  var rangeReduce = (function () {
    try { return w.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  })();

  function rangeDigits(input) {
    var n = parseInt(input.getAttribute('data-vz-range-digits'), 10);
    return isNaN(n) ? 0 : n;
  }

  function rangeText(v, input) {
    var d = rangeDigits(input);
    var unit = input.getAttribute('data-vz-range-unit') || '';
    return (d > 0 ? v.toFixed(d) : String(Math.round(v))) + unit;
  }

  function rangeBind(input) {
    if (input.getAttribute('data-vz-range-ready')) return;
    input.setAttribute('data-vz-range-ready', '1');
    var wrap = input.parentNode;
    while (wrap && wrap.nodeType === 1 && !/(^|\s)vz-range(\s|$)/.test(wrap.className)) wrap = wrap.parentNode;
    if (!wrap || wrap.nodeType !== 1) wrap = input.parentNode;
    var out = wrap.querySelector('.vz-range-val');
    var snap = parseFloat(input.getAttribute('data-vz-range-snap'));
    if (isNaN(snap) || snap <= 0) snap = 0;
    var min = parseFloat(input.min);
    var max = parseFloat(input.max);
    var target = parseFloat(input.value);
    var shown = target;
    var rafId = null;
    var lastTs = 0;
    var lastTick = null;
    var snapTimer = null;
    var canVibrate = typeof w.navigator !== 'undefined' && typeof w.navigator.vibrate === 'function';

    function paint() {
      var ratio = (max - min) ? (shown - min) / (max - min) : 0;
      ratio = ratio < 0 ? 0 : (ratio > 1 ? 1 : ratio);
      wrap.style.setProperty('--vz-range-p', (ratio * 100).toFixed(2) + '%');
      if (out) out.innerHTML = rangeText(shown, input);
      input.setAttribute('aria-valuetext', rangeText(shown, input));
    }

    function tickStep() {
      if (!canVibrate) return;
      var q = snap > 0 ? Math.round(shown / snap) : Math.round(shown);
      if (lastTick === null) { lastTick = q; return; }
      if (q !== lastTick) {
        lastTick = q;
        try { w.navigator.vibrate(5); } catch (e) {}
      }
    }

    function frame(ts) {
      if (!lastTs) lastTs = ts;
      var dt = Math.min(60, ts - lastTs) / 1000;
      lastTs = ts;
      shown += (target - shown) * (1 - Math.pow(0.0001, dt));
      tickStep();
      if (Math.abs(target - shown) < 0.001) {
        shown = target;
        paint();
        rafId = null;
        lastTs = 0;
        return;
      }
      paint();
      rafId = w.requestAnimationFrame(frame);
    }

    function start() {
      if (rangeReduce) { shown = target; paint(); return; }
      if (rafId) return;
      lastTs = 0;
      rafId = w.requestAnimationFrame(frame);
    }

    function scheduleSnap() {
      if (!snap) return;
      if (snapTimer) w.clearTimeout(snapTimer);
      snapTimer = w.setTimeout(function () {
        var nearest = Math.round(target / snap) * snap;
        nearest = Math.min(max, Math.max(min, nearest));
        if (Math.abs(target - nearest) > 0.0001 && Math.abs(target - nearest) < snap * 0.6) {
          target = nearest;
          input.value = String(nearest);
          start();
        }
      }, 110);
    }

    input.addEventListener('input', function () {
      target = parseFloat(input.value);
      start();
      scheduleSnap();
    });
    input.addEventListener('keydown', function (e) {
      var keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'];
      if (keys.indexOf(e.key) < 0) return;
      e.preventDefault();
      var step = snap > 0 ? snap : parseFloat(input.step || '1');
      if (e.key === 'PageUp' || e.key === 'PageDown') step = step * 2;
      var dir = (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'PageUp') ? 1 : -1;
      target = Math.min(max, Math.max(min, target + step * dir));
      input.value = String(target);
      if (snapTimer) { w.clearTimeout(snapTimer); snapTimer = null; }
      start();
    });
    input.addEventListener('pointerdown', function () { input.classList.add('is-dragging'); });
    ['pointerup', 'pointercancel', 'blur'].forEach(function (ev) {
      input.addEventListener(ev, function () {
        input.classList.remove('is-dragging');
        scheduleSnap();
      });
    });

    paint();
  }

  function rangeInit(root) {
    var scope = root || document;
    var list = scope.querySelectorAll('.vz-range input[type="range"]');
    for (var i = 0; i < list.length; i++) rangeBind(list[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { rangeInit(); });
  } else {
    rangeInit();
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
    VZToast: VZToast,
    setup: setup,
    renderShell: renderShell,
    rangeInit: rangeInit,
    rangeBind: rangeBind,
    MODAL_MS: MODAL_MS
  };

  /* 老站点把 escapeHtml 当全局函数用，这里只在没人占用时补上，不覆盖站内已有实现 */
  if (!w.escapeHtml) w.escapeHtml = escapeHtml;
})(window);
