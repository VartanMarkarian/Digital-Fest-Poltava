// Органічна «рідинна» голограма біля «Метаноя» —
// тягнеться/нахиляється за мишкою, переливається кольорами, глітчить.

document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("gateway-liquid");
  if (!el) return;

  let targetX = 0;
  let targetY = 0;
  let curX = 0;
  let curY = 0;
  let curScaleX = 1;
  let curScaleY = 1;
  let targetScaleX = 1;
  let targetScaleY = 1;
  let jitterX = 0;
  let jitterY = 0;

  const onPointerMove = (e) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (window.innerWidth / 2);
    const dy = (e.clientY - cy) / (window.innerHeight / 2);
    targetX = dx * 26;
    targetY = dy * 14;
    // курсор ближче — трохи «розтягує» рідину по горизонталі
    const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
    const near = Math.max(0, 1 - dist / 420);
    targetScaleX = 1 + near * 0.18;
    targetScaleY = 1 - near * 0.08;
  };
  window.addEventListener("pointermove", onPointerMove);

  function applyTransform() {
    curX += (targetX - curX) * 0.07;
    curY += (targetY - curY) * 0.07;
    curScaleX += (targetScaleX - curScaleX) * 0.08;
    curScaleY += (targetScaleY - curScaleY) * 0.08;
    el.style.transform = `translate(${curX + jitterX}px, ${curY + jitterY}px) scale(${curScaleX}, ${curScaleY})`;
    requestAnimationFrame(applyTransform);
  }
  applyTransform();

  let glitching = false;
  function glitchBurst() {
    if (glitching) return;
    glitching = true;
    let i = 0;
    const steps = 6;
    const tick = () => {
      jitterX = (Math.random() - 0.5) * 18;
      jitterY = (Math.random() - 0.5) * 10;
      el.style.filter = `saturate(${1.3 + Math.random() * 0.6}) brightness(${1.1 + Math.random() * 0.3}) hue-rotate(${(Math.random() - 0.5) * 60}deg)`;
      el.style.clipPath = `inset(${Math.random() * 8}% 0 ${Math.random() * 8}% 0)`;
      i++;
      if (i < steps) {
        setTimeout(tick, 45);
      } else {
        el.style.filter = "";
        el.style.clipPath = "";
        jitterX = 0;
        jitterY = 0;
        glitching = false;
      }
    };
    tick();
  }

  el.addEventListener("pointerenter", glitchBurst);
  el.addEventListener("click", glitchBurst);
  setInterval(glitchBurst, 3800 + Math.random() * 2600);
});
