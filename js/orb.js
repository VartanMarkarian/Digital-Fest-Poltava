// Інтерактивна 3D-сфера для порталу («Контури відновлення. Міжпростір 2025») —
// обертається за рухом миші, реагує глітчем на hover / клік / час від часу сама.

document.addEventListener("DOMContentLoaded", () => {
  if (typeof THREE === "undefined") return;
  const container = document.getElementById("gateway-orb");
  if (!container) return;

  const CYAN = 0x37f0e0;
  const MAGENTA = 0xff3ea5;
  const LIME = 0xd4ff3d;

  let width = container.clientWidth;
  let height = container.clientHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.z = 3.4;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  const group = new THREE.Group();
  scene.add(group);

  // основна каркасна сфера
  const geo = new THREE.IcosahedronGeometry(1.15, 2);
  const mat = new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0.85 });
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);

  // внутрішнє ядро для глибини
  const coreGeo = new THREE.IcosahedronGeometry(0.68, 1);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x0d0d0f, transparent: true, opacity: 0.9 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  // рідкі зовнішні точки-супутники
  const dotsGeo = new THREE.IcosahedronGeometry(1.55, 1);
  const dotsMat = new THREE.PointsMaterial({ color: CYAN, size: 0.045, transparent: true, opacity: 0.7 });
  const dots = new THREE.Points(dotsGeo, dotsMat);
  group.add(dots);

  let targetRotX = 0;
  let targetRotY = 0;
  let mouseInside = false;

  const onPointerMove = (e) => {
    const rect = container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // глобальний параллакс: реагує на позицію миші у всьому вікні,
    // трохи сильніше, коли курсор безпосередньо над сферою
    const dx = (e.clientX - cx) / (window.innerWidth / 2);
    const dy = (e.clientY - cy) / (window.innerHeight / 2);
    targetRotY = dx * 1.6;
    targetRotX = dy * 0.7;
  };
  window.addEventListener("pointermove", onPointerMove);

  container.addEventListener("pointerenter", () => {
    mouseInside = true;
    glitchBurst();
  });
  container.addEventListener("pointerleave", () => {
    mouseInside = false;
  });
  container.addEventListener("click", glitchBurst);

  let glitching = false;
  function glitchBurst() {
    if (glitching) return;
    glitching = true;
    const colors = [MAGENTA, LIME, CYAN, MAGENTA, LIME, CYAN, MAGENTA, CYAN];
    let i = 0;
    const kickX = (Math.random() - 0.5) * 0.8;
    const kickY = (Math.random() - 0.5) * 0.8;
    group.rotation.x += kickX;
    idleSpin += kickY;
    const step = () => {
      mat.color.setHex(colors[i]);
      dotsMat.color.setHex(colors[i]);
      mesh.scale.setScalar(1 + (Math.random() - 0.5) * 0.16);
      i++;
      if (i < colors.length) {
        setTimeout(step, 50);
      } else {
        mat.color.setHex(CYAN);
        dotsMat.color.setHex(CYAN);
        mesh.scale.setScalar(1);
        glitching = false;
      }
    };
    step();
  }
  /* короткий легкий спалах — частіше, але без розвороту сфери */
  function microFlicker() {
    if (glitching) return;
    const prev = mat.color.getHex();
    mat.color.setHex(Math.random() > 0.5 ? MAGENTA : LIME);
    setTimeout(() => mat.color.setHex(prev), 70);
  }
  // періодичний самостійний глітч — тепер частіше, більше спалахів
  setInterval(glitchBurst, 3200 + Math.random() * 2200);
  setInterval(microFlicker, 1100 + Math.random() * 900);

  function onResize() {
    width = container.clientWidth;
    height = container.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  window.addEventListener("resize", onResize);

  let curRotX = 0;
  let curRotY = 0;
  let idleSpin = 0;
  function animate() {
    requestAnimationFrame(animate);
    idleSpin += 0.0022;
    curRotX += (targetRotX - curRotX) * 0.08;
    curRotY += (targetRotY - curRotY) * 0.08;
    mesh.rotation.x = curRotX;
    dots.rotation.x = curRotX;
    group.rotation.y = idleSpin + curRotY;
    dots.rotation.y = group.rotation.y * -0.6;
    core.rotation.y -= 0.0015;
    renderer.render(scene, camera);
  }
  animate();
});
