(() => {
  "use strict";
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const TextPlugin = window.TextPlugin;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!gsap || !ScrollTrigger) {
    document.getElementById("loader")?.remove();
    document.getElementById("loader-curtain")?.remove();
    document.getElementById("navbar")?.style.setProperty("opacity", "1");
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  if (TextPlugin) gsap.registerPlugin(TextPlugin);

  const lenis = window.Lenis && !reducedMotion ? new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
    smoothTouch: false,
    touchMultiplier: 2
  }) : null;
  if (lenis) {
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  /* 2026-11 五卡轮：暴露 Lenis 句柄供 work-overlay.js 在详情覆盖层打开时 stop()/关闭时 start()，不改动本文件其余 runtime */
  window.__lenis = lenis || null;

  function initCursor() {
    const dot = document.querySelector(".cursor-dot");
    const outline = document.querySelector(".cursor-outline");
    if (!dot || !outline || matchMedia("(max-width: 767px)").matches) return;
    let mouseX = 0, mouseY = 0, cursorX = 0, cursorY = 0;
    addEventListener("mousemove", (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      gsap.set(dot, { x: mouseX, y: mouseY });
    });
    const follow = () => {
      cursorX += (mouseX - cursorX) * .2;
      cursorY += (mouseY - cursorY) * .2;
      outline.style.left = `${cursorX}px`;
      outline.style.top = `${cursorY}px`;
      requestAnimationFrame(follow);
    };
    follow();
    document.querySelectorAll(".magnetic-btn").forEach((button) => {
      button.addEventListener("mousemove", (event) => {
        const rect = button.getBoundingClientRect();
        gsap.to(button, { x: (event.clientX - rect.left - rect.width / 2) * .3, y: (event.clientY - rect.top - rect.height / 2) * .3, duration: .3 });
        gsap.to(outline, { scale: 1.5, opacity: .5, duration: .3 });
      });
      button.addEventListener("mouseleave", () => {
        gsap.to(button, { x: 0, y: 0, duration: .3 });
        gsap.to(outline, { scale: 1, opacity: 1, duration: .3 });
      });
    });
  }

  function initLoader() {
    const typewriter = document.getElementById("typewriter");
    const typewriterText = typewriter?.textContent.trim() || "";
    if (typewriter) typewriter.textContent = "";
    gsap.set(".hero-reveal", { y: 100, autoAlpha: 0 });
    gsap.set(".hero-img-container", { scale: .9, autoAlpha: 0 });
    gsap.set("#navbar", { autoAlpha: 0 });
    let exited = false;
    const exit = () => {
      if (exited) return;
      exited = true;
      const counter = { value: 0 };
      gsap.timeline({
        onComplete: () => {
          document.getElementById("loader")?.remove();
          document.getElementById("loader-curtain")?.remove();
          ScrollTrigger.refresh();
        }
      })
        .to(counter, { value: 100, duration: reducedMotion ? .1 : 1.5, ease: "power2.inOut", onUpdate: () => {
          const value = document.getElementById("loader-percent");
          if (value) value.textContent = `${Math.floor(counter.value)}%`;
        }})
        .to("#loader", { yPercent: -100, duration: reducedMotion ? .1 : .7, ease: "power4.inOut" })
        .to("#loader-curtain", { yPercent: -100, duration: reducedMotion ? .1 : .7, ease: "power4.inOut" }, "-=.55")
        .to("#navbar", { autoAlpha: 1, duration: .4 })
        .to(".hero-reveal", { y: 0, autoAlpha: 1, stagger: .08, duration: .8, ease: "power3.out" }, "-=.3")
        .to(".hero-img-container", { scale: 1, autoAlpha: 1, duration: 1, ease: "power3.out" }, "-=.8")
        .add(() => {
          if (!typewriter) return;
          if (TextPlugin && !reducedMotion) gsap.to(typewriter, { text: typewriterText, duration: 2.2, ease: "none" });
          else typewriter.textContent = typewriterText;
        }, "-=.2");
    };
    addEventListener("load", () => setTimeout(exit, 120), { once: true });
    setTimeout(exit, 2600);
    if (document.readyState === "complete") setTimeout(exit, 80);
  }

  function initContentMotion() {
    const source = document.querySelector(".marquee-source");
    const clone = document.querySelector(".marquee-clone");
    if (source && clone) clone.textContent = source.textContent;
    if (!reducedMotion) {
      gsap.to(".marquee-track", { xPercent: -50, ease: "none", duration: 20, repeat: -1 });
      gsap.utils.toArray(".parallax-element").forEach((element) => gsap.to(element, {
        y: () => ScrollTrigger.maxScroll(window) * Number(element.dataset.speed || .2),
        ease: "none",
        scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: true }
      }));
    }
    const map = gsap.timeline({ scrollTrigger: { trigger: "#map-container", start: "top 78%", toggleActions: "play none none reverse" } });
    map.from("#map-container", { scale: .84, opacity: 0, duration: .8, ease: "back.out(1.7)" })
      .fromTo("#map-pin", { y: -70, opacity: 0 }, { y: 0, opacity: 1, duration: .55, ease: "bounce.out" }, "-=.3");
    gsap.utils.toArray('[data-gsap="fade"]').forEach((element) => gsap.from(element, {
      opacity: 0, y: 22, duration: .8,
      scrollTrigger: { trigger: element, start: "top 90%", toggleActions: "play none none reverse" }
    }));
    gsap.utils.toArray('[data-gsap="slide-up"]').forEach((element) => gsap.from(element, {
      opacity: 0, y: 90, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: element, start: "top 86%", toggleActions: "play none none reverse" }
    }));
    gsap.utils.toArray('[data-gsap="service-item"]').forEach((element, index) => gsap.from(element, {
      opacity: 0, y: 50, duration: .8, delay: index * .08,
      scrollTrigger: { trigger: element, start: "top 90%", toggleActions: "play none none reverse" }
    }));
  }

  function initChronometer() {
    const section = document.getElementById("chronometer");
    const source = document.getElementById("careerOrigin")?.textContent.trim() || section?.dataset.careerStart;
    const fallback = section?.dataset.careerStart || "2018-01-01T00:00:00";
    const origin = Number.isNaN(new Date(source).getTime()) ? new Date(fallback) : new Date(source);
    const update = () => {
      const now = new Date();
      let years = now.getFullYear() - origin.getFullYear();
      let months = now.getMonth() - origin.getMonth();
      let days = now.getDate() - origin.getDate();
      let hours = now.getHours() - origin.getHours();
      let minutes = now.getMinutes() - origin.getMinutes();
      let seconds = now.getSeconds() - origin.getSeconds();
      if (seconds < 0) { seconds += 60; minutes--; }
      if (minutes < 0) { minutes += 60; hours--; }
      if (hours < 0) { hours += 24; days--; }
      if (days < 0) { days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); months--; }
      if (months < 0) { months += 12; years--; }
      const values = { years, months, days, hours, minutes, seconds };
      Object.entries(values).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = String(Math.max(0, value)).padStart(2, "0");
      });
      const bar = document.getElementById("sec-bar");
      if (bar) bar.style.width = `${seconds / 60 * 100}%`;
      /* 2026-11：移除对 #dynamic-exp 的年数覆写 —— 该数据位本轮改为「核心能力方向 / Skill Areas = 5」（用户 CORE SKILLS 01–05 计数），
         不再是从业年限；计时器六个单位的实时走动不受影响。 */
    };
    update();
    setInterval(update, 1000);
  }

  function initWorks() {
    const wrapper = document.getElementById("works-wrapper");
    const container = document.getElementById("works-container");
    if (!wrapper || !container) return;
    const distance = () => -Math.max(0, wrapper.scrollWidth - innerWidth);
    const tween = gsap.to(wrapper, { x: distance, ease: "none" });
    ScrollTrigger.create({
      trigger: container,
      start: "top top",
      end: () => `+=${Math.max(1, wrapper.scrollWidth - innerWidth)}`,
      pin: true,
      animation: tween,
      scrub: 1,
      invalidateOnRefresh: true,
      anticipatePin: 1
    });
  }

  function initSkillsLine() {
    gsap.to("#scroll-line", {
      height: "100%", ease: "none",
      scrollTrigger: { trigger: ".timeline-line", start: "top center", end: "bottom center", scrub: .5 }
    });
  }

  function initJumps() {
    document.querySelectorAll("[data-jump]").forEach((button) => button.addEventListener("click", () => {
      document.getElementById(button.dataset.jump)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    }));
  }

  /* 2026-11 本轮：Hero 两条 CTA 锚点跳转（查看作品 Works → #works；联系我 Contact → #contact）。
     href 已是纯区块锚点，与覆盖层 hash 路由 #/work/<key> 不冲突；点击 preventDefault 避免写入 hash，
     滚动一律走 window.__lenis.scrollTo（offset 补偿固定导航高度），句柄不可用时回退原生 scrollIntoView；
     按钮文案/class/磁吸/hover 全部未动。 */
  function initHeroCta() {
    const NAV_OFFSET = -90; // 固定导航栏高度补偿（navbar p-8 + 内容高约 92px 的近似值），避免滚到位后标题被导航遮挡
    document.querySelectorAll('[data-copy-target="hero.cta.primary"], [data-copy-target="hero.cta.secondary"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        const target = document.querySelector(link.getAttribute("href"));
        if (!target) return;
        event.preventDefault();
        if (window.__lenis && window.__lenis.scrollTo) {
          window.__lenis.scrollTo(target, { offset: NAV_OFFSET, duration: reducedMotion ? 0 : undefined });
        } else {
          target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
        }
      });
    });
  }

  /* 2026-11-18 本轮：结尾作品墙图片逐 tile 延迟注入 —— 38 个墙 img 初始无 src（URL 存 data-wall-src），
     以 IntersectionObserver 逐 tile 观察（rootMargin 四周预取），tile 临近视口（含横向滚入）时才注入 src 并 unobserve；
     任一时刻只有视口内/边约 8–10 张在载，避免「整墙一次性注入」在沙箱滚动检测/弱网下同时拉 38 张大图耗尽渲染预算；
     注入后 img 仍带 loading="lazy"，视口外继续推迟。与覆盖层 data-src 开层注入同思路；IO 不可用时立即全量注入兜底。 */
  function initWorksWall() {
    const wall = document.getElementById("works-wall");
    if (!wall) return;
    const imgs = Array.from(wall.querySelectorAll("img[data-wall-src]"));
    const fill = (img) => {
      if (!img.getAttribute("src")) img.setAttribute("src", img.dataset.wallSrc);
    };
    if (!("IntersectionObserver" in window)) { imgs.forEach(fill); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        fill(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: "200px 400px 200px 400px" });
    imgs.forEach((img) => io.observe(img));
  }

  initCursor();
  initLoader();
  initContentMotion();
  initChronometer();
  initWorks();
  initSkillsLine();
  initJumps();
  initHeroCta();
  initWorksWall();
  addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
})();
