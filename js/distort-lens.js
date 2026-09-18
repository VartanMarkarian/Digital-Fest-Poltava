// Локальна «лінза» дисторшн-ефекту, що йде за курсором миші —
// текст спотворюється лише в невеликому радіусі навколо курсора, з м'яким краєм.
// Радіус ~5-6см (діаметр лінзи ~400px), решта сторінки лишається незмінною.

document.addEventListener("DOMContentLoaded", () => {
  const lens = document.createElement("div");
  lens.className = "distort-lens";
  document.body.appendChild(lens);

  let targetX = -9999;
  let targetY = -9999;
  let curX = -9999;
  let curY = -9999;
  let active = false;
  let idleTimer = null;

  const onMove = (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
    active = true;
    lens.style.opacity = "1";
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      active = false;
      lens.style.opacity = "0";
    }, 2000);
  };
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseleave", () => {
    active = false;
    lens.style.opacity = "0";
  });

  function raf() {
    requestAnimationFrame(raf);
    curX += (targetX - curX) * 0.35;
    curY += (targetY - curY) * 0.35;
    lens.style.transform = `translate(${curX}px, ${curY}px) translate(-50%, -50%)`;
  }
  raf();
});
