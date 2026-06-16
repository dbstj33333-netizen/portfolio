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
  });

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
  const LENS_D = 280; // 인트로 렌즈 지름
  let pinActive = false; // Why 핀 진입 시 true → 원 제어를 GSAP 로 넘김
  // 인트로 핀 — 첫 화면을 고정한 채 원이 INDEX 크기까지 '제자리에서' 성장
  let introPinActive = false; // 인트로 핀 활성(성장) 구간 여부
  let introGrow = 0; // 인트로 핀 진행도 0→1 (원이 다 커지면 1)
  let pinReady = false; // 인트로 핀(ScrollTrigger) 생성 완료 여부 — 없으면 폴백(스크롤 성장)

  function frame() {
    // 마우스 부드럽게 보간
    current.x += (target.x - current.x) * 0.12;
    current.y += (target.y - current.y) * 0.12;

    const p = scrollProgress();
    const rect = introInner.getBoundingClientRect();

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

      circle.style.width = d + "px";
      circle.style.height = d + "px";
      circle.style.transform =
        "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)";
      circle.style.opacity = op;

      // 선명 텍스트 렌즈(clip-path) — 성장 구간엔 원과 똑같이 키워
      //  원이 커질수록 'Make it Clear' 가 점점 또렷하게 드러나도록.
      //  (그 외 구간은 인트로가 화면 밖이라 갱신할 필요 없음)
      if (inGrow) {
        const clip =
          "circle(" + (d / 2) + "px at " +
          (cx - rect.left) + "px " + (cy - rect.top) + "px)";
        clearLayer.style.webkitClipPath = clip;
        clearLayer.style.clipPath = clip;
      }
    }

    // 깔때기(funnel)는 GSAP(핀 포함)이 제어하므로 여기서는 다루지 않는다.

    requestAnimationFrame(frame);
  }

  measure();
  requestAnimationFrame(frame);
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);
  // 깔때기 이미지 로드 후 목(neck) 좌표 재계산
  if (funnel.complete) measure();
  else funnel.addEventListener("load", measure);

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
