(() => {
  const canvas = document.querySelector('#scene');
  const avatarDialog = document.querySelector('#avatar-dialog');
  const interaction = document.querySelector('#interaction');
  const controls = new Set();
  const avatarKey = 'noirverse-avatar-v1';
  let nearby = null;
  let yaw = 0;
  let dragging = false;
  let lastPointerX = 0;
  let walkTime = 0;
  let jumpVelocity = 0;
  let jumpHeight = 0;
  let transition = null;
  let enteredArea = null;
  let options = { skin: 'medium', outfit: 'dark', hair: 'dark', style: 'short' };

  try {
    const stored = localStorage.getItem(avatarKey);
    if (stored) {
      const saved = JSON.parse(stored);
      for (const [key, values] of Object.entries({
        skin: ['light', 'medium', 'dark'], outfit: ['dark', 'light', 'gray', 'blue', 'coral', 'green'],
        hair: ['dark', 'light', 'gray', 'brown', 'blond'], style: ['short', 'tall', 'none']
      })) {
        if (values.includes(saved[key])) options[key] = saved[key];
      }
    }
  } catch (error) {
    console.error('Não foi possível carregar o personagem:', error);
    notify('Não foi possível carregar a personalização do personagem.');
  }

  let renderer;
  try {
    if (!window.THREE) throw new Error('Biblioteca 3D não carregada');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    console.error('Não foi possível iniciar o mundo 3D:', error);
    document.querySelector('#game-error').hidden = false;
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x86c8ea);
  scene.fog = new THREE.Fog(0x86c8ea, 85, 180);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 250);
  scene.add(new THREE.HemisphereLight(0xe4f6ff, 0x62845b, 2.0));
  const sun = new THREE.DirectionalLight(0xffefd0, 2.7);
  sun.position.set(-25, 55, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -65;
  sun.shadow.camera.right = 65;
  sun.shadow.camera.top = 65;
  sun.shadow.camera.bottom = -65;
  sun.shadow.camera.far = 150;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);

  const material = (color, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });
  const white = material(0xf8f2de);
  const pale = material(0x76bd6e);
  const dark = material(0x594a44);
  const black = material(0x343b4f);
  const groundMaterial = material(0x83c96d);
  const concrete = material(0xe6d4ad);
  const glass = new THREE.MeshStandardMaterial({ color: 0x88c8d8, metalness: 0.15, roughness: 0.25 });
  const treeLeaves = material(0x4a9d57);
  const treeHighlights = material(0x78c76d);
  const treeTrunk = material(0x8d694e);
  const buildingColors = {
    treinos: { wall: material(0xf1a58f), roof: material(0xaf594f), glow: 0xffbaa8 },
    estudos: { wall: material(0xf3d685), roof: material(0xc5933f), glow: 0xffe7a4 },
    financas: { wall: material(0x9bcfd1), roof: material(0x548d9e), glow: 0xb9f4f3 }
  };
  function box(parent, width, height, depth, mat, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(parent, top, bottom, height, mat, x, y, z, segments = 12) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, segments), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function textSprite(text, subtitle) {
    const surface = document.createElement('canvas');
    surface.width = 512;
    surface.height = 144;
    const ctx = surface.getContext('2d');
    ctx.fillStyle = 'rgba(40,52,65,.92)';
    ctx.fillRect(0, 0, 512, 144);
    ctx.strokeStyle = '#f5e1af';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 508, 140);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 43px Arial';
    ctx.fillText(text, 256, 64);
    ctx.fillStyle = '#d5e5e4';
    ctx.font = 'bold 19px Arial';
    ctx.fillText(subtitle, 256, 105);
    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
    sprite.scale.set(8, 2.25, 1);
    return sprite;
  }

  box(scene, 120, 1.5, 120, groundMaterial, 0, -0.8, 0);
  box(scene, 18, 0.08, 92, concrete, 0, 0.01, -2);
  box(scene, 74, 0.09, 9, concrete, 0, 0.02, -3);
  for (let x = -54; x <= 54; x += 6) {
    for (let z = -54; z <= 54; z += 6) {
      if (Math.abs(x) < 11 || Math.abs(z + 3) < 6) continue;
      box(scene, 0.07, 0.02, 5.9, pale, x, 0.01, z);
      box(scene, 5.9, 0.02, 0.07, pale, x, 0.01, z);
    }
  }
  const areas = [
    { id: 'treinos', x: -25, z: -16, title: 'TRAINING', sub: 'CUIDE DO SEU CORPO', number: '01' },
    { id: 'estudos', x: 0, z: -31, title: 'STUDY', sub: 'EXPLORE SUAS IDEIAS', number: '02' },
    { id: 'financas', x: 25, z: -16, title: 'OFFICE', sub: 'CONSTRUA SEU FUTURO', number: '03' }
  ];
  const rings = [];
  function building(area) {
    const g = new THREE.Group();
    g.position.set(area.x, 0, area.z);
    scene.add(g);
    const colors = buildingColors[area.id];
    box(g, 14, 0.6, 12, dark, 0, 0.3, 0);
    box(g, 0.4, 7, 10, colors.wall, -6.3, 4.1, 0);
    box(g, 0.4, 7, 10, colors.wall, 6.3, 4.1, 0);
    box(g, 13, 7, 0.4, colors.wall, 0, 4.1, -4.8);
    box(g, 4.35, 7, 0.4, colors.wall, -4.325, 4.1, 4.8);
    box(g, 4.35, 7, 0.4, colors.wall, 4.325, 4.1, 4.8);
    box(g, 4.3, 1.5, 0.4, colors.wall, 0, 6.85, 4.8);
    box(g, 14, 0.5, 11, colors.roof, 0, 7.85, 0);
    box(g, 12, 0.25, 9, white, 0, 8.22, 0);
    box(g, 0.5, 5.5, 0.25, black, -1.9, 3.35, 5.12);
    box(g, 0.5, 5.5, 0.25, black, 1.9, 3.35, 5.12);
    box(g, 4.3, 0.45, 0.25, black, 0, 5.9, 5.12);
    const door = new THREE.Group();
    door.position.set(-1.575, 0, 5.28);
    g.add(door);
    box(door, 3.15, 4.6, 0.15, glass, 1.575, 2.95, 0);
    box(door, 0.12, 0.6, 0.12, white, 2.55, 2.7, 0.15);
    area.door = door;
    for (const x of [-4.5, 4.5]) {
      box(g, 3, 3, 0.18, black, x, 4.3, 5.12);
      box(g, 2.65, 2.65, 0.2, glass, x, 4.3, 5.25);
      box(g, 0.08, 2.65, 0.08, white, x, 4.3, 5.4);
      box(g, 2.65, 0.08, 0.08, white, x, 4.3, 5.4);
    }
    box(g, 15, 0.25, 2, colors.roof, 0, 6.85, 5.7);
    const label = textSprite(area.title, `${area.number}  /  ${area.sub}`);
    label.position.set(0, 10.1, 5);
    g.add(label);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.3, 48), new THREE.MeshBasicMaterial({ color: colors.glow, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(area.x, 0.07, area.z + 8.3);
    scene.add(ring);
    rings.push(ring);
    area.entranceZ = area.z + 8.3;
  }
  areas.forEach(building);

  function tree(x, z, scale) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    scene.add(g);
    box(g, 0.8, 3.5, 0.8, treeTrunk, 0, 1.75, 0);
    box(g, 3.7, 2.7, 3.7, treeLeaves, 0, 4.4, 0);
    box(g, 2.8, 2.4, 2.8, treeHighlights, 0, 6.5, 0);
  }
  [[-44,-38,1.3],[-38,3,1],[-45,25,1.2],[-30,38,1.1],[39,-36,1.2],[43,5,1.1],[37,32,1.35],[-16,-43,1],[19,-48,1.1],[8,43,.9]].forEach(args => tree(...args));
  function cloud(x, y, z, scale) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.scale.setScalar(scale);
    scene.add(group);
    box(group, 8, 1.2, 2.4, white, 0, 0, 0);
    box(group, 3.4, 1.4, 2.4, white, -1.6, 1, 0);
    box(group, 2.5, 1, 2.4, white, 1.5, 0.8, 0);
  }
  [[-35,31,-55,1.3],[5,37,-65,1.1],[43,30,-48,1.4],[-55,28,8,.9],[50,35,25,1]].forEach(args => cloud(...args));
  function lamp(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    scene.add(g);
    box(g, 0.5, 0.5, 0.5, dark, 0, 0.25, 0);
    cylinder(g, 0.12, 0.18, 5, dark, 0, 2.75, 0);
    box(g, 1.1, 0.8, 1.1, white, 0, 5.5, 0);
    box(g, 1.3, 0.2, 1.3, black, 0, 6, 0);
  }
  [[-10,12],[10,12],[-36,-3],[36,-3],[-10,-19],[10,-19]].forEach(args => lamp(...args));
  for (let i = 0; i < 10; i++) {
    const x = -48 + i * 10.7;
    box(scene, 0.45, 2.2, 0.45, dark, x, 1.1, 49);
    if (i < 9) box(scene, 10.5, 0.24, 0.25, dark, x + 5.3, 1.5, 49);
  }

  const boardSurface = document.createElement('canvas');
  boardSurface.width = 1024;
  boardSurface.height = 576;
  const boardTexture = new THREE.CanvasTexture(boardSurface);
  boardTexture.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Group();
  board.position.set(-9, 0, -8);
  board.rotation.y = 0.15;
  scene.add(board);
  box(board, 1, 6, 1, black, -5.3, 3, 0);
  box(board, 1, 6, 1, black, 5.3, 3, 0);
  box(board, 13, 7.4, 0.7, black, 0, 7, 0);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(12, 6.4), new THREE.MeshBasicMaterial({ map: boardTexture }));
  screen.position.set(0, 7, 0.37);
  board.add(screen);
  window.refreshGameBoard = (completed, total, percent) => {
    const ctx = boardSurface.getContext('2d');
    ctx.fillStyle = '#263c50';
    ctx.fillRect(0, 0, 1024, 576);
    ctx.fillStyle = '#9bced1';
    ctx.font = 'bold 25px Arial';
    ctx.fillText('NOIRVERSE    /    SEU PROGRESSO', 60, 67);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 70px Arial';
    ctx.fillText('CADA PASSO', 60, 165);
    ctx.fillText('CONTA.', 60, 245);
    ctx.fillStyle = '#b7d9d5';
    ctx.font = 'bold 23px Arial';
    ctx.fillText('TREINOS + ESTUDOS + ESCRITÓRIO', 63, 310);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 100px Arial';
    ctx.fillText(`${percent}%`, 60, 425);
    ctx.fillStyle = '#b7d9d5';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`${completed} DE ${total} MISSÕES CONCLUÍDAS`, 360, 395);
    ctx.fillStyle = '#57717c';
    ctx.fillRect(360, 420, 585, 14);
    ctx.fillStyle = '#f5ce77';
    ctx.fillRect(360, 420, 585 * percent / 100, 14);
    ctx.fillStyle = '#9bced1';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('SEU RITMO. SUAS CONQUISTAS.', 60, 515);
    boardTexture.needsUpdate = true;
  };
  updateProgress();

  const player = new THREE.Group();
  player.position.set(0, 0, 20);
  scene.add(player);
  const torsoMaterial = material(0x222222);
  const skinMaterial = material(0xb2b2b2);
  const hairMaterial = material(0x1a1a1a);
  box(player, 1.5, 1.65, 0.85, torsoMaterial, 0, 2.05, 0);
  box(player, 1.18, 1.2, 1.05, skinMaterial, 0, 3.48, 0);
  const hair = box(player, 1.3, 0.35, 1.15, hairMaterial, 0, 4.08, 0);
  box(player, 0.16, 0.16, 0.08, black, -0.27, 3.55, -0.54);
  box(player, 0.16, 0.16, 0.08, black, 0.27, 3.55, -0.54);
  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  leftArm.position.set(-1.04, 2.75, 0);
  rightArm.position.set(1.04, 2.75, 0);
  player.add(leftArm, rightArm);
  box(leftArm, 0.55, 1.25, 0.65, torsoMaterial, 0, -0.55, 0);
  box(leftArm, 0.52, 0.35, 0.62, skinMaterial, 0, -1.32, 0);
  box(rightArm, 0.55, 1.25, 0.65, torsoMaterial, 0, -0.55, 0);
  box(rightArm, 0.52, 0.35, 0.62, skinMaterial, 0, -1.32, 0);
  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  leftLeg.position.set(-0.4, 1.25, 0);
  rightLeg.position.set(0.4, 1.25, 0);
  player.add(leftLeg, rightLeg);
  box(leftLeg, 0.65, 1.15, 0.75, dark, 0, -0.57, 0);
  box(rightLeg, 0.65, 1.15, 0.75, dark, 0, -0.57, 0);
  box(leftLeg, 0.7, 0.22, 0.95, black, 0, -1.12, -0.1);
  box(rightLeg, 0.7, 0.22, 0.95, black, 0, -1.12, -0.1);

  function applyAvatar() {
    skinMaterial.color.set({ light: 0xf1c9a6, medium: 0xc98e68, dark: 0x80513b }[options.skin]);
    torsoMaterial.color.set({ dark: 0x242424, light: 0xebebeb, gray: 0x858585, blue: 0x4689c3, coral: 0xe27e72, green: 0x5da86b }[options.outfit]);
    hairMaterial.color.set({ dark: 0x1a1a1a, light: 0xe5e5e5, gray: 0x888888, brown: 0x654332, blond: 0xd4a75d }[options.hair]);
    hair.visible = options.style !== 'none';
    hair.scale.y = options.style === 'tall' ? 2.4 : 1;
    hair.position.y = options.style === 'tall' ? 4.32 : 4.08;
    for (const key of Object.keys(options)) document.querySelector(`#avatar-${key}`).value = options[key];
  }
  applyAvatar();
  for (const key of Object.keys(options)) {
    document.querySelector(`#avatar-${key}`).addEventListener('change', event => {
      options[key] = event.target.value;
      applyAvatar();
      try {
        localStorage.setItem(avatarKey, JSON.stringify(options));
      } catch (error) {
        console.error('Não foi possível salvar o personagem:', error);
        notify('Não foi possível salvar a personalização neste navegador.');
      }
    });
  }
  document.querySelector('#customize-button').addEventListener('click', () => {
    if (transition) return;
    controls.clear();
    avatarDialog.showModal();
  });
  document.querySelector('#close-avatar').addEventListener('click', () => avatarDialog.close());
  document.querySelector('#done-avatar').addEventListener('click', () => avatarDialog.close());

  function isBlocked(x, z) {
    return areas.some(area => Math.abs(x - area.x) < 7.6 && Math.abs(z - area.z) < 6.6)
      || (Math.abs(x + 9) < 7 && Math.abs(z + 8) < 1.4);
  }
  function updateNearby() {
    nearby = null;
    let min = Infinity;
    for (const area of areas) {
      const distance = Math.hypot(player.position.x - area.x, player.position.z - area.entranceZ);
      if (distance < 4.2 && distance < min) {
        nearby = area.id;
        min = distance;
      }
    }
    interaction.hidden = !nearby || dialog.open || avatarDialog.open || Boolean(transition);
    if (nearby) document.querySelector('#near-name').textContent = names[nearby];
  }
  function enter() {
    if (nearby && !dialog.open && !avatarDialog.open && !transition) {
      controls.clear();
      jumpHeight = 0;
      jumpVelocity = 0;
      const area = areas.find(item => item.id === nearby);
      transition = { area, elapsed: 0, startX: player.position.x, startZ: player.position.z };
      document.querySelector('#transition-name').textContent = names[area.id];
      updateNearby();
    }
  }
  document.addEventListener('keydown', event => {
    if (dialog.open || avatarDialog.open || transition) return;
    const key = event.key.toLowerCase();
    if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)) {
      event.preventDefault();
      canvas.focus({ preventScroll: true });
      controls.add(key);
      if (key === ' ' && jumpHeight === 0) jumpVelocity = 7;
    } else if (key === 'enter' && (event.target === document.body || event.target === canvas)) {
      event.preventDefault();
      controls.add('enter');
    } else if (key === 'e' && (event.target === document.body || event.target === canvas)) {
      event.preventDefault();
      enter();
    }
  });
  document.addEventListener('keyup', event => {
    const key = event.key.toLowerCase();
    if (key === 'enter' && controls.has('enter')) {
      event.preventDefault();
      controls.delete('enter');
      enter();
      return;
    }
    controls.delete(key);
  });
  window.addEventListener('blur', () => controls.clear());
  canvas.addEventListener('pointerdown', event => {
    if (transition) return;
    dragging = true;
    lastPointerX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    yaw -= (event.clientX - lastPointerX) * 0.006;
    lastPointerX = event.clientX;
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  document.querySelectorAll('[data-move]').forEach(button => {
    const key = { up: 'w', down: 's', left: 'a', right: 'd' }[button.dataset.move];
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      if (transition || dialog.open || avatarDialog.open) return;
      button.setPointerCapture(event.pointerId);
      controls.add(key);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => controls.delete(key));
  });
  document.querySelector('#mobile-enter').addEventListener('click', () => {
    if (nearby) enter();
    else notify('Aproxime-se da entrada de um espaço.');
  });
  dialog.addEventListener('close', () => {
    if (enteredArea) {
      player.position.set(enteredArea.x, 0, enteredArea.entranceZ);
      enteredArea.door.rotation.y = 0;
      enteredArea = null;
    }
    updateNearby();
  });
  avatarDialog.addEventListener('close', updateNearby);
  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
  const clock = new THREE.Clock();
  const cameraTarget = new THREE.Vector3();
  function animate() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const paused = dialog.open || avatarDialog.open || Boolean(transition);
    let horizontal = 0;
    let vertical = 0;
    if (!paused) {
      horizontal = Number(controls.has('d') || controls.has('arrowright')) - Number(controls.has('a') || controls.has('arrowleft'));
      vertical = Number(controls.has('w') || controls.has('arrowup')) - Number(controls.has('s') || controls.has('arrowdown'));
    }
    let moving = horizontal !== 0 || vertical !== 0;
    if (moving) {
      const length = Math.hypot(horizontal, vertical);
      horizontal /= length;
      vertical /= length;
      const dx = (Math.cos(yaw) * horizontal - Math.sin(yaw) * vertical) * 10 * dt;
      const dz = (-Math.sin(yaw) * horizontal - Math.cos(yaw) * vertical) * 10 * dt;
      const x = THREE.MathUtils.clamp(player.position.x + dx, -56, 56);
      const z = THREE.MathUtils.clamp(player.position.z + dz, -56, 56);
      if (!isBlocked(x, player.position.z)) player.position.x = x;
      if (!isBlocked(player.position.x, z)) player.position.z = z;
      const angle = Math.atan2(-dx, -dz);
      const difference = Math.atan2(Math.sin(angle - player.rotation.y), Math.cos(angle - player.rotation.y));
      player.rotation.y += difference * Math.min(1, dt * 12);
      walkTime += dt * 11;
    }
    if (transition) {
      transition.elapsed += dt;
      const { area, elapsed, startX, startZ } = transition;
      area.door.rotation.y = Math.min(elapsed / 0.65, 1) * Math.PI * 0.48;
      const step = THREE.MathUtils.clamp((elapsed - 0.4) / 1.15, 0, 1);
      const eased = step * step * (3 - 2 * step);
      player.position.x = THREE.MathUtils.lerp(startX, area.x, eased);
      player.position.z = THREE.MathUtils.lerp(startZ, area.z + 5.1, eased);
      player.rotation.y = 0;
      moving = step > 0 && step < 1;
      if (moving) walkTime += dt * 11;
      if (elapsed >= 1.15) document.querySelector('#transition-screen').classList.add('visible');
      if (elapsed >= 1.85) {
        enteredArea = area;
        transition = null;
        openArea(area.id);
        document.querySelector('#transition-screen').classList.remove('visible');
      }
    }
    const swing = moving ? Math.sin(walkTime) * 0.65 : 0;
    leftArm.rotation.x = swing;
    rightArm.rotation.x = -swing;
    leftLeg.rotation.x = -swing;
    rightLeg.rotation.x = swing;
    if (!paused && (jumpHeight > 0 || jumpVelocity > 0)) {
      jumpVelocity -= 18 * dt;
      jumpHeight = Math.max(0, jumpHeight + jumpVelocity * dt);
      if (jumpHeight === 0) jumpVelocity = 0;
    }
    player.position.y = jumpHeight + (moving ? Math.abs(Math.sin(walkTime)) * 0.06 : 0);
    rings.forEach((ring, index) => {
      ring.material.opacity = 0.55 + Math.sin(clock.elapsedTime * 2 + index) * 0.2;
    });
    cameraTarget.set(player.position.x + Math.sin(yaw) * 24, 13 + jumpHeight * 0.3, player.position.z + Math.cos(yaw) * 24);
    camera.position.lerp(cameraTarget, 1 - Math.exp(-4 * dt));
    camera.lookAt(player.position.x, 4 + jumpHeight, player.position.z);
    updateNearby();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  camera.position.set(0, 13, 44);
  updateNearby();
  animate();
})();
