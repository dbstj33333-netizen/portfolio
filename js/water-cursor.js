/* =========================================================
   물결 커서 (단독 페이지용) — 프로젝트 상세 페이지(project-*.html)
   메인 index 의 파란 원 따라다니기 효과와 동일하게,
   마우스를 따라다니는 파란 원 + 주기적으로 번지는 잔물결.
   (.water-cursor / .water-ring 스타일은 css/style.css 에 정의됨)
========================================================= */
(function () {
  "use strict";

  // 모션 최소화 선호 / 마우스 없는 터치 기기에서는 비활성화
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.matchMedia("(hover: none)").matches) return;

  const cursor = document.createElement("div");
  cursor.className = "water-cursor";
  cursor.style.opacity = "0";
  document.body.appendChild(cursor);

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let cx = mx;
  let cy = my;
  let tick = 0;
  let active = false;

  window.addEventListener("pointermove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    active = true;
  });
  window.addEventListener("pointerleave", () => { active = false; });

  function ring(x, y) {
    const r = document.createElement("span");
    r.className = "water-ring";
    r.style.left = x + "px";
    r.style.top = y + "px";
    document.body.appendChild(r);
    r.addEventListener("animationend", () => r.remove());
  }

  function loop() {
    cx += (mx - cx) * 0.18;
    cy += (my - cy) * 0.18;
    cursor.style.transform = "translate(" + cx + "px," + cy + "px)";
    cursor.style.opacity = active ? "1" : "0";
    if (active) {
      tick++;
      if (tick % 42 === 0) ring(cx, cy); // 약 0.7초마다 잔물결
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
