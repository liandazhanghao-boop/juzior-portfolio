/* 2026-11 五卡轮：作品卡点击 → 同页全屏详情覆盖层（hash 路由 #/work/<key>）
   - 打开：写 hash；hashchange 统一开/关层（前进/后退/首屏带 hash 直访均走同一入口）
   - 打开时：html.overlay-open 锁页面滚动 + window.__lenis.stop()；层内 .wo-scroll 原生滚动
   - 关闭：右上角按钮 / Esc / 点击内容纸面之外的遮罩；关闭后焦点回到触发卡片，lenis.start() 并恢复滚动位置
   - 卡片 role=button + tabindex=0：click 与 Enter/Space 均可触发；磁吸以低系数作用于五卡
   - 覆盖层节点一律 .wo-* / wo- 前缀，不与存量 selector 冲突；不触碰 gsap/lenis 既有初始化
   2026-11 本轮（C 组）层内滚动修复：
   - 根因：Lenis 1.0.42 在 window 绑 wheel 并 preventDefault（stopped 只跳过自身滚动、不跳过 preventDefault），
     层内滚轮事件冒泡到 window 后被吞；键盘滚动键同理落在被 html.overlay-open 锁死的 window 上无效。
   - 修复：每个 .wo-scroll 挂 wheel({passive:false})：preventDefault + stopPropagation 阻断到 window/Lenis 的路径，
     再按 deltaMode（1=line×16px、2=page×clientHeight）自累加 scrollTop；overscroll-behavior:contain 已在 CSS 显式声明，
     到边后不会链式带动主站；触控板惯性即连续 wheel 事件，同一通路。
   - 键盘：window keydown 仅在开层时接管 PageDown/PageUp/Space(Shift 反向)/ArrowUp/ArrowDown/Home/End 写 .wo-scroll.scrollTop；
     target 为 button/a/input 等交互元素或修饰键组合时原样 return；Esc 不在接管名单内，仍走全局 dismiss。
   - 触摸：Lenis smoothTouch:false 不绑 touch，.wo-scroll 原生触摸滚动不受影响；滚动条拖拽/中键为 .wo-scroll 原生行为。
   - 不取消 lenis.stop()/start() 配对、不移除 html.overlay-open；开层 scrollTop=0 重置沿用 setOpen 既有逻辑；
     .wo-scroll 无 max-height 截断（position:absolute;inset:0 高度=视口，内容多高滚多高）。 */
