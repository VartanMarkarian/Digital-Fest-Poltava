// 3D «рідинна» металізована голограма біля «Метаноя» —
// неправильна (асиметрична) зім'ята форма, дзеркальна переливчаста поверхня (iridescence),
// закипає / бурлить великою картою висот при наведенні миші. Без глітч-ефектів.

document.addEventListener("DOMContentLoaded", () => {
  if (typeof THREE === "undefined") return;
  const container = document.getElementById("gateway-liquid");
  if (!container) return;

  let width = container.clientWidth;
  let height = container.clientHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
  camera.position.set(0, 0, 4.6);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  /* проста градієнтна equirect-текстура — імітує кольорове дзеркальне відбиття навколишнього світла */
  function buildEnvTexture() {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 128;
    const ctx = c.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0.0, "#8ec9ff");
    grad.addColorStop(0.2, "#d7a8ff");
    grad.addColorStop(0.4, "#ffd9a0");
    grad.addColorStop(0.6, "#9adfc7");
    grad.addColorStop(0.8, "#8ec9ff");
    grad.addColorStop(1.0, "#d7a8ff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);
    const vgrad = ctx.createLinearGradient(0, 0, 0, 128);
    vgrad.addColorStop(0, "rgba(255,255,255,0.55)");
    vgrad.addColorStop(0.5, "rgba(255,255,255,0.05)");
    vgrad.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = vgrad;
    ctx.fillRect(0, 0, 256, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  scene.environment = buildEnvTexture();

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);
  const lightA = new THREE.PointLight(0x8ec9ff, 2.4, 14);
  const lightB = new THREE.PointLight(0xffb0e0, 2.0, 14);
  scene.add(lightA, lightB);

  const group = new THREE.Group();
  group.scale.set(1.85, 0.74, 1.05);
  group.rotation.z = -0.14;
  scene.add(group);

  const geo = new THREE.SphereGeometry(1, 96, 64);
  const basePos = geo.attributes.position.array.slice();

  /* тримовна псевдо-шумова хвиля (без зовнішніх бібліотек) */
  function turbulence(x, y, z, freq, t) {
    return (
      Math.sin(x * freq + t * 1.3) * Math.cos(y * freq * 0.86 - t * 1.1) +
      Math.sin(y * freq * 1.42 - t * 1.7) * Math.cos(z * freq * 0.91 + t * 0.8) +
      Math.sin(z * freq * 1.73 + t * 2.1) * Math.cos(x * freq * 1.12 - t * 1.4)
    ) / 3;
  }

  /* незмінна «зім'ята», асиметрична основа форми — рахується один раз */
  const staticLump = new Float32Array(basePos.length / 3);
  for (let i = 0; i < staticLump.length; i++) {
    const bx = basePos[i * 3], by = basePos[i * 3 + 1], bz = basePos[i * 3 + 2];
    staticLump[i] =
      0.6 * Math.sin(bx * 2.6 + by * 1.8) * Math.cos(by * 2.1 - bz * 1.5) +
      0.3 * Math.sin(by * 4.4 - bz * 3.1) * Math.cos(bz * 3.6 + bx * 2.3) +
      0.15 * Math.sin(bz * 6.8 + bx * 5.1) * Math.cos(bx * 5.6 - by * 3.7);
  }

  const material = new THREE.MeshPhysicalMaterial({
    color: 0xf3f3f6,
    metalness: 1,
    roughness: 0.16,
    iridescence: 1,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [120, 420],
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.4,
  });
  const mesh = new THREE.Mesh(geo, material);
  group.add(mesh);

  let targetRotX = 0;
  let targetRotY = 0;
  let curRotX = 0;
  let curRotY = 0;

  const onPointerMove = (e) => {
    const rect = container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (window.innerWidth / 2);
    const dy = (e.clientY - cy) / (window.innerHeight / 2);
    targetRotY = dx * 0.7;
    targetRotX = dy * 0.32;
  };
  window.addEventListener("pointermove", onPointerMove);

  /* «закипання» — велика карта висот активується при наведенні / кліку (для тачу) */
  let isHover = false;
  let boil = 0;
  let clickPulseUntil = 0;
  container.addEventListener("pointerenter", () => { isHover = true; });
  container.addEventListener("pointerleave", () => { isHover = false; });
  container.addEventListener("click", () => { clickPulseUntil = performance.now() + 1400; });

  function onResize() {
    width = container.clientWidth;
    height = container.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  window.addEventListener("resize", onResize);

  const posAttr = geo.attributes.position;
  let hue = 0.56;

  function animate(t) {
    requestAnimationFrame(animate);
    const time = t * 0.001;

    const boilTarget = isHover || performance.now() < clickPulseUntil ? 1 : 0;
    boil += (boilTarget - boil) * 0.07;

    const freq = 3.2 + boil * 7.0;
    const amp = 0.045 + boil * 0.55;
    const speed = 0.6 + boil * 3.0;
    const tt = time * speed;

    for (let i = 0; i < posAttr.count; i++) {
      const bx = basePos[i * 3];
      const by = basePos[i * 3 + 1];
      const bz = basePos[i * 3 + 2];
      const dynWave = turbulence(bx, by, bz, freq, tt);
      const offset = staticLump[i] * 0.24 + dynWave * amp;
      posAttr.array[i * 3] = bx + bx * offset;
      posAttr.array[i * 3 + 1] = by + by * offset;
      posAttr.array[i * 3 + 2] = bz + bz * offset;
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();

    curRotX += (targetRotX - curRotX) * 0.06;
    curRotY += (targetRotY - curRotY) * 0.06;
    group.rotation.x = curRotX;
    group.rotation.y = curRotY + time * 0.1;

    lightA.position.set(Math.cos(time * 0.35) * 2.8, Math.sin(time * 0.5) * 1.6, 2.0);
    lightB.position.set(Math.cos(time * 0.4 + Math.PI) * 2.8, Math.sin(time * 0.3 + 1) * 1.6, -2.0);

    hue = (hue + 0.00025) % 1;
    material.color.setHSL(hue, 0.22, 0.86);

    renderer.render(scene, camera);
  }
  animate(0);
});
