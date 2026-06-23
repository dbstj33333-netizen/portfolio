/* =========================================================
   시스템치과 상세 페이지 — 스크롤 등장 애니메이션
   · IntersectionObserver 로 .system-dental-reveal / -reveal-img 에 .is-in 부여
   · prefers-reduced-motion 환경에서는 동작하지 않음(즉시 표시)
========================================================= */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var targets = document.querySelectorAll(
    ".system-dental-reveal, .system-dental-reveal-img"
  );

  // 모션 최소화 또는 IO 미지원 → 모두 즉시 표시
  if (prefersReduced || !("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("is-in"); });
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // 같은 그룹 안에서 0.1초 간격 스태거 (data-sd-delay)
        var delay = parseFloat(el.getAttribute("data-sd-delay")) || 0;
        el.style.transitionDelay = delay + "s";
        el.classList.add("is-in");
        // 단방향 등장 — 한 번 나타나면 더는 토글하지 않음(경계 떨림 방지)
        io.unobserve(el);
        // 트랜지션 종료 후 will-change 해제(합성 레이어 잔류 제거)
        el.addEventListener(
          "transitionend",
          function () { el.style.willChange = "auto"; },
          { once: true }
        );
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );

  targets.forEach(function (el) { io.observe(el); });
})();
