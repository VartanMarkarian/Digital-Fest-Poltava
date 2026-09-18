// Контури відновлення. Міжпростір — інтерактивність

document.addEventListener("DOMContentLoaded", () => {
  initSplash();
  initHeadingGlitch();
  initParticipantCards();
  initMobilePortraitGlitch();
  initLangToggle();
  initLightboxes();
  initMobileNav();
});

/* На дотикових екранах :hover недоступний, тож інверсія-глітч на портретах
   (у гріді учасників і на сторінці учасника) ніколи не спрацьовує.
   Тут відтворюємо той самий "burst"-глітч періодично й по тапу. */
function initMobilePortraitGlitch() {
  if (!window.matchMedia("(hover: none)").matches) return;

  const targets = [...document.querySelectorAll(".p-card")];
  const detailPhoto = document.querySelector(".detail-photo");
  if (detailPhoto) targets.push(detailPhoto);
  if (!targets.length) return;

  function burstOne(el) {
    el.classList.add("glitching");
    setTimeout(() => el.classList.remove("glitching"), 480);
  }

  if (detailPhoto) {
    detailPhoto.addEventListener("click", () => burstOne(detailPhoto));
  }

  function tick() {
    const el = targets[Math.floor(Math.random() * targets.length)];
    burstOne(el);
    setTimeout(tick, 1800 + Math.random() * 2200);
  }
  setTimeout(tick, 900);
}

/* Мобільне меню-гамбургер у хедері */
function initMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-header nav");
  if (!toggle || !nav) return;

  const close = () => {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };
  const open = () => {
    nav.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
  };

  toggle.addEventListener("click", () => {
    if (nav.classList.contains("open")) close();
    else open();
  });
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
  document.addEventListener("click", (e) => {
    if (!nav.classList.contains("open")) return;
    if (!nav.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) close();
  });
}

/* Заставка при завантаженні сторінки */
function initSplash() {
  const splash = document.getElementById("splash");
  if (!splash) return;
  const done = () => splash.classList.add("hide");
  window.addEventListener("load", () => setTimeout(done, 900));
  setTimeout(done, 2600); // запобіжник, якщо load довго не настає
  splash.addEventListener("click", done);
}

/* Бере лише видимий текст заголовка — приховані data-lang версії (напр. EN, коли активна UA) не враховуються */
function getVisibleText(el) {
  const clone = el.cloneNode(true);
  const original = el.querySelectorAll("[data-lang]");
  const cloned = clone.querySelectorAll("[data-lang]");
  original.forEach((node, i) => {
    if (getComputedStyle(node).display === "none") {
      cloned[i].remove();
    }
  });
  return clone.textContent.replace(/\s+/g, " ").trim();
}

/* Періодичний легкий glitch на великих заголовках */
function initHeadingGlitch() {
  const nodes = document.querySelectorAll("[data-glitch]");
  nodes.forEach((el) => {
    el.classList.add("glitch");
    const fire = () => {
      el.setAttribute("data-text", getVisibleText(el));
      el.classList.remove("play");
      // reflow, щоб анімація перезапустилась
      void el.offsetWidth;
      el.classList.add("play");
    };
    let timer = setInterval(fire, 5200 + Math.random() * 3000);
    el.addEventListener("mouseenter", fire);
    el.addEventListener("mouseleave", () => {
      clearInterval(timer);
      timer = setInterval(fire, 5200 + Math.random() * 3000);
    });
  });
}

/* Клік по картці учасника: глітч-спалах, потім перехід */
function initParticipantCards() {
  const cards = document.querySelectorAll(".p-card");
  cards.forEach((card) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      const href = card.getAttribute("data-href");
      card.classList.add("glitching");

      if (!href) {
        // сторінка учасника ще в розробці — просто показуємо ефект
        setTimeout(() => card.classList.remove("glitching"), 500);
        return;
      }
      setTimeout(() => {
        window.location.href = href;
      }, 380);
    });
  });
}

/* Мапа / постер: повноекранний перегляд із панорамою (ЛКМ) та зумом (колесико).
   Кілька тригерів (напр. галерея постерів) можуть ділити один lightbox —
   механіку пан/зум ініціалізуємо для кожного lightbox лише один раз. */