(() => {
  "use strict";
  const OVERLAYS = Array.from(document.querySelectorAll(".work-overlay"));
  if (!OVERLAYS.length) return;
  const byKey = new Map(OVERLAYS.map((el) => [el.dataset.workKey, el]));
  const cards = Array.from(document.querySelectorAll(".work-item[data-work]"));
  let openKey = null;
  let lastTrigger = null;
  let savedScrollY = 0;
  let hashPushed = false; // 本会话内由卡片点击写入的 hash 才允许用 history.back() 撤销；首屏直访/手输 hash 用 replaceState 清除

  const keyFromHash = () => {
    const m = location.hash.match(/^#\/work\/([a-z0-9-]+)$/i);
    return m && byKey.has(m[1].toLowerCase()) ? m[1].toLowerCase() : null;
  };

  function setOpen(overlay, open) {
    overlay.classList.toggle("is-open", open);
    overlay.setAttribute("aria-hidden", open ? "false" : "true");
    const scroller = overlay.querySelector(".wo-scroll");
    if (scroller) scroller.scrollTop = 0;
  }

  function show(key) {
    if (openKey === key) return;
    if (openKey) setOpen(byKey.get(openKey), false);
    savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const overlay = byKey.get(key);
    setOpen(overlay, true);
    /* 层内图片 URL 存于 data-src（初始 DOM 无 src，避免隐藏层大图被首屏审计/预载计入渲染预算）；开层时注入：首图 eager、图集保留 lazy 属性 */
    overlay.querySelectorAll("img[data-src]").forEach((img) => {
      if (!img.getAttribute("src")) img.setAttribute("src", img.dataset.src);
    });
    openKey = key;
    document.documentElement.classList.add("overlay-open");
    if (window.__lenis && window.__lenis.stop) window.__lenis.stop();
    /* 焦点进 dialog：落在纸面容器（tabindex=-1）而非关闭按钮，避免无交互直访路径上脚本 focus 触发 :focus-visible 朱红态；键盘用户 Tab 即得关闭钮焦点环 */
    const sheet = overlay.querySelector(".wo-sheet");
    if (sheet) {
      sheet.setAttribute("tabindex", "-1");
      sheet.focus({ preventScroll: true });
    }
  }

  function hide() {
    if (!openKey) return;
    setOpen(byKey.get(openKey), false);
    openKey = null;
    document.documentElement.classList.remove("overlay-open");
    if (window.__lenis && window.__lenis.start) window.__lenis.start();
    if (window.__lenis && window.__lenis.scrollTo) window.__lenis.scrollTo(savedScrollY, { immediate: true });
    else window.scrollTo(0, savedScrollY);
    if (lastTrigger) lastTrigger.focus({ preventScroll: true });
    lastTrigger = null;
  }

  function sync() {
    const key = keyFromHash();
    if (key) show(key);
    else hide();
  }

  cards.forEach((card) => {
    const key = card.dataset.work;
    const go = () => {
      lastTrigger = card;
      if (location.hash === `#/work/${key}`) show(key);
      else {
        hashPushed = true;
        location.hash = `#/work/${key}`;
      }
    };
    card.addEventListener("click", go);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        go();
      }
    });
    /* 磁吸：与 .magnetic-btn 同构但系数降为 .06（卡片面积大，.3 位移过夸张）；光标外圈为全局存量行为 */
    if (window.gsap && !matchMedia("(max-width: 767px)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      card.addEventListener("mousemove", (event) => {
        const rect = card.getBoundingClientRect();
        window.gsap.to(card, {
          x: (event.clientX - rect.left - rect.width / 2) * 0.06,
          y: (event.clientY - rect.top - rect.height / 2) * 0.06,
          duration: 0.35,
          overwrite: "auto"
        });
      });
      card.addEventListener("mouseleave", () => {
        window.gsap.to(card, { x: 0, y: 0, duration: 0.45, overwrite: "auto" });
      });
    }
  });

  function dismiss() {
    if (hashPushed) {
      hashPushed = false;
      history.back();
    } else if (keyFromHash()) {
      history.replaceState(null, "", location.pathname + location.search);
      hide();
    } else {
      hide();
    }
  }

  /* ===== C 组：层内滚轮/触控板滚动 =====
     Lenis 的 window wheel 监听会 preventDefault 吞掉事件（stop() 也不放行），故在 .wo-scroll 上
     以 capture 之前的普通监听先截住：preventDefault 取消浏览器默认滚动、stopPropagation 阻断冒泡到
     window（Lenis 收不到事件），随后按 deltaMode 换算自累加 scrollTop。 */
  const wheelDelta = (event) => {
    if (event.deltaMode === 1) return event.deltaY * 16;      // DOM_DELTA_LINE
    if (event.deltaMode === 2) return event.deltaY * (event.currentTarget.clientHeight || 800); // DOM_DELTA_PAGE
    return event.deltaY;                                      // DOM_DELTA_PIXEL（含触控板惯性）
  };

  OVERLAYS.forEach((overlay) => {
    const scroller = overlay.querySelector(".wo-scroll");
    if (!scroller) return;
    scroller.addEventListener("wheel", (event) => {
      event.preventDefault();
      event.stopPropagation();
      scroller.scrollTop += wheelDelta(event);
    }, { passive: false });
  });

  /* ===== C 组：层内键盘滚动（PageDown/PageUp/空格/↑/↓/Home/End） =====
     挂在 window 上但仅开层时生效；Esc 不在名单内（仍走下方全局 dismiss）；
     焦点在 button/a/input 等交互元素上或带修饰键时原样放行，避免吃掉关闭钮的 Enter/Space 语义。 */
  const KEY_STEPS = { PageDown: 1, PageUp: -1, " ": 1, Spacebar: 1, ArrowDown: 1, ArrowUp: -1, Home: "top", End: "bottom" };
  addEventListener("keydown", (event) => {
    if (!openKey || event.ctrlKey || event.metaKey || event.altKey) return;
    const step = KEY_STEPS[event.key];
    if (step === undefined) return;
    const target = event.target;
    if (target && target.closest && target.closest("button, a, input, textarea, select, [contenteditable]")) return;
    const scroller = byKey.get(openKey)?.querySelector(".wo-scroll");
    if (!scroller) return;
    event.preventDefault();
    if (step === "top") scroller.scrollTop = 0;
    else if (step === "bottom") scroller.scrollTop = scroller.scrollHeight;
    else scroller.scrollTop += step * scroller.clientHeight * 0.9;
  });

  OVERLAYS.forEach((overlay) => {
    overlay.querySelector(".wo-close")?.addEventListener("click", dismiss);
    overlay.addEventListener("mousedown", (event) => {
      /* 遮罩 = 滚动面在内容纸面之外的暗色区域；纸面内点击不关闭 */
      if (event.target === overlay || event.target.classList.contains("wo-scroll")) dismiss();
    });
  });

  addEventListener("keydown", (event) => {
    if (event.key === "Escape" && openKey) dismiss();
  });

  addEventListener("hashchange", () => {
    if (!keyFromHash()) hashPushed = false;
    sync();
  });

  /* 首图加载失败时回落到 data-fallback（LOW-RES 兜底，正常不显示） */
  document.querySelectorAll(".work-overlay img[data-fallback]").forEach((img) => {
    img.addEventListener("error", () => {
      if (img.dataset.fallbackDone) return;
      img.dataset.fallbackDone = "1";
      img.src = img.dataset.fallback;
    }, { once: true });
  });

  if (keyFromHash()) {
    /* 首屏带合法 work hash 直访：等 loader 序列结束后再开层，避免与入场动效抢焦点 */
    const boot = () => setTimeout(sync, 200);
    if (document.readyState === "complete") boot();
    else addEventListener("load", boot, { once: true });
  }
})();
