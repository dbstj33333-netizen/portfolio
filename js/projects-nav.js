/* =========================================================
   우측 플로팅 메뉴 (섹션/프로젝트 바로가기) + 스크롤 스파이
   · 첫 화면(인트로)을 지나면 메뉴가 우측에서 나타남
   · 스크롤에 따라 현재 보고 있는 섹션을 활성 표시
   · 클릭 시 해당 섹션으로 부드럽게 스크롤(html scroll-behavior: smooth)
========================================================= */
(function () {
  "use strict";

  const floatNav = document.querySelector(".proj-float");
  if (!floatNav) return;

  const links = Array.prototype.slice.call(floatNav.querySelectorAll("a"));
  const sections = links.map((a) => document.getElementById(a.dataset.target));

  // 클릭으로 선택된 항목을 부드러운 스크롤이 끝날 때까지 유지(스파이가 덮어쓰지 않게)
  let lockUntil = 0;

  function setActive(target) {
    links.forEach((a) => a.classList.toggle("is-active", a === target));
  }

  // 클릭 시 즉시 해당 메뉴를 선택 상태로 바꾸고, 잠시 스파이를 잠금
  links.forEach((a) => {
    a.addEventListener("click", () => {
      setActive(a);
      floatNav.classList.add("is-on");
      lockUntil = Date.now() + 900;
    });
  });

  let ticking = false;
  function update() {
    ticking = false;
    const vh = window.innerHeight;
    const y = window.scrollY || window.pageYOffset || 0;

    // 첫 화면(인트로)을 지나면 메뉴 표시 (인트로 핀 구간 ≈ 1뷰포트)
    floatNav.classList.toggle("is-on", y > vh * 1.02);

    // 클릭 직후엔 선택 상태를 유지 (스크롤 스파이로 덮어쓰지 않음)
    if (Date.now() < lockUntil) return;

    // 스크롤 스파이 — 화면 중앙에 가장 가까운 섹션 활성화
    const mid = vh / 2;
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      if (!sec) continue;
      const r = sec.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue; // 화면에 안 걸침
      const center = r.top + r.height / 2;
      const d = Math.abs(center - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    links.forEach((a, i) => a.classList.toggle("is-active", i === best));
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("load", onScroll);
  update();
})();
