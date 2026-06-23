/* =========================================================
   배너 라이트박스 — 그래픽 디자인 배너 클릭 시 전체 화면으로 보기
   · 새 라이브러리 없이 바닐라 JS
   · ESC / 배경 클릭 / 닫기 버튼으로 닫힘, 포커스 관리
========================================================= */
(function () {
  "use strict";

  var lb = document.getElementById("gdLightbox");
  if (!lb) return;

  var img = lb.querySelector(".gd-lightbox-img");
  var closeBtn = lb.querySelector(".gd-lightbox-close");
  var lastFocused = null;

  function open(src, alt) {
    lastFocused = document.activeElement;
    img.setAttribute("src", src);
    img.setAttribute("alt", alt || "");
    lb.hidden = false;
    document.body.style.overflow = "hidden"; // 배경 스크롤 잠금
    closeBtn.focus();
  }

  function close() {
    lb.hidden = true;
    img.setAttribute("src", "");
    img.setAttribute("alt", "");
    document.body.style.overflow = "";
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  var banners = document.querySelectorAll(".gd-art[data-full], .gd-tile[data-full], .gd-card[data-full], .gd-banner[data-full]");
  banners.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var full = btn.getAttribute("data-full");
      var thumb = btn.querySelector("img");
      open(full, thumb ? thumb.getAttribute("alt") : "");
    });
  });

  closeBtn.addEventListener("click", close);
  // 배경(이미지 바깥) 클릭 시 닫기
  lb.addEventListener("click", function (e) {
    if (e.target === lb) close();
  });
  // ESC 로 닫기
  document.addEventListener("keydown", function (e) {
    if (!lb.hidden && (e.key === "Escape" || e.key === "Esc")) close();
  });
})();
