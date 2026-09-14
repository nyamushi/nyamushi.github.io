/* ==========================================================================
   交互脚本 —— 导航 / 滚动动效 / 项目筛选 / 图集灯箱
   非模块脚本，可直接 file:// 双击打开
   ========================================================================== */
(function () {
  'use strict';

  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- 导航 */
  function initNav() {
    const nav   = $('.nav');
    const bar   = $('.nav__progress');
    const links = $$('.nav__link[href^="#"]');
    const bur   = $('.nav__burger');
    const menu  = $('.nav__links');

    if (nav) {
      let ticking = false;
      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const y = window.scrollY;
          nav.classList.toggle('is-scrolled', y > 12);
          if (bar) {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + '%';
          }
          ticking = false;
        });
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    if (bur && menu) {
      bur.addEventListener('click', () => {
        const open = menu.classList.toggle('is-open');
        bur.classList.toggle('is-open', open);
        bur.setAttribute('aria-expanded', String(open));
      });
      $$('a', menu).forEach(a => a.addEventListener('click', () => {
        menu.classList.remove('is-open');
        bur.classList.remove('is-open');
        bur.setAttribute('aria-expanded', 'false');
      }));
    }

    /* 滚动定位当前区块 */
    if (links.length && 'IntersectionObserver' in window) {
      const sections = links
        .map(a => ({ a, el: document.getElementById(a.getAttribute('href').slice(1)) }))
        .filter(s => s.el);
      if (sections.length) {
        const io = new IntersectionObserver(entries => {
          entries.forEach(e => {
            if (!e.isIntersecting) return;
            links.forEach(l => l.classList.remove('is-active'));
            const hit = sections.find(s => s.el === e.target);
            if (hit) hit.a.classList.add('is-active');
          });
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
        sections.forEach(s => io.observe(s.el));
      }
    }
  }

  /* ------------------------------------------------------------ 滚动显现 */
  let revealObserver = null;

  /* 可重复调用：动态注入的 [data-reveal] 需要重新观察 */
  function initReveal() {
    const els = $$('[data-reveal]:not(.is-in)');
    if (!els.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('is-in'));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          obs.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    }
    els.forEach(el => revealObserver.observe(el));
  }

  window.__reveal = initReveal;

  /* ------------------------------------------------------- 数字滚动计数 */
  function initCounters() {
    const nums = $$('[data-count]');
    if (!nums.length || reduced || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        obs.unobserve(el);
        const target = parseFloat(el.dataset.count);
        const decimals = (el.dataset.count.split('.')[1] || '').length;
        const dur = 1100;
        const t0 = performance.now();
        const tick = now => {
          const p = Math.min(1, (now - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (target * eased).toFixed(decimals);
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = target.toFixed(decimals);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    nums.forEach(n => io.observe(n));
  }

  /* --------------------------------------------------------- 项目卡片渲染 */
  /* CSS 自定义属性里的 url() 按「样式表所在目录」解析，不是按文档位置解析。
     样式表位于 assets/css/，因此这里把站点根路径补成 ../../
     保证 http:// 与 file:// 两种打开方式都能正确取到图片。 */
  function rootRel(src) {
    return '../../' + String(src).replace(/^\.?\//, '');
  }

  function cardHTML(p) {
    const wide = p.cardWide ? ' card--wide' : '';
    const badge = p.awardBadge
      ? `<span class="card__badge card__badge--award">${p.award}</span>`
      : (p.award ? `<span class="card__badge">${p.award}</span>` : '');

    const media = p.noImage
      ? `<div class="card__media card__media--blank" aria-hidden="true">
           <span class="mono">${p.noImageLabel || 'COURSEWORK'}</span>
         </div>`
      : `<div class="card__media" style="--media:url('${rootRel(p.cover)}')">
           <img src="${p.cover}" alt="${p.coverAlt || p.title}" loading="lazy" decoding="async">
         </div>`;

    return `<article class="card${wide}" data-cat="${p.catKey}" data-reveal style="--d:${(Number(p.index) - 1) * 70}ms">
      <a class="card__link" href="projects/${p.slug}.html" aria-label="${p.title} 项目详情"></a>
      ${media}
      <span class="card__index">${p.index}</span>
      ${badge}
      <div class="card__body">
        <div class="card__top">
          <h3 class="card__title">${p.title}</h3>
          <span class="card__year">${p.year}</span>
        </div>
        <p class="card__sub">${p.cardSub || p.subtitle || ''}</p>
        <div class="card__foot">
          <span class="card__role">${p.role}</span>
          <span class="card__go">查看项目 <span class="arrow">→</span></span>
        </div>
      </div>
    </article>`;
  }

  /* 收尾卡片：与项目卡片等大，补满网格最后一格，
     同时给面试官一个「留住作品集 / 直接联系」的快捷入口。
     注意：线上不发布简历文件（含手机号邮箱），因此提供「导出 PDF」而不是简历下载。 */
  function ctaHTML() {
    return `<article class="card card--cta" data-cat="all" data-reveal style="--d:350ms">
      <div class="card__media card__media--cta" aria-hidden="true">
        <span class="cta__glyph">M</span>
        <span class="cta__note">PORTFOLIO · CONTACT</span>
      </div>
      <div class="card__body">
        <div class="card__top">
          <h3 class="card__title">想留一份带走？</h3>
          <span class="card__year">PDF</span>
        </div>
        <p class="card__sub">可一键导出为 PDF 存档，或直接邮件 / 电话联系我 —— 杭州及周边可随时安排面试。</p>
        <div class="card__foot card__cta">
          <button class="btn btn--primary btn--sm" type="button" onclick="window.print()">导出 PDF <span class="btn__arrow">→</span></button>
          <a class="btn btn--ghost btn--sm" href="mailto:3027891801@qq.com?subject=面试邀约 - 毛安 工业设计">发送邮件</a>
        </div>
      </div>
    </article>`;
  }

  function initCards() {
    const grid = $('#projectGrid');
    if (!grid || typeof PROJECTS === 'undefined') return;

    grid.innerHTML = PROJECTS.map(cardHTML).join('') + ctaHTML();
    initReveal();

    /* ---- 分类筛选 ---- */
    const bar = $('#filters');
    if (!bar) return;
    const cats = [{ key: 'all', label: '全部' }];
    PROJECTS.forEach(p => {
      if (!cats.some(c => c.key === p.catKey)) cats.push({ key: p.catKey, label: p.category });
    });
    bar.innerHTML = cats.map((c, i) => {
      const n = c.key === 'all' ? PROJECTS.length : PROJECTS.filter(p => p.catKey === c.key).length;
      return `<button class="filter${i === 0 ? ' is-active' : ''}" data-f="${c.key}">${c.label}<span class="filter__n">${n}</span></button>`;
    }).join('');

    const empty = $('#cardsEmpty');
    bar.addEventListener('click', e => {
      const btn = e.target.closest('.filter');
      if (!btn) return;
      $$('.filter', bar).forEach(b => b.classList.toggle('is-active', b === btn));
      const f = btn.dataset.f;
      let shown = 0;
      $$('.card', grid).forEach(card => {
        const ok = f === 'all' || card.dataset.cat === f;
        card.classList.toggle('is-hidden', !ok);
        if (ok) shown++;
      });
      /* 收尾卡片（简历/联系）在任何筛选下都保留 */
      $$('.card--cta', grid).forEach(card => {
        card.classList.remove('is-hidden');
        shown++;
      });
      if (empty) empty.classList.toggle('is-shown', shown === 0);
    });
  }

  /* ------------------------------------------------------------- 灯箱 */
  function initLightbox() {
    if (!$('.zoomable')) return;

    const lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', '图片放大预览');
    lb.innerHTML = `
      <button class="lb__close" aria-label="关闭预览">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M1 1l14 14M15 1L1 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </button>
      <img class="lb__img" alt="">
      <div class="lb__bar"><span class="lb__cap"></span><span>点击空白处或按 ESC 关闭</span></div>`;
    document.body.appendChild(lb);

    const img = $('.lb__img', lb);
    const cap = $('.lb__cap', lb);
    let lastFocus = null;

    const open = (src, alt, caption) => {
      lastFocus = document.activeElement;
      img.src = src;
      img.alt = alt || '';
      cap.textContent = caption || '';
      lb.classList.add('is-open');
      document.body.classList.add('is-locked');
      $('.lb__close', lb).focus();
    };
    const close = () => {
      lb.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      setTimeout(() => { img.removeAttribute('src'); }, 300);
      if (lastFocus) lastFocus.focus();
    };

    $$('.zoomable').forEach(el => {
      el.addEventListener('click', () => {
        const source = el.dataset.full || el.currentSrc || el.src;
        const caption = el.dataset.caption || (el.closest('figure') ? ($('figcaption', el.closest('figure')) || {}).textContent : '') || '';
        open(source, el.alt, caption.trim());
      });
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
      });
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
    });

    lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('.lb__close')) close(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && lb.classList.contains('is-open')) close();
    });
  }

  /* ------------------------------------------------------- 平滑锚点滚动 */
  function initAnchors() {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY -
                  (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 68) - 16;
      window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
    });
  }

  /* ------------------------------------------------------ 图片加载淡入 */
  function initImageFade() {
    $$('img[loading="lazy"]').forEach(img => {
      if (img.complete) return;
      img.style.opacity = '0';
      img.style.transition = 'opacity .6s ease';
      const show = () => { img.style.opacity = '1'; };
      img.addEventListener('load', show, { once: true });
      img.addEventListener('error', show, { once: true });
    });
  }

  /* --------------------------------------------------------------- 启动 */
  function boot() {
    initNav();
    initCards();
    initReveal();
    initCounters();
    initLightbox();
    initAnchors();
    initImageFade();
    document.getElementById('boot')?.remove();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