function initLightboxes() {
  const triggers = document.querySelectorAll("[data-lightbox-target]");
  if (!triggers.length) return;

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;
  const lightboxApis = new Map();

  function setupLightbox(lightbox) {
    if (lightboxApis.has(lightbox)) return lightboxApis.get(lightbox);

    const closeBtn = lightbox.querySelector("[data-lightbox-close]");
    const viewport = lightbox.querySelector(".pz-viewport");
    const image = lightbox.querySelector(".pz-image");

    let scale = 1;
    let x = 0;
    let y = 0;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startPanX = 0;
    let startPanY = 0;
    let swipeIsTouch = false;

    /* група елементів (напр. галерея постерів) для гортання вбік без закриття */
    let items = [];
    let currentIndex = -1;

    /* Масштаб міняємо через реальний width/height (px), а не CSS transform:scale —
       інакше браузер лише розтягує вже маленький растер (закешований під розмір
       контейнера), і зображення розмивається задовго до реального лімілу якості файлу. */
    let baseW = 0;
    let baseH = 0;
    let dynamicMaxScale = MAX_SCALE;

    const computeBaseSize = () => {
      const nw = image.naturalWidth || 0;
      const nh = image.naturalHeight || 0;
      if (!nw || !nh) return;
      const maxW = window.innerWidth * 0.9;
      const maxH = window.innerHeight * 0.85;
      const ratio = Math.min(maxW / nw, maxH / nh, 1);
      baseW = nw * ratio;
      baseH = nh * ratio;
      // дозволяємо зумити принаймні до природної роздільної здатності файлу
      dynamicMaxScale = Math.max(MAX_SCALE, nw / baseW);
    };
    image.addEventListener("load", () => {
      computeBaseSize();
      applyTransformSize();
    });

    const applyTransformSize = () => {
      if (baseW && baseH) {
        image.style.width = baseW * scale + "px";
        image.style.height = baseH * scale + "px";
      }
    };
    const applyTransform = () => {
      applyTransformSize();
      image.style.transform = `translate(${x}px, ${y}px)`;
    };
    const reset = () => {
      scale = 1;
      x = 0;
      y = 0;
      computeBaseSize();
      applyTransform();
    };

    const openIndex = (idx) => {
      if (!items.length) return;
      currentIndex = ((idx % items.length) + items.length) % items.length;
      const item = items[currentIndex];
      image.src = item.src;
      if (item.alt) image.alt = item.alt;
      reset();
    };
    const next = () => openIndex(currentIndex + 1);
    const prev = () => openIndex(currentIndex - 1);

    const open = (src, alt, group, index) => {
      if (group) {
        items = group;
        openIndex(index != null ? index : 0);
      } else {
        items = [];
        currentIndex = -1;
        if (src) {
          image.src = src;
          if (alt) image.alt = alt;
        }
        reset();
      }
      lightbox.classList.add("open");
      document.body.style.overflow = "hidden";
    };
    const close = () => {
      lightbox.classList.remove("open");
      document.body.style.overflow = "";
    };

    closeBtn.addEventListener("click", close);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) close();
    });
    document.addEventListener("keydown", (e) => {
      if (!lightbox.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    });

    /* панорама лівою кнопкою миші (та тачем); на телефоні — гортання вбік між постерами,
       щіпок двома пальцями — зум (бо wheel-подій на дотику немає) */
    const activePointers = new Map();
    let pinchStartDist = 0;
    let pinchStartScale = 1;
    let pinchMidX = 0;
    let pinchMidY = 0;

    const getMidpoint = () => {
      const pts = [...activePointers.values()];
      return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    };
    const getDistance = () => {
      const pts = [...activePointers.values()];
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    };
    const beginPinch = () => {
      pinchStartDist = getDistance();
      pinchStartScale = scale;
      const rect = viewport.getBoundingClientRect();
      const mid = getMidpoint();
      pinchMidX = mid.x - rect.left - rect.width / 2;
      pinchMidY = mid.y - rect.top - rect.height / 2;
    };

    viewport.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try {
        viewport.setPointerCapture && viewport.setPointerCapture(e.pointerId);
      } catch (err) {
        /* деякі браузери/синтетичні події можуть відхилити capture — не критично */
      }

      if (activePointers.size === 2) {
        dragging = false;
        beginPinch();
      } else if (activePointers.size === 1) {
        dragging = true;
        swipeIsTouch = e.pointerType === "touch";
        viewport.classList.add("dragging");
        startX = e.clientX;
        startY = e.clientY;
        startPanX = x;
        startPanY = y;
      }
    });
    viewport.addEventListener("pointermove", (e) => {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size >= 2) {
        const prevScale = scale;
        const dist = getDistance();
        const newScale = Math.min(dynamicMaxScale, Math.max(MIN_SCALE, pinchStartScale * (dist / pinchStartDist)));
        const ratio = newScale / prevScale;
        x = pinchMidX - (pinchMidX - x) * ratio;
        y = pinchMidY - (pinchMidY - y) * ratio;
        scale = newScale;
        applyTransform();
        return;
      }

      if (!dragging) return;
      x = startPanX + (e.clientX - startX);
      y = startPanY + (e.clientY - startY);
      applyTransform();
    });
    const stopDrag = (e) => {
      if (e) activePointers.delete(e.pointerId);

      if (activePointers.size >= 2) {
        beginPinch();
        return;
      }
      if (activePointers.size === 1 && swipeIsTouch) {
        const [remaining] = activePointers.values();
        dragging = true;
        startX = remaining.x;
        startY = remaining.y;
        startPanX = x;
        startPanY = y;
        return;
      }

      dragging = false;
      viewport.classList.remove("dragging");
      if (!e || !swipeIsTouch || items.length < 2) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (scale <= 1.02 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        dx < 0 ? next() : prev();
      }
    };
    viewport.addEventListener("pointerup", stopDrag);
    viewport.addEventListener("pointercancel", stopDrag);
    viewport.addEventListener("pointerleave", stopDrag);

    /* зум колесиком мишки */
    viewport.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const prevScale = scale;
        const delta = -e.deltaY * 0.0015;
        scale = Math.min(dynamicMaxScale, Math.max(MIN_SCALE, scale * (1 + delta)));
        // масштабуємо відносно центру курсора у вьюпорті
        const rect = viewport.getBoundingClientRect();
        const cx = e.clientX - rect.left - rect.width / 2;
        const cy = e.clientY - rect.top - rect.height / 2;
        const ratio = scale / prevScale;
        x = cx - (cx - x) * ratio;
        y = cy - (cy - y) * ratio;
        applyTransform();
      },
      { passive: false }
    );

    const api = { open, close };
    lightboxApis.set(lightbox, api);
    return api;
  }

  /* тригери з data-lightbox-src групуємо по спільному lightbox — це дає порядок для гортання */
  const groups = new Map();
  triggers.forEach((trigger) => {
    const targetId = trigger.getAttribute("data-lightbox-target");
    const src = trigger.getAttribute("data-lightbox-src");
    if (!src) return;
    if (!groups.has(targetId)) groups.set(targetId, []);
    groups.get(targetId).push({ src, alt: trigger.getAttribute("data-lightbox-alt") });
  });

  triggers.forEach((trigger) => {
    const targetId = trigger.getAttribute("data-lightbox-target");
    const lightbox = document.getElementById(targetId);
    if (!lightbox) return;
    const api = setupLightbox(lightbox);
    const src = trigger.getAttribute("data-lightbox-src");
    const group = groups.get(targetId);
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      if (src && group && group.length > 1) {
        api.open(null, null, group, group.findIndex((it) => it.src === src));
      } else {
        api.open(src, trigger.getAttribute("data-lightbox-alt"));
      }
    });
  });
}

/* Перемикач мов UA / EN на сторінці учасника — вибір зберігається між сторінками */
const LANG_KEY = "kv-lang";

function applyStoredLang() {
  const toggle = document.querySelector(".lang-toggle");
  if (!toggle) return;
  let lang = "ua";
  try {
    lang = localStorage.getItem(LANG_KEY) || "ua";
  } catch (e) {
    /* сховище недоступне — лишаємось на UA */
  }
  const buttons = toggle.querySelectorAll("button");
  buttons.forEach((b) => b.classList.remove("active"));
  const target = toggle.querySelector(`[data-set-lang="${lang}"]`);
  if (target) target.classList.add("active");
  document.body.classList.toggle("lang-en", lang === "en");
}

function initLangToggle() {
  const toggle = document.querySelector(".lang-toggle");
  if (!toggle) return;
  applyStoredLang();
  const buttons = toggle.querySelectorAll("button");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const lang = btn.getAttribute("data-set-lang");
      document.body.classList.toggle("lang-en", lang === "en");
      try {
        localStorage.setItem(LANG_KEY, lang);
      } catch (e) {
        /* сховище недоступне — просто не збережеться між сторінками */
      }
    });
  });
}
