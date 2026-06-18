/* =========================================================
   UIUX DESIGNER PORTFOLIO — Make it Clear.
   main.js

   구성
   1. 그래픽 컨트롤러 (rAF) — 마우스 렌즈 → 큰 원 → 깔때기 변형/펼침
      · 스크롤 진행도(섹션 중심 기준)에 따라 width/transform/opacity 를 직접 제어
      · "전환 구간"에서만 변형하고 "페이지를 보는 동안"엔 고정(hold)
   2. 인트로 clip-path 렌즈 (선명 텍스트 마스킹)
   3. 섹션 콘텐츠 진입 애니메이션 (GSAP ScrollTrigger)
========================================================= */

(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ===== 요소 ===== */
  const intro = document.getElementById("intro");
  const introInner = intro.querySelector(".intro-inner");
  const clearLayer = intro.querySelector(".intro-text--clear");
  const scrollIndicator = intro.querySelector(".scroll-indicator");
  const circle = document.querySelector(".morph-circle");
  const funnel = document.querySelector(".morph-funnel");
  const feTurb = document.querySelector("#waterRipple feTurbulence");
  const feDisp = document.querySelector("#waterRipple feDisplacementMap");
  const lens = document.querySelector(".intro-lens");
  const lensBg = document.querySelector(".intro-lens-bg");
  const lensVp = document.querySelector(".intro-lens-vp");
  const lensRing = document.querySelector(".intro-lens-ring");

  /* ===== 진입 연출: 물방울이 떨어지며 첫 화면이 선명해짐 ===== */
  // introRevealed: 선명해진 뒤 true → 그때부터 마우스 원/커서 물결이 보임
  let introRevealed = false;
  let introCircleFade = 0; // 원이 톡 튀지 않게 부드럽게 나타나는 0→1 페이드

  if (prefersReduced) {
    intro.classList.add("intro-clear"); // 즉시 선명 상태
    introRevealed = true;
  } else {
    // 흐릿한 초기 상태가 한 번 그려진 뒤(다음 프레임) 물방울 낙하 시작
    requestAnimationFrame(function () {
      intro.classList.add("intro-play");
    });
    // 선명해지는 애니메이션(clarify)이 끝나면 비로소 마우스 원을 보이게 함
    clearLayer.addEventListener("animationend", function () {
      introRevealed = true;
    });
    // 안전장치: animationend 가 오지 않아도 일정 시간 뒤 표시
    setTimeout(function () { introRevealed = true; }, 1800);
  }

  /* ===== 유틸 ===== */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t); // smoothstep (부드러운 가감속)
  };

  /* ===== 마우스 추적 (인트로 렌즈) ===== */
  let target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let current = { x: target.x, y: target.y };

  intro.addEventListener("pointermove", (e) => {
    target.x = e.clientX;
    target.y = e.clientY;
    spawnCursorRipple(e.clientX, e.clientY);
    hasPointer = true; // 커서가 화면에 들어온 뒤부터 표면 일렁임 활성

    // 제목(고정) 위를 지나갈 때만 물결 에너지 충전 → 그 순간만 표면이 일렁임
    if (titleEls.length) {
      const tx = titleBaseX - (window.scrollX || 0);
      const ty = titleBaseY - (window.scrollY || 0);
      const d = Math.hypot(e.clientX - tx, e.clientY - ty);
      const RT = 380;
      if (d < RT) {
        rippleScale = Math.min(16, rippleScale + (1 - d / RT) * 5);
      }
    }
  });

  /* ===== 글자 표면 일렁임 (마우스가 닿는 부분만 물결처럼) ===== */
  let waveSpans = [];
  let waveTime = 0;
  let hasPointer = false;

  // 텍스트를 낱글자 span 으로 분리 (공백 유지)
  function splitLetters(el) {
    const text = el.textContent;
    el.textContent = "";
    const frag = document.createDocumentFragment();
    let i = 0;
    for (const ch of text) {
      const span = document.createElement("span");
      span.className = "wave-ch";
      span.dataset.i = i++;
      if (ch === " ") span.innerHTML = "&nbsp;";
      else span.textContent = ch;
      frag.appendChild(span);
    }
    el.appendChild(frag);
  }

  // 제목은 낱글자 분리에서 제외(연결 유지). 위치는 고정하고, 마우스가 지날 때만
  //  SVG 디스플레이스먼트로 표면만 물결치게 함.
  let titleEls = [];
  let titleBaseX = 0;
  let titleBaseY = 0;
  let rippleScale = 0; // 디스플레이스먼트 세기(마우스가 지나면 충전, 평소 0=고정)
  let rippleT = 0;
  let titleRippleActive = false;
  if (!prefersReduced) {
    // 실제 텍스트 레이어(blur/clear)만 분리/제어 — 렌즈 사본(.intro-lens)은 제외
    intro
      .querySelectorAll(
        ":is(.intro-text--blur, .intro-text--clear) :is(.intro-sub, .intro-name)"
      )
      .forEach(splitLetters);
    // 렌즈 사본도 동일하게 낱글자로 쪼개 렌더링을 일치시킴(자간 어긋남 방지).
    //  waveSpans 쿼리는 blur/clear 로 한정되어 있어 이 사본은 물결 대상에서 제외됨.
    intro
      .querySelectorAll(".intro-lens :is(.intro-sub, .intro-name)")
      .forEach(splitLetters);
    waveSpans = intro.querySelectorAll(
      ":is(.intro-text--blur, .intro-text--clear) .wave-ch"
    );
    titleEls = intro.querySelectorAll(
      ":is(.intro-text--blur, .intro-text--clear) .intro-title"
    );
  }

  // 변형이 없는 상태의 낱글자/제목 중심 좌표(페이지 기준)를 캐시 — 커서와의 거리 계산용
  function measureWave() {
    const sx = window.scrollX || 0;
    const sy = window.scrollY || 0;
    for (let k = 0; k < waveSpans.length; k++) waveSpans[k].style.transform = "";
    for (let k = 0; k < titleEls.length; k++) titleEls[k].style.transform = "";
    for (let k = 0; k < waveSpans.length; k++) {
      const r = waveSpans[k].getBoundingClientRect();
      waveSpans[k]._bx = r.left + sx + r.width / 2;
      waveSpans[k]._by = r.top + sy + r.height / 2;
    }
    if (titleEls.length) {
      const r = titleEls[0].getBoundingClientRect();
      titleBaseX = r.left + sx + r.width / 2;
      titleBaseY = r.top + sy + r.height / 2;
    }
  }

  /* ===== 마우스(원)가 지나는 자리에 촤르르 퍼지는 물결 ===== */
  let lastRippleT = 0;
  let lastRippleX = 0;
  let lastRippleY = 0;
  function spawnCursorRipple(x, y) {
    if (prefersReduced) return;
    // 물방울이 떨어져 선명해진 뒤(마우스 원이 보일 때)부터 물결 생성
    if (!introRevealed) return;
    // 인트로 화면일 때만 (스크롤로 벗어나면 생성하지 않음)
    if ((window.scrollY || window.pageYOffset || 0) > vh * 0.6) return;
    const now = performance.now();
    const dist = Math.hypot(x - lastRippleX, y - lastRippleY);
    // 너무 자주 생기지 않도록 시간·이동거리로 솎아냄
    if (now - lastRippleT < 55 || dist < 16) return;
    lastRippleT = now;
    lastRippleX = x;
    lastRippleY = y;
    const r = document.createElement("span");
    r.className = "cursor-ripple";
    // 살짝 크기·위치를 흩뿌려 물결처럼 자연스럽게
    const jx = (Math.random() - 0.5) * 14;
    const jy = (Math.random() - 0.5) * 14;
    const scale = 0.8 + Math.random() * 0.6;
    r.style.left = x + jx + "px";
    r.style.top = y + jy + "px";
    r.style.transform = "scale(" + scale * 0.2 + ")";
    document.body.appendChild(r);
    r.addEventListener("animationend", () => r.remove());
  }

  /* ===== 화면/섹션 측정 (리사이즈·로드 시 갱신) ===== */
  let vw = window.innerWidth;
  let vh = window.innerHeight;
  let S = 2000; // 큰 원 지름
  let centers = []; // 각 섹션이 화면 중앙에 올 때의 scrollY
  let neckX = 0; // 깔때기 목(아래 중앙) 좌표 — 원이 이 지점으로 모여 깔때기로 변형
  let neckY = 0;

  function measure() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    S = Math.min(vw * 1.2, 2000);
    const secs = Array.prototype.slice.call(document.querySelectorAll(".section"));
    centers = secs.map((s) => s.offsetTop + s.offsetHeight / 2 - vh / 2);
    // 깔때기 목 = 깔때기 이미지의 아래 중앙 (offsetTop + 높이)
    neckX = funnel.offsetLeft + funnel.offsetWidth / 2;
    neckY = funnel.offsetTop + funnel.offsetHeight;
    measureWave(); // 낱글자 기준 좌표도 함께 갱신
  }

  // 섹션 단위 진행도 p (0=인트로, 1=INDEX, 2=About, 3=Why, 4=Project 가 화면 중앙)
  function scrollProgress() {
    const y = window.scrollY || window.pageYOffset || 0;
    if (!centers.length) return 0;
    if (y <= centers[0]) return 0;
    if (y >= centers[centers.length - 1]) return centers.length - 1;
    for (let i = 0; i < centers.length - 1; i++) {
      if (y >= centers[i] && y <= centers[i + 1]) {
        return i + (y - centers[i]) / (centers[i + 1] - centers[i]);
      }
    }
    return 0;
  }

  /* =======================================================
     그래픽 컨트롤러 (매 프레임)
  ======================================================= */
  const LENS_D = 170; // 인트로 렌즈(마우스 원) 지름 — 작게
  let pinActive = false; // Why 핀 진입 시 true → 원 제어를 GSAP 로 넘김
  // 인트로 핀 — 첫 화면을 고정한 채 원이 INDEX 크기까지 '제자리에서' 성장
  let introPinActive = false; // 인트로 핀 활성(성장) 구간 여부
  let introGrow = 0; // 인트로 핀 진행도 0→1 (원이 다 커지면 1)
  let pinReady = false; // 인트로 핀(ScrollTrigger) 생성 완료 여부 — 없으면 폴백(스크롤 성장)

  function frame() {
    // 마우스 부드럽게 보간
    current.x += (target.x - current.x) * 0.12;
    current.y += (target.y - current.y) * 0.12;

    /* 글자 표면 일렁임 — 커서 주변(반경 R) 글자만 거리에 따라 물결처럼 흔들림.
       커서를 중심으로 동심원 잔물결이 퍼지고, 멀어질수록 잦아든다(물 표면 느낌). */
    if (hasPointer && (waveSpans.length || titleEls.length)) {
      waveTime += 0.16;
      const sx = window.scrollX || 0;
      const sy = window.scrollY || 0;
      const onIntro = sy < vh * 0.85;
      const cx = current.x;
      const cy = current.y;
      const R = 210; // 일렁임이 닿는 반경(px)
      for (let k = 0; k < waveSpans.length; k++) {
        const sp = waveSpans[k];
        let on = false;
        if (onIntro) {
          const dx = sp._bx - sx - cx;
          const dy = sp._by - sy - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < R) {
            const fall = 1 - dist / R; // 가까울수록 1
            const ph = dist * 0.05 - waveTime; // 바깥으로 퍼지는 동심원 위상
            const w = Math.sin(ph);
            const amp = fall * fall * 11;
            const oy = amp * w;
            const ox = amp * 0.45 * Math.cos(ph);
            const sc = 1 + 0.05 * fall * w;
            sp.style.transform =
              "translate(" + ox.toFixed(2) + "px," + oy.toFixed(2) +
              "px) scale(" + sc.toFixed(3) + ")";
            on = true;
          }
        }
        if (!on && sp._wave) sp.style.transform = "";
        sp._wave = on;
      }

      // 제목은 위치 고정 — 마우스가 지나갈 때만 표면이 물결치고(scale↑), 곧 잦아듦(scale→0)
      if (titleEls.length && feDisp) {
        if (rippleScale > 0.02) {
          rippleT += 0.03;
          rippleScale *= 0.93; // 서서히 잦아들어 고정 상태로
          const bf = 0.011 + 0.004 * Math.sin(rippleT); // 물이 천천히 흐르듯
          feTurb.setAttribute(
            "baseFrequency",
            bf.toFixed(4) + " " + (bf * 1.7).toFixed(4)
          );
          feDisp.setAttribute("scale", rippleScale.toFixed(2));
          titleRippleActive = true;
        } else if (titleRippleActive) {
          feDisp.setAttribute("scale", "0"); // 완전히 고정(또렷)
          titleRippleActive = false;
        }
      }
    }

    const p = scrollProgress();

    /* ---------- 원(circle) ----------
       [성장] 인트로 핀 동안 첫 화면을 고정한 채, 마우스 렌즈 자리에서 INDEX 큰 원으로 자라남
              · 핀이 있으면 introGrow(핀 진행도)로 구동
              · 핀이 없으면(폴백/모션최소화) 예전처럼 스크롤 p 로 구동
       p ~0→1.5 : INDEX 위치 고정 (왼쪽 가장자리 = 화면 좌측 262px)
       p 1.5→2.0: 오른쪽으로 이동 + 살짝 축소 (About 정보 등장, 왼쪽 가장자리 790px)
       p 2.0~   : About 고정 → 이후 Why 핀에서 깔때기로 변형(GSAP)
    */
    // Why 핀 진입 후에는 GSAP 가 원을 제어 → rAF 는 건드리지 않음
    if (!pinActive) {
      const cx_i = 262 + S / 2; // INDEX 원 중심 X (왼쪽 가장자리 262px)
      const cy_i = vh * 0.72; // INDEX 원 중심 Y
      const aboutD = S * 0.86; // About 원 지름 (살짝 축소)
      const cx_a = 790 + aboutD / 2; // About 원 중심 X (왼쪽 가장자리 790px)
      let cx, cy, d, op;

      // 인트로 '성장' 구간 판정
      let inGrow = false, t = 0;
      if (introPinActive) { inGrow = true; t = smooth(introGrow); }
      else if (!pinReady && p <= 0.9) { inGrow = true; t = smooth(p / 0.9); }

      if (inGrow) {
        // 마우스 렌즈 자리에서 INDEX 큰 원으로 '제자리에서' 성장
        cx = lerp(current.x, cx_i, t);
        cy = lerp(current.y, cy_i, t);
        d = lerp(LENS_D, S, t);
        op = lerp(0.9, 0.85, t);
      } else if (p <= 1.5) {
        cx = cx_i; cy = cy_i; d = S; op = 0.85;
      } else if (p <= 2.0) {
        const tt = smooth((p - 1.5) / 0.5);
        cx = lerp(cx_i, cx_a, tt); cy = cy_i; d = lerp(S, aboutD, tt); op = lerp(0.85, 0.8, tt);
      } else {
        // About 위치에서 '고정' — About 섹션이 완전히 사라질 때(핀 시작)까지 그대로 유지
        cx = cx_a; cy = cy_i; d = aboutD; op = 0.8;
      }

      // 마우스 원은 물방울 연출로 선명해진 뒤(introRevealed)부터 부드럽게 등장
      if (introRevealed && introCircleFade < 1) {
        introCircleFade = Math.min(1, introCircleFade + 0.05);
      }

      circle.style.width = d + "px";
      circle.style.height = d + "px";
      circle.style.transform =
        "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)";
      circle.style.opacity = op * introCircleFade;

      // 유리 렌즈를 마우스 원(circle)과 같은 중심·크기에 둠 →
      //  스크롤하면 렌즈(마우스 원) 자체가 그대로 커진다. 커질수록 유리효과는 잦아듦.
      if (lens && !prefersReduced) {
        const lensActive =
          introRevealed && hasPointer && inGrow &&
          (window.scrollY || window.pageYOffset || 0) < vh * 1.1;
        if (lensActive) {
          const r = d / 2;
          const M = 1.45; // 볼록렌즈 확대 배율
          lens.style.width = d + "px";
          lens.style.height = d + "px";
          lens.style.transform =
            "translate(" + (cx - r) + "px," + (cy - r) + "px)";
          // 배경 사본은 1:1 (주변 배경과 이음새 없이 원본 텍스트를 덮음)
          if (lensBg) {
            lensBg.style.transform =
              "translate(" + (r - cx) + "px," + (r - cy) + "px)";
          }
          // 글자 사본만 커서 중심으로 살짝 확대 → 볼록렌즈로 들여다본 느낌
          lensVp.style.transform =
            "translate(" + (r - M * cx) + "px," + (r - M * cy) +
            "px) scale(" + M + ")";
          lensRing.style.width = d + "px";
          lensRing.style.height = d + "px";
          lensRing.style.transform =
            "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)";
          // 원이 커질수록(성장 t↑) 렌즈 효과는 서서히 사라짐
          const fade = 1 - smooth(clamp(t / 0.5, 0, 1));
          lens.style.opacity = fade.toFixed(3);
          lensRing.style.opacity = (fade * 0.9).toFixed(3);
        } else {
          lens.style.opacity = "0";
          lensRing.style.opacity = "0";
        }
      }

      // 선명 텍스트는 진입 물방울 연출(clarify)이 한 번에 드러내므로
      //  여기서 clip-path 를 매 프레임 만지지 않는다.
    }

    // 깔때기(funnel)는 GSAP(핀 포함)이 제어하므로 여기서는 다루지 않는다.

    requestAnimationFrame(frame);
  }

  measure();
  requestAnimationFrame(frame);
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);
  // 깔때기 이미지 로드 후 목(neck) 좌표 재계산
  const funnelImg = document.querySelector(".morph-funnel-img");
  if (funnelImg) {
    if (funnelImg.complete) measure();
    else funnelImg.addEventListener("load", measure);
  }

  /* =======================================================
     3. 섹션 콘텐츠 진입 애니메이션 (GSAP ScrollTrigger)
  ======================================================= */
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    console.warn("GSAP/ScrollTrigger 미로딩 — 콘텐츠 등장 애니메이션 비활성화");
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // 공통 헬퍼 — 요소들을 위로 부드럽게 등장
  function revealOnEnter(targets, trigger, opts) {
    opts = opts || {};
    gsap.from(targets, {
      opacity: 0,
      y: opts.y != null ? opts.y : 36,
      duration: opts.duration != null ? opts.duration : 0.9,
      ease: "power2.out",
      stagger: opts.stagger != null ? opts.stagger : 0.12,
      scrollTrigger: { trigger: trigger, start: opts.start || "top 70%" },
    });
  }

  if (!prefersReduced) {
    /* [1→3] INTRO 핀 — 첫 화면(인트로)을 그대로 고정한 채, 원이 마우스 렌즈 자리에서
       INDEX 크기까지 '제자리에서' 자라남. 다 자라면 핀이 풀리며 페이지가 아래로
       스크롤되고, 다 큰 원은 그대로 INDEX 위치(rAF가 이어받음)에 놓인다. */
    pinReady = true;
    introPinActive = true; // 로드 시 첫 화면에 있으므로 성장 구간으로 시작
    ScrollTrigger.create({
      trigger: ".section--intro",
      start: "top top",
      end: "+=100%", // 한 화면 분량의 스크롤 동안: 화면 고정 + 원 성장
      pin: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        introGrow = self.progress;
        // 원이 커지는 동안 SCROLL 인디케이터는 서서히 사라짐
        if (scrollIndicator) {
          scrollIndicator.style.opacity = String(1 - smooth(self.progress));
        }
      },
      onEnter: () => { introPinActive = true; },
      onEnterBack: () => { introPinActive = true; },
      onLeave: () => { introPinActive = false; }, // 핀 종료 → rAF 가 INDEX 위치에서 이어받음
      onLeaveBack: () => { introPinActive = true; },
    });

    // [3] INDEX
    revealOnEnter(".index-title", ".section--index", { stagger: 0 });
    revealOnEnter(".index-item", ".section--index", { start: "top 65%", stagger: 0.14 });

    // [4] ABOUT — 원이 About 위치(790px)에 도착하는 시점에 맞춰 콘텐츠가
    //  떠오르며 등장 (섹션이 화면에 충분히 들어오면 바로). 그 전까지는 숨김.
    revealOnEnter(
      [".about-title", ".about-intro", ".about-profile", ".about-approach"],
      ".section--about",
      { start: "top 52%", y: 40, stagger: 0.1 }
    );
    revealOnEnter(".resume-block", ".section--about", {
      start: "top 46%",
      y: 40,
      stagger: 0.12,
    });

    // 깔때기 기본값 — 목(아래 중앙)을 기준으로 자라나도록 transformOrigin 설정
    //  (위치는 CSS left:107/top:-159 로 고정, 중심정렬 xPercent 불필요)
    gsap.set(".morph-funnel", {
      scale: 0.1,
      opacity: 0,
      transformOrigin: "50% 100%",
    });

    /* [5] WHY — About 이 자연스럽게 스크롤되어 사라진 뒤(=Why 진입),
       핀(스크롤 잠금) 안에서 순서대로:
        (1) 원이 중앙(깔때기 목)으로 이동하며 찰흙처럼 늘었다 가늘어져 소멸
        (2) 같은 목 지점에서 깔때기가 탄성으로 자라남
        (3) 제목 → (4) 키워드(번호순 낙하) → (5) 설명
       About 섹션 자체는 고정하지 않음(평범하게 스크롤). */

    // 키워드 조각 이미지 — data-x(left)/data-y(top) 절대 좌표. 박스 좌상단 기준(중심 오프셋 없음).
    //  최종 자리보다 360px '위' + 투명 상태에서 시작 → 핀에서 제자리로 떨어짐
    const caps = gsap.utils.toArray(".why-cap");
    caps.forEach((cap) => {
      gsap.set(cap, {
        x: parseFloat(cap.dataset.x),
        y: parseFloat(cap.dataset.y) - 360,
        opacity: 0,
      });
    });

    // 제목/설명 초기 숨김
    gsap.set(".why-title", { opacity: 0, y: 26 });
    gsap.set(".why-desc", { opacity: 0, y: 26 });

    const whyPin = gsap.timeline({
      scrollTrigger: {
        trigger: ".section--why",
        start: "top top", // About 이 완전히 사라지는 지점
        end: "+=200%",
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onEnter: () => { pinActive = true; },
        onEnterBack: () => { pinActive = true; },
        onLeaveBack: () => { pinActive = false; }, // 위로 빠져나가면 rAF 가 다시 원을 제어
      },
    });
    whyPin
      // (1) 원이 목으로 끌려가며 세로로 쭈욱 늘어남 (찰흙 반죽)
      //  immediateRender:false → 핀에 도달했을 때 비로소 About 상태에서 시작
      .fromTo(
        circle,
        {
          width: () => S * 0.86, height: () => S * 0.86,
          xPercent: -50, yPercent: -50,
          x: () => 790 + (S * 0.86) / 2, y: () => vh * 0.72,
          scaleX: 1, scaleY: 1, opacity: 0.8,
        },
        {
          x: () => neckX, y: () => neckY * 0.9,
          scaleX: 0.82, scaleY: 1.45,
          ease: "power1.inOut", duration: 0.5, immediateRender: false,
        }
      )
      // 목으로 빨려들며 가늘어져 소멸
      .to(circle, {
        y: () => neckY, scaleX: 0.32, scaleY: 0.7,
        width: () => S * 0.05, height: () => S * 0.05,
        opacity: 0, ease: "power1.in", duration: 0.45,
      })
      // (2) 같은 목 지점에서 깔때기가 탄성으로 자라남
      .to(".morph-funnel", { scale: 1, opacity: 1, ease: "back.out(1.2)", duration: 0.7 }, "-=0.32")
      // INDEX 의 'Why UI/UX?' 클릭 시 바로 점프할 지점(깔때기 등장 완료)
      .addLabel("funnelShown")
      // (3) 제목
      .to(".why-title", { opacity: 1, y: 0, ease: "power2.out", duration: 0.45 }, ">-0.1")
      // (4) 키워드 조각들이 '번호 순서대로' 위에서 떨어져 깔때기에 쌓임
      .to(
        ".why-cap",
        {
          y: (i, el) => parseFloat(el.dataset.y),
          opacity: 1,
          ease: "back.out(1.4)",
          stagger: { each: 0.12, from: "start" },
          duration: 0.55,
        },
        ">+0.1"
      )
      // (5) 설명
      .to(".why-desc", { opacity: 1, y: 0, ease: "power2.out", duration: 0.55 }, ">+0.2");

    /* INDEX → 'Why UI/UX?' 클릭: 원이 깔때기로 변형되는 앞부분을 건너뛰고
       깔때기가 다 나타난 지점(funnelShown)으로 바로 스크롤 */
    const whyLink = document.querySelector('.index-item[href="#why"]');
    if (whyLink) {
      whyLink.addEventListener("click", function (e) {
        const st = whyPin.scrollTrigger;
        if (!st) return; // 핀이 없으면 기본 앵커 동작
        e.preventDefault();
        ScrollTrigger.refresh(); // 최신 레이아웃 기준으로 start/end 보정
        const dur = whyPin.duration();
        const t = whyPin.labels.funnelShown || 0;
        const frac = dur ? t / dur : 0;
        const y = st.start + frac * (st.end - st.start);
        window.scrollTo({ top: y, behavior: "smooth" });
      });
    }

    // (Why 내용이 모두 뜬 뒤에도 깔때기는 사라지지 않고 그대로 유지)
    //  → 별도의 펼침/소멸 트윈을 두지 않음.

    // [6] PROJECT — 윗 섹션(Why)이 완전히 사라진 뒤(Project 가 화면 상단에 닿을 때)
    //  제목 · 프로젝트명 · 구분선이 함께 나타남
    const projectTL = gsap.timeline({
      scrollTrigger: {
        trigger: ".section--project",
        // 마지막 섹션이라 'top top'(스크롤 끝)에 걸리면 안 뜰 수 있어 살짝 앞에서 트리거
        start: "top 15%",
        toggleActions: "play none none reverse",
      },
    });
    projectTL
      .from(".project-title", { opacity: 0, x: -80, duration: 1.0, ease: "power2.out" })
      .from(".project-names li", {
        opacity: 0,
        y: 26,
        duration: 0.7,
        ease: "power2.out",
        stagger: 0.12,
      }, "-=0.5")
      .from(".project-divider", {
        opacity: 0,
        scaleX: 0,
        transformOrigin: "left center",
        duration: 0.8,
        ease: "power2.out",
      }, "-=0.6");
  }

  /* ===== 폰트 로딩/로드 후 위치 재계산 =====
     핀 스페이서가 반영된 최종 레이아웃 기준으로 섹션 좌표를 다시 계산 */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      ScrollTrigger.refresh();
      measure();
    });
  }
  window.addEventListener("load", function () {
    ScrollTrigger.refresh();
    measure();
  });
  // 핀 등 레이아웃 변경 후에도 섹션 좌표 동기화
  ScrollTrigger.addEventListener("refresh", measure);
})();
