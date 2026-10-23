/* ─────────────────────────────────────────────────────────────
   電子喜帖 ── 室內光 / 粉紗棚拍
   原生 JS，無框架、無打包工具。改完存檔重新整理即可。
   ───────────────────────────────────────────────────────────── */
'use strict';

/* ═══════════════════════════════════════════════════════════
   1. 設定 ── 要改婚禮資訊，改這一段就好
   ═══════════════════════════════════════════════════════════ */
const CONFIG = {
  /* 倒數目標。格式：YYYY-MM-DDTHH:mm:ss+08:00（台灣時間） */
  weddingAt: '2026-12-12T11:30:00+08:00',

  /* 背景音樂音量 0 ~ 1 */
  musicVolume: 0.35,

  /* 月曆：要圈起來的那一天，以及當月天數、月初空格數
     firstDayBlanks = 該月 1 號前面要空幾格（週日為第 0 格）
     2026/12/1 是週二 → 空 2 格 */
  calendar: { daysInMonth: 31, firstDayBlanks: 2, highlight: 12 },

  /* 出席回覆送到哪裡（Google Apps Script 網址） */
  rsvpEndpoint: 'https://script.google.com/macros/s/AKfycbw-70yCqSu886WDcwTCMM0L9Zc6Bc0V3ZzgnY7grgRpjxWlQw64S7xLOjMYIkXqeHN1/exec',

  /* Apple 行事曆下載檔的內容 */
  ics: [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EricSara//Wedding//TW', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:20261212-ericsara@wedding',
    'DTSTAMP:20260824T000000Z',
    'DTSTART:20261212T033000Z',
    'DTEND:20261212T070000Z',
    'SUMMARY:王博玄 ＆ 楊琇 婚宴',
    'LOCATION:頤品大飯店 新莊晶冠館 6F 金簦廳（新北市新莊區五工路66號）',
    'DESCRIPTION:11:30 賓客入席・迎賓雞尾酒／12:00 婚宴開席',   // ics 一行不能超過 75 bytes，字別再加長
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n')
};

/* 網址加 ?skip=1 可跳過信封動畫，方便改版時直接看內頁 */
const SKIP_ENVELOPE = new URLSearchParams(location.search).get('skip') === '1';


/* ═══════════════════════════════════════════════════════════
   2. 主程式
   ═══════════════════════════════════════════════════════════ */
class Invite {
  constructor() {
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.opened = false;
    this.muted = false;
    this.started = false;
    this.VOL = CONFIG.musicVolume;
  }

  $(id) { return document.getElementById(id); }

  /* 直接寫 inline style。原本 React 版需要 re-render 後補回樣式，
     純 HTML 沒有這個問題，設一次就固定。 */
  stick(el, prop, val) { if (el) el.style[prop] = val; }

  start() {
    this.buildCalendar();
    this.bindEvents();
    this.setupLines();      // 這兩個都要在 setupScan() 之前：先把元素擺到「進場前」的狀態
    this.setupTracking();

    if (SKIP_ENVELOPE) {
      const env = this.$('env');
      if (env) env.style.display = 'none';
      const cover = this.$('coverImg');
      if (cover) { this.stick(cover, 'opacity', '1'); this.stick(cover, 'transform', 'scale(1)'); }
      this.opened = true;
      this._unlocked = true;
      this.startKenBurns();
      this.startPetals();
    } else {
      document.body.style.overflow = 'hidden';
    }

    this.setupSlines();
    this.setupScan();
    this.setupParallax();
    this.setupCardParallax();
    this.setupJump();
    this.setupChapters();
    this.setupCountdown();
    this.setupRSVP();
    this.setupGallery();

    document.addEventListener('visibilitychange', () => {
      const el = this.$('bgm');
      if (!el || !this.started) return;
      if (document.hidden) el.pause();
      else if (!this.muted) el.play().catch(() => {});
    });
  }

  /* 原本靠 <sc-for> / <sc-if> 樣板產生，改成用 JS 產 DOM */
  buildCalendar() {
    const grid = this.$('calGrid');
    if (!grid) return;
    const { daysInMonth, firstDayBlanks, highlight } = CONFIG.calendar;

    const cells = [];
    for (let i = 0; i < firstDayBlanks; i++) cells.push({ n: '', big: false });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ n: String(d), big: d === highlight });
    while (cells.length % 7 !== 0) cells.push({ n: '', big: false });

    const frag = document.createDocumentFragment();
    cells.forEach((c) => {
      const cell = document.createElement('div');
      cell.style.cssText = 'height:38px;display:flex;align-items:center;justify-content:center;';
      cell.appendChild(c.big ? this.calRing(c.n) : this.calPlain(c.n));
      frag.appendChild(cell);
    });
    grid.appendChild(frag);
  }

  calPlain(n) {
    const span = document.createElement('span');
    span.style.cssText = 'font-size:15px;';
    span.textContent = n;
    return span;
  }

  /* 大喜之日那一格：手繪筆觸的圈。掛 data-sline 就能沿用分隔線那一套 ──
     setupSlines() 量路徑長度、捲到畫面內時 reveal() 把它描出來。 */
  calRing(n) {
    const box = document.createElement('span');
    box.style.cssText = 'position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;';
    box.innerHTML =
      '<svg data-sline="1" viewBox="0 0 34 34" aria-hidden="true" ' +
      'style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;">' +
      '<path d="M14.5 4.6 C 22 3.2, 29.8 8.6, 30.2 16.4 C 30.6 24.4, 23.8 30.6, 16.4 30.2 ' +
      'C 9 29.8, 3.4 23.6, 4.2 16.6 C 5 9.8, 10.4 5.2, 17.6 4.4 C 19.6 4.2, 21.6 4.5, 23.2 5.2" ' +
      'fill="none" stroke="#D8A9A4" stroke-width="1.4" stroke-linecap="round"></path></svg>';
    const num = document.createElement('span');
    num.style.cssText = 'position:relative;font-size:15px;color:#4A403C;';
    num.textContent = n;
    box.appendChild(num);
    return box;
  }

  /* 原本寫在 HTML 的 onClick="{{ ... }}"，改成在這裡掛事件 */
  bindEvents() {
    const env = this.$('env');
    if (env) env.addEventListener('click', () => this.openEnvelope());

    const mute = this.$('muteBtn');
    if (mute) mute.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMute(); });

    const jump = this.$('jumpBtn');
    if (jump) jump.addEventListener('click', () => this.jumpInfo());

    const rsvpJump = this.$('rsvpJumpBtn');
    if (rsvpJump) rsvpJump.addEventListener('click', () => this.jumpRSVP());

    const ics = this.$('icsLink');
    if (ics) ics.addEventListener('click', (e) => this.downloadIcs(e));
  }

  /* ── 封面：相本翻開 ── */
  openEnvelope() {
    if (this.opened) return;
    this.opened = true;
    this.startMusic();
    if (this._syncJump) this._syncJump();

    const env = this.$('env');
    const txt = this.$('introTxt'), cover = this.$('coverImg'), wrap = this.$('cardWrap');

    const revealCover = () => this.play(cover, 'coverIn', 1800, { opacity: '1', transform: 'scale(1)' });
    const unlock = () => {
      document.body.style.overflow = '';
      this._unlocked = true;   // 從這一刻起 armScan() 才開始做進場，封面文字才不會在信封後面偷偷演完
      this.startKenBurns();
      this.startPetals();
    };

    if (this.reduced) {
      revealCover();
      this.stick(env, 'transition', 'opacity .8s');
      this.stick(env, 'opacity', '0');
      setTimeout(() => { this.stick(env, 'display', 'none'); unlock(); }, 820);
      return;
    }

    this.stick(txt, 'opacity', '0');
    // 第一拍：卡片被拿起來
    this.stick(wrap, 'animation', 'none');
    this.stick(wrap, 'transform', 'scale(1.06)');
    this.stick(wrap, 'filter', 'drop-shadow(0 26px 64px rgba(74,64,60,.22))');
    // 第二拍：停 0.5 秒後卡片繼續放大並淡出，米白底同時淡掉，封面照從底下浮出來。
    // 純 2D —— 之前的 3D 翻頁在某些手機瀏覽器會把背面畫成鏡像，字全部顛倒。
    setTimeout(() => {
      this.stick(wrap, 'transition', 'transform 1.3s cubic-bezier(.4,0,.2,1), opacity 1.05s ease-out, filter 1.05s ease-out');
      this.stick(wrap, 'transform', 'scale(1.6)');
      this.stick(wrap, 'opacity', '0');
      this.stick(wrap, 'filter', 'drop-shadow(0 26px 64px rgba(74,64,60,0)) blur(3px)');
      revealCover();
    }, 500);
    setTimeout(() => {
      this.stick(env, 'transition', 'opacity 1.1s ease-out');
      this.stick(env, 'opacity', '0');
    }, 650);
    setTimeout(() => { this.stick(env, 'display', 'none'); unlock(); }, 1850);
  }

  /* 滿版大圖的緩慢推近，卡片式照片不套用 */
  startKenBurns() {
    if (this.reduced || this._kb) return;
    this._kb = true;
    setTimeout(() => {
      document.querySelectorAll('img[data-bleed]').forEach((im) => {
        this.stick(im, 'transition', 'transform 26s linear');
        this.stick(im, 'transform', 'scale(1.07)');
      });
    }, 1200);
  }

  /* ── 飄落花瓣 ──
     一張 fixed 的 canvas 蓋在最上層（pointer-events:none，不擋點擊）。
     刻意畫得少而淡：手機 14 片、桌機 22 片，透明度 .18~.48。 */
  startPetals() {
    if (this.reduced || this._petals) return;
    const cv = this.$('petals');
    if (!cv || !cv.getContext) return;
    this._petals = true;

    const ctx = cv.getContext('2d');
    const TINT = ['#E9C6C2', '#D8A9A4', '#C4A38F', '#FFFFFF'];
    let w = 0, h = 0;
    const list = [];

    /* spread = true 是開場時就散佈在整個畫面，false 是從上緣重新落下 */
    const seed = (spread) => ({
      x: Math.random() * w,
      y: spread ? Math.random() * h : -24,
      r: 4 + Math.random() * 5,
      fall: 16 + Math.random() * 26,       // 每秒落下幾 px
      sway: 10 + Math.random() * 22,       // 左右飄移幅度
      phase: Math.random() * Math.PI * 2,
      flip: 0.4 + Math.random() * 0.8,     // 翻面快慢
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.7,
      alpha: 0.18 + Math.random() * 0.3,
      tint: TINT[(Math.random() * TINT.length) | 0]
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const want = w < 600 ? 14 : 22;
      while (list.length < want) list.push(seed(true));
      list.length = want;
    };
    resize();
    window.addEventListener('resize', resize);

    let last = performance.now();
    const frame = (t) => {
      const dt = Math.min((t - last) / 1000, 0.05);   // 分頁切回來時不要暴衝
      last = t;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        p.y += p.fall * dt;
        p.phase += p.flip * dt;
        p.rot += p.spin * dt;
        if (p.y > h + 24) { list[i] = seed(false); continue; }
        ctx.save();
        ctx.translate(p.x + Math.sin(p.phase) * p.sway, p.y);
        ctx.rotate(p.rot);
        ctx.scale(Math.cos(p.phase), 1);              // 側面轉過去就變窄，像真的在翻
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.tint;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r, p.r * 0.56, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    cv.style.opacity = '1';
  }

  /* ── 滿版大圖的視差 ──
     位移掛在 [data-plx] 外層，推近（Ken Burns）留在裡面的 <img>，
     兩個 transform 分開才不會互相蓋掉。 */
  setupParallax() {
    if (this.reduced) return;
    const layers = Array.from(document.querySelectorAll('[data-plx]'));
    if (!layers.length) return;

    let queued = false;
    const apply = () => {
      queued = false;
      const vh = window.innerHeight;
      layers.forEach((layer) => {
        const sec = layer.parentElement;
        if (!sec) return;
        const r = sec.getBoundingClientRect();
        if (r.bottom < -120 || r.top > vh + 120) return;   // 離畫面還遠就不用算
        // p：1 = 區塊還在下面，0 = 正中央，-1 = 已經捲過去
        const p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / ((vh + r.height) / 2)));
        // 外層多留了 10% 高度，位移量壓在那之內才不會露出底色
        const shift = -p * Math.min(r.height * 0.08, 70);
        layer.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0)';
      });
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(apply); } };

    layers.forEach((l) => { l.style.willChange = 'transform'; });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    apply();
  }

  /* ── 照片卡片微視差 ──
     關鍵：用獨立的 translate 屬性，不是 transform。卡片自己的 rotate(-2deg)、
     還有 reveal() 進場時寫的 transform，全部原封不動 —— 兩者各管各的，不會互相蓋掉。
     data-mplx 是幅度倍率，重疊的卡片給不同值，疊在一起就有前後距離。 */
  setupCardParallax() {
    if (this.reduced) return;
    if (!('translate' in document.documentElement.style)) return;   // 舊瀏覽器就安靜跳過
    const cards = Array.from(document.querySelectorAll('[data-mplx]'));
    if (!cards.length) return;

    const BASE = 9;   // px。刻意很小 —— 這是深度暗示，不是位移動畫
    let queued = false;
    const apply = () => {
      queued = false;
      const vh = window.innerHeight;
      cards.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) return;
        const p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / ((vh + r.height) / 2)));
        const amt = BASE * (parseFloat(el.dataset.mplx) || 1);
        // 正號 = 比捲動快一點點（前景感）；滿版大圖那邊用負號，是往後退的背景
        el.style.translate = '0 ' + (p * amt).toFixed(1) + 'px';
      });
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(apply); } };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    apply();
  }

  /* ── 進場動畫 ── */
  play(el, name, dur, finals) {
    if (!el) return;
    Object.keys(finals).forEach((k) => { el.style[k] = finals[k]; });
    el.style.animation = name + ' ' + dur + 'ms ease-out forwards';
    setTimeout(() => {
      this.stick(el, 'animation', 'none');
      Object.keys(finals).forEach((k) => this.stick(el, k, finals[k]));
    }, dur + 80);
  }

  reveal(el) {
    if (!el || el.dataset.shown) return;
    el.dataset.shown = '1';
    if (el.tagName === 'IMG') {
      this.play(el, 'printDrop', 1000, { opacity: '1', transform: 'translateY(0) rotate(0deg) scale(1)' });
    } else if (el.hasAttribute('data-wm')) {
      const s = el.querySelector('span');
      if (s) this.play(s, 'wmIn', 1600, { opacity: '.1', transform: 'rotate(-6deg)' });
    } else if (el.hasAttribute('data-sline')) {
      const p = el.querySelector('path');
      if (p) { p.style.transition = 'stroke-dashoffset 1.4s ease-out'; p.style.strokeDashoffset = '0'; }
    } else {
      this.play(el, 'textIn', 800, { opacity: '1', transform: 'translateY(0)' });
      this.revealLines(el);
      this.revealTracks(el);
      if (el.dataset.rv === 'tl') this.animateTimeline();
    }
  }

  hide(el) {
    if (this._allShown || el.dataset.hidden) return;
    el.dataset.hidden = '1';
    if (el.tagName === 'IMG') {
      this.stick(el, 'opacity', '0');
      this.stick(el, 'transform', 'translateY(30px) rotate(-1.4deg) scale(.985)');
    } else if (el.hasAttribute('data-wm')) {
      const s = el.querySelector('span');
      if (s) this.stick(s, 'opacity', '0');
    } else if (!el.hasAttribute('data-sline')) {
      this.stick(el, 'opacity', '0');
      this.stick(el, 'transform', 'translateY(16px)');
    }
  }

  targets() {
    return Array.from(document.querySelectorAll('[data-rv],[data-wm],svg[data-sline],#page img'))
      .filter((el) => !(el.tagName === 'IMG' && el.dataset.noreveal));
  }

  setupScan() {
    if (this.reduced) { this.revealAll(); return; }
    this.armScan();
    setInterval(() => this.armScan(), 250);
  }

  armScan() {
    if (!this._unlocked) return;   // 信封還蓋著，畫面上什麼都看不到，先不要浪費進場動畫
    this.targets().forEach((el) => {
      if (el.dataset.shown) return;
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight * 0.86) this.reveal(el);
      else this.hide(el);
    });
  }

  revealAll() {
    this._allShown = true;
    this.targets().forEach((el) => {
      el.dataset.shown = '1';
      if (el.hasAttribute('data-wm')) {
        const s = el.querySelector('span');
        if (s) { this.stick(s, 'opacity', '.1'); this.stick(s, 'transform', 'rotate(-6deg)'); }
      } else if (el.hasAttribute('data-sline')) {
        const p = el.querySelector('path');
        if (p) p.style.strokeDashoffset = '0';
      } else {
        this.stick(el, 'opacity', '1');
        this.stick(el, 'transform', 'none');
      }
    });
  }

  /* ── 標題字距收緊進場 ──
     字距從「原本 + .28em」慢慢收回原本的值，同時淡入。
     原本的值是寫在 inline style 上的（例如 .3em），要先記下來才還得回去；
     沒寫的視為 0em —— 不能還成空字串，因為 normal 不是長度，transition 接不上。 */
  setupTracking() {
    if (this.reduced) return;
    document.querySelectorAll('[data-track]').forEach((el) => {
      const authored = el.style.letterSpacing || '0em';
      el.dataset.ls = authored;
      el.style.letterSpacing = 'calc(' + authored + ' + .28em)';
      el.style.opacity = '0';
      void el.offsetWidth;
      el.style.transition = 'letter-spacing 1.3s cubic-bezier(.2,.7,.2,1), opacity 1.1s ease-out';
    });
  }

  /* 比外層區塊的淡入晚 120ms，讓標題是「最後落定」的那個 */
  revealTracks(scope) {
    scope.querySelectorAll('[data-track]').forEach((el) => {
      setTimeout(() => {
        el.style.letterSpacing = el.dataset.ls;
        el.style.opacity = '1';
      }, 120);
    });
  }

  /* ── 敘事段落逐行浮現 ──
     把 <p data-lines> 裡的 <br> 拆成一行一個 <span class="ln">，
     外層區塊捲進畫面時再依序點亮。樣式在 app.css 的 [data-lines] .ln。 */
  setupLines() {
    if (this.reduced) return;
    document.querySelectorAll('[data-lines]').forEach((el) => {
      const parts = el.innerHTML.split(/<br\s*\/?>/i);
      if (parts.length < 2) return;
      el.textContent = '';
      parts.forEach((txt) => {
        const ln = document.createElement('span');
        ln.className = 'ln';
        ln.textContent = txt.trim();
        el.appendChild(ln);
      });
    });
  }

  /* 整個區塊淡入約 800ms，所以第一行晚 300ms 才進場，不會擠在一起 */
  revealLines(scope) {
    scope.querySelectorAll('[data-lines] .ln').forEach((ln, i) => {
      setTimeout(() => {
        ln.style.opacity = '1';
        ln.style.transform = 'none';
      }, 300 + i * 210);
    });
  }

  setupSlines() {
    if (this.reduced) return;
    document.querySelectorAll('svg[data-sline]').forEach((svg) => {
      const p = svg.querySelector('path');
      if (!p) return;
      const len = p.getTotalLength();
      p.style.strokeDasharray = String(len);
      p.style.strokeDashoffset = String(len);
      p.style.transition = 'stroke-dashoffset 1.4s ease-out';
    });
  }

  animateTimeline() {
    const line = this.$('tlLine');
    if (line) line.style.transform = 'scaleY(1)';
    [1, 2, 3, 4].forEach((i) => {
      setTimeout(() => {
        const el = document.querySelector('[data-tli="' + i + '"]');
        if (el) el.style.opacity = '1';
      }, i * 300);
    });
  }

  /* ── 右上角「回覆」「資訊」快捷鈕（音樂鈕正下方）──
     跟音樂鈕一樣：信封翻開後就一直掛著，不管捲到哪、送出回覆後都不收（使用者要求固定）。 */
  setupJump() {
    const btns = [this.$('rsvpJumpBtn'), this.$('jumpBtn')].filter(Boolean);
    this._syncJump = () => {
      const on = this.opened;
      btns.forEach((btn) => {
        btn.style.opacity = on ? '1' : '0';
        btn.style.transform = on ? 'translateY(0)' : 'translateY(-8px)';
        btn.style.pointerEvents = on ? 'auto' : 'none';
      });
    };
    this._syncJump();
  }

  jumpInfo() {
    const info = this.$('info');
    if (!info) return;
    this.afterGallery(() => window.scrollTo({ top: info.offsetTop, behavior: this.reduced ? 'auto' : 'smooth' }));
  }

  jumpRSVP() {
    const rsvp = this.$('rsvp');
    if (!rsvp) return;
    this.afterGallery(() => window.scrollTo({ top: rsvp.offsetTop, behavior: this.reduced ? 'auto' : 'smooth' }));
  }

  /* ── 婚紗照搶先看：疊在喜帖上的 iframe，音樂才不會斷 ──
     打開時推一筆 history，手機的「上一頁」就是關掉相簿；photos.html 裡的「回喜帖」用 postMessage 叫這裡關。 */
  setupGallery() {
    const link = this.$('peekLink'), box = this.$('gallery'), frame = this.$('galleryFrame');
    if (!link || !box || !frame) return;
    this.galleryOpen = false;

    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.galleryOpen) return;
      this.galleryOpen = true;
      if (!frame.getAttribute('src')) frame.src = 'photos.html?embed=1';
      box.style.display = 'block';
      requestAnimationFrame(() => { box.style.opacity = '1'; });
      document.body.style.overflow = 'hidden';
      document.body.classList.add('gallery-open');   // app.css 靠這個把側邊章節刻度藏起來
      history.pushState({ gallery: 1 }, '');
    });

    // 真正收起來的地方。不管是按上一頁、按「回喜帖」還是按右上角的回覆／資訊，最後都走到 popstate 這裡
    window.addEventListener('popstate', () => {
      if (!this.galleryOpen) return;
      this.galleryOpen = false;
      box.style.opacity = '0';
      setTimeout(() => { if (!this.galleryOpen) box.style.display = 'none'; }, 350);
      document.body.style.overflow = '';
      document.body.classList.remove('gallery-open');
      const next = this._afterGallery;
      this._afterGallery = null;
      if (next) setTimeout(next, 30);   // 等瀏覽器把捲動位置還原完再捲，不然會被蓋掉
    });

    window.addEventListener('message', (e) => {
      if (e.origin === location.origin && e.data === 'closeGallery') this.afterGallery(null);
    });
  }

  // 相簿開著就先關（history.back 觸發上面的 popstate），關完再做 fn；沒開就直接做
  afterGallery(fn) {
    if (!this.galleryOpen) { if (fn) fn(); return; }
    this._afterGallery = fn;
    history.back();
  }

  /* ── 側邊章節指示 ──
     節點是從各 section 的 data-screen-label 長出來的，增減區塊不用回來改這裡。 */
  setupChapters() {
    const secs = Array.from(document.querySelectorAll('#page [data-screen-label]'));
    if (secs.length < 2) return;

    const nav = document.createElement('nav');
    nav.id = 'chapters';
    nav.setAttribute('aria-label', '章節');
    nav.style.cssText = 'position:fixed;right:12px;top:50%;transform:translateY(-50%);z-index:9998;' +
      'display:flex;flex-direction:column;gap:9px;align-items:flex-end;' +
      'opacity:0;pointer-events:none;transition:opacity .5s;';

    const items = secs.map((sec) => {
      const label = (sec.dataset.screenLabel || '').replace(/^\d+\w*\s*/, '');   // 「07 日期」→「日期」

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', label);
      // 可點範圍只留刻度本身（約 30px 寬）。以前章節名是排在按鈕裡的，透明但照樣佔寬度，
      // 手機上整顆按鈕往左伸到快 90px，蓋住表單右側的＋鈕，一點就被帶去別的章節。
      btn.style.cssText = 'border:none;background:none;padding:3px 0 3px 8px;cursor:pointer;' +
        'display:flex;align-items:center;position:relative;';

      // 滑鼠移上去才出現的章節名。手機沒有 hover，就只看得到刻度。
      // 絕對定位浮在按鈕左邊，不算進按鈕的可點範圍。
      const tip = document.createElement('span');
      tip.className = 'ch-tip';
      tip.textContent = label;
      tip.style.cssText = 'position:absolute;right:100%;top:50%;transform:translateY(-50%);margin-right:8px;' +
        'font-size:11px;letter-spacing:.08em;white-space:nowrap;color:#A9856E;' +
        'opacity:0;transition:opacity .25s;pointer-events:none;';

      const bar = document.createElement('span');
      bar.style.cssText = 'display:block;width:10px;height:1px;background:#C4A38F;opacity:.4;' +
        'transition:width .3s ease-out,opacity .3s,background-color .3s;';

      btn.appendChild(tip);
      btn.appendChild(bar);
      btn.addEventListener('click', () => {
        window.scrollTo({ top: sec.offsetTop, behavior: this.reduced ? 'auto' : 'smooth' });
      });
      nav.appendChild(btn);
      return { sec, bar };
    });

    document.body.appendChild(nav);

    let queued = false;
    const sync = () => {
      queued = false;
      const vh = window.innerHeight;
      const y = window.scrollY || (document.scrollingElement ? document.scrollingElement.scrollTop : 0);
      // 信封還沒翻開、或還在封面時不出現
      const on = this.opened && y > vh * 0.6;
      nav.style.opacity = on ? '1' : '0';
      nav.style.pointerEvents = on ? 'auto' : 'none';
      if (!on) return;

      let active = 0;
      items.forEach((it, i) => { if (it.sec.getBoundingClientRect().top <= vh * 0.35) active = i; });
      items.forEach((it, i) => {
        const hit = i === active;
        it.bar.style.width = hit ? '22px' : '10px';
        it.bar.style.opacity = hit ? '1' : '.4';
        it.bar.style.backgroundColor = hit ? '#A9856E' : '#C4A38F';
      });
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(sync); } };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    sync();
  }

  /* ── 背景音樂 ── */
  startMusic() {
    const el = this.$('bgm');
    if (!el) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    try {
      this.actx = new AC();
      const src = this.actx.createMediaElementSource(el);
      this.gainNode = this.actx.createGain();
      this.gainNode.gain.value = 0;
      src.connect(this.gainNode).connect(this.actx.destination);
      el.play().catch(() => {});
      this.actx.resume();
      this.gainNode.gain.linearRampToValueAtTime(this.VOL, this.actx.currentTime + 2.5);
      this.started = true;
    } catch (e) {
      el.play().catch(() => {});
      this.started = true;
    }
    const btn = this.$('muteBtn'), tip = this.$('muteTip');
    if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; btn.classList.add('is-playing'); }
    if (tip) {
      setTimeout(() => { tip.style.opacity = '1'; }, 800);
      setTimeout(() => { tip.style.opacity = '0'; }, 3800);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.gainNode && this.actx) {
      this.gainNode.gain.linearRampToValueAtTime(this.muted ? 0 : this.VOL, this.actx.currentTime + 0.4);
    } else {
      const el = this.$('bgm');
      if (el) { this.muted ? el.pause() : el.play().catch(() => {}); }
    }
    this.$('icOn').style.display = this.muted ? 'none' : 'block';
    this.$('icOff').style.display = this.muted ? 'block' : 'none';
    const mb = this.$('muteBtn');
    if (mb) mb.classList.toggle('is-playing', !this.muted);   // 靜音時光環也停
  }

  /* ── Apple 行事曆 .ics 下載 ── */
  downloadIcs(e) {
    e.preventDefault();
    const url = URL.createObjectURL(new Blob([CONFIG.ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wedding.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* ── 倒數計時 ── */
  setupCountdown() {
    const target = new Date(CONFIG.weddingAt).getTime();
    const tick = (first) => {
      const diff = target - Date.now();
      const row = this.$('cdRow'), done = this.$('cdDone');
      const pre = this.$('cdPre'), post = this.$('cdPost');
      if (!row) return;
      if (diff <= 0) {
        /* 「還有」和「就見面了」是包著數字的句子，數字沒了就要一起收掉，
           不然當天會讀成「還有／今天就是我們的日子／就見面了」 */
        row.style.display = 'none';
        if (pre) pre.style.display = 'none';
        if (post) post.style.display = 'none';
        if (done) done.style.display = 'flex';
        return;
      }
      const s = Math.floor(diff / 1000);
      const vals = {
        d: String(Math.floor(s / 86400)),
        h: String(Math.floor((s % 86400) / 3600)).padStart(2, '0'),
        m: String(Math.floor((s % 3600) / 60)).padStart(2, '0'),
        s: String(s % 60).padStart(2, '0')
      };
      ['d', 'h', 'm', 's'].forEach((k) => {
        const cell = document.querySelector('[data-cd="' + k + '"]');
        if (cell) this.flipTo(cell, vals[k], first);
      });
    };
    tick(true);
    setInterval(() => tick(false), 1000);
  }

  /* 機場翻牌鐘：正面往上翻走，背面接著從上面翻進來。
     兩個面輪流當正面，用 dataset.face 記住現在輪到誰。 */
  flipTo(cell, val, instant) {
    const i = Number(cell.dataset.face || 0);
    const front = cell.children[i], back = cell.children[1 - i];
    if (!front || !back || front.textContent === val) return;
    if (instant || this.reduced) { front.textContent = val; return; }

    back.textContent = val;

    // 背面還停在上一輪翻走的角度，得先無動畫地拉回「上方待命」位置
    back.style.transition = 'none';
    back.style.transform = 'rotateX(90deg)';
    back.style.opacity = '0';
    void back.offsetWidth;          // 強制重排，否則瀏覽器會把歸位和翻入合併成一步，看不到動畫
    back.style.transition = '';

    front.style.transitionDelay = '0s';
    back.style.transitionDelay = '.28s';   // 等正面翻走了再進來，中間留一個空檔才像翻牌

    front.style.transform = 'rotateX(-90deg)';
    front.style.opacity = '0';
    back.style.transform = 'rotateX(0deg)';
    back.style.opacity = '1';

    cell.dataset.face = String(1 - i);
  }

  /* ── 出席回覆表單 ── */
  setupRSVP() {
    const form = this.$('rsvpForm');
    if (!form) return;
    const name = this.$('fName'), phone = this.$('fPhone');
    const btn = this.$('rsvpBtn'), err = this.$('rsvpErr');
    const wish = this.$('fWish'), cnt = this.$('wCount');

    if (wish && cnt) {
      wish.addEventListener('input', () => { cnt.textContent = wish.value.length + ' / 300'; });
    }

    const radios = Array.from(form.querySelectorAll('input[name="attend"]'));
    const setBtn = (on) => {
      btn.disabled = !on;
      btn.style.opacity = on ? '1' : '.35';
      btn.style.cursor = on ? 'pointer' : 'not-allowed';
    };
    const validate = () => {
      const ok = name.value.trim() && phone.value.trim() && radios.some((r) => r.checked);
      if (!this._sending) setBtn(!!ok);
    };
    setBtn(false);

    [name, phone, wish].forEach((inp) => {
      if (!inp) return;
      inp.addEventListener('input', validate);
      // 聚焦的金色底線是 app.css 用 :focus 畫的；這裡只換邊框色，原本的外光暈拿掉了，兩個一起太吵
      inp.addEventListener('focus', () => { inp.style.borderColor = '#E9C6C2'; });
      inp.addEventListener('blur', () => { inp.style.borderColor = 'rgba(196,163,143,.35)'; });
    });

    // 人數／素食／兒童座椅步進器；素食和兒童座椅都是出席人數裡的幾位，所以不能比出席人數多
    const counts = { seats: 1, veg: 0, kidChairs: 0 };
    const steppers = Array.from(form.querySelectorAll('[data-stepper]'));
    const renderSteppers = () => {
      counts.veg = Math.min(counts.veg, counts.seats);
      counts.kidChairs = Math.min(counts.kidChairs, counts.seats);
      steppers.forEach((st) => {
        const key = st.dataset.stepper;
        const min = +st.dataset.min;
        const max = key === 'seats' ? +st.dataset.max : Math.min(+st.dataset.max, counts.seats);
        st.querySelector('[data-val]').textContent = counts[key];
        st.querySelectorAll('[data-step]').forEach((b) => {
          const off = +b.dataset.step < 0 ? counts[key] <= min : counts[key] >= max;
          b.disabled = off;
          b.style.opacity = off ? '.3' : '1';
          b.style.cursor = off ? 'not-allowed' : 'pointer';
        });
      });
    };
    steppers.forEach((st) => {
      st.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
        counts[st.dataset.stepper] += +b.dataset.step;
        renderSteppers();
      }));
    });
    renderSteppers();

    const extra = this.$('attendExtra');
    const isAttending = () => radios.some((r) => r.checked && r.value === '會出席');

    radios.forEach((r) => r.addEventListener('change', () => {
      radios.forEach((x) => {
        const dot = form.querySelector('[data-dot="' + x.value + '"]');
        if (dot) dot.style.transform = x.checked ? 'scale(1)' : 'scale(0)';
      });
      if (extra) {
        const on = isAttending();
        extra.style.maxHeight = on ? extra.scrollHeight + 'px' : '0';
        extra.style.opacity = on ? '1' : '0';
      }
      validate();
    }));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (btn.disabled || this._sending) return;
      this._sending = true;
      err.style.display = 'none';
      const label = btn.textContent;
      btn.textContent = '送出中⋯';
      setBtn(false);
      btn.disabled = true;

      const attend = radios.find((r) => r.checked);
      const msg = wish ? wish.value.trim() : '';
      const going = isAttending();
      const ok = await this.sendRSVP({
        name: name.value.trim(),
        phone: phone.value.trim(),
        attend: attend ? attend.value : '',
        seats: going ? counts.seats : 0,
        veg: going ? counts.veg : 0,
        kidChairs: going ? counts.kidChairs : 0,
        wish: msg
      });
      this._sending = false;

      if (ok) {
        form.style.opacity = '0';
        setTimeout(() => {
          form.style.display = 'none';
          const done = this.$('rsvpDone');
          done.style.display = 'flex';
          requestAnimationFrame(() => { done.style.opacity = '1'; });
        }, 500);
      } else {
        btn.textContent = label;
        setBtn(true);
        err.style.display = 'block';
      }
    });
  }

  async sendRSVP(data) {
    const body = JSON.stringify(data);
    try {
      const r = await fetch(CONFIG.rsvpEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body
      });
      if (r.ok) return true;
    } catch (e) { /* 改用 no-cors 再試一次 */ }
    try {
      await fetch(CONFIG.rsvpEndpoint, { method: 'POST', mode: 'no-cors', body });
      return true;
    } catch (e) {
      return false;
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   3. 啟動
   ═══════════════════════════════════════════════════════════ */
const invite = new Invite();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => invite.start());
} else {
  invite.start();
}
