(() => {
  const canvas = document.querySelector('#scene');
  const avatarDialog = document.querySelector('#avatar-dialog');
  const interaction = document.querySelector('#interaction');
  const controls = new Set();
  const avatarKey = 'noirverse-avatar-v1';
  const argosAdminUrl = 'https://app-argos-livid.vercel.app/';
  let nearby = null;
  let yaw = 0;
  let dragging = false;
  let lastPointerX = 0;
  let walkTime = 0;
  let walkBlend = 0;
  let moveSpeed = 0;
  let jumpVelocity = 0;
  let jumpHeight = 0;
  let landingImpact = 0;
  let dustTimer = 0;
  let transition = null;
  let enteredArea = null;
  let options = { skin: 'medium', outfit: 'dark', hair: 'dark', style: 'short', theme: 'hero', primary: '#184d78', secondary: '#15263e', accent: '#ffc758' };

  try {
    const stored = localStorage.getItem(avatarKey);
    if (stored) {
      const saved = JSON.parse(stored);
      for (const [key, values] of Object.entries({
        skin: ['light', 'medium', 'dark'], outfit: ['dark', 'light', 'gray', 'blue', 'coral', 'green', 'custom'],
        hair: ['dark', 'light', 'gray', 'brown', 'blond'], style: ['short', 'tall', 'none'], theme: ['hero', 'casual']
      })) {
        if (values.includes(saved[key])) options[key] = saved[key];
      }
      for (const key of ['primary', 'secondary', 'accent']) {
        if (typeof saved[key] === 'string' && /^#[0-9a-f]{6}$/i.test(saved[key])) options[key] = saved[key];
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
  renderer.toneMappingExposure = 1.05;

  let scene = new THREE.Scene();
  const worldScene = scene;
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 512;
  skyCanvas.height = 256;
  const skyContext = skyCanvas.getContext('2d');
  const skyGradient = skyContext.createLinearGradient(0, 0, 0, skyCanvas.height);
  skyGradient.addColorStop(0, '#35638c');
  skyGradient.addColorStop(0.3, '#6d9db9');
  skyGradient.addColorStop(0.44, '#aec9ce');
  skyGradient.addColorStop(0.5, '#ead3bc');
  skyGradient.addColorStop(0.65, '#c6cbc0');
  skyGradient.addColorStop(1, '#879f8e');
  skyContext.fillStyle = skyGradient;
  skyContext.fillRect(0, 0, skyCanvas.width, skyCanvas.height);
  const skyTexture = new THREE.CanvasTexture(skyCanvas);
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  skyTexture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = skyTexture;
  scene.fog = new THREE.Fog(0xdacbbd, 55, 145);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 250);
  scene.add(new THREE.HemisphereLight(0xc8dfff, 0x607a63, 1.05));
  const sun = new THREE.DirectionalLight(0xffd5a5, 2.8);
  sun.position.set(-38, 34, 30);
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
  const dark = material(0x594a44);
  const black = material(0x343b4f);
  const groundMaterial = material(0x83c96d);
  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = grassCanvas.height = 256;
  const grassContext = grassCanvas.getContext('2d');
  grassContext.fillStyle = '#83c96d';
  grassContext.fillRect(0, 0, 256, 256);
  let grassSeed = 17;
  const grassRandom = () => {
    grassSeed = (grassSeed * 16807) % 2147483647;
    return grassSeed / 2147483647;
  };
  for (let i = 0; i < 1800; i++) {
    grassContext.fillStyle = i % 2 ? 'rgba(42,101,43,0.12)' : 'rgba(225,243,156,0.14)';
    grassContext.fillRect(grassRandom() * 256, grassRandom() * 256, 1 + grassRandom() * 2, 2 + grassRandom() * 5);
  }
  const grassTexture = new THREE.CanvasTexture(grassCanvas);
  grassTexture.colorSpace = THREE.SRGBColorSpace;
  grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(14, 14);
  grassTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  groundMaterial.color.set(0xffffff);
  groundMaterial.map = grassTexture;
  const pavementCanvas = document.createElement('canvas');
  pavementCanvas.width = pavementCanvas.height = 256;
  const pavementContext = pavementCanvas.getContext('2d');
  pavementContext.fillStyle = '#d4c7b1';
  pavementContext.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) {
    pavementContext.fillStyle = i % 2 ? 'rgba(77,67,58,0.10)' : 'rgba(255,255,255,0.13)';
    pavementContext.fillRect(grassRandom() * 256, grassRandom() * 256, 1 + grassRandom() * 2, 1 + grassRandom() * 2);
  }
  pavementContext.strokeStyle = 'rgba(89,80,68,0.32)';
  pavementContext.lineWidth = 2;
  for (let i = 0; i < 256; i += 64) {
    pavementContext.beginPath();
    pavementContext.moveTo(i + 1, 0);
    pavementContext.lineTo(i + 1, 256);
    pavementContext.moveTo(0, i + 1);
    pavementContext.lineTo(256, i + 1);
    pavementContext.stroke();
  }
  function pavement(width, depth) {
    const texture = new THREE.CanvasTexture(pavementCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(width / 8, depth / 8);
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 });
  }
  function outdoorGlass(color, metalness = 0.2) {
    return new THREE.MeshStandardMaterial({ color, metalness, roughness: 0.2, envMap: skyTexture, envMapIntensity: 1.15 });
  }
  const glass = outdoorGlass(0x88c8d8);
  const indoorGlass = new THREE.MeshStandardMaterial({ color: 0x88c8d8, metalness: 0.15, roughness: 0.25 });
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
  box(scene, 18, 0.08, 92, pavement(18, 92), 0, 0.01, -2);
  box(scene, 74, 0.09, 9, pavement(74, 9), 0, 0.02, -3);
  const areas = [
    { id: 'treinos', x: -35, z: -27, title: 'TRAINING', sub: 'CUIDE DO SEU CORPO', number: '01', halfWidth: 10, halfDepth: 7 },
    { id: 'estudos', x: 0, z: 50, title: 'FACULDADE', sub: 'EXPLORE SUAS IDEIAS', number: '02', direction: -1, halfWidth: 17, halfDepth: 9.2 },
    { id: 'financas', x: 0, z: -31, title: 'ARGOS', sub: 'SEUS NEGÓCIOS', number: '03', halfWidth: 12.5, halfDepth: 9.2 }
  ];
  const rings = [];
  const cameraObstacles = [];
  const sceneryObstacles = [];
  function addEntrance(area, group, frontZ, doorMaterial = glass) {
    const door = new THREE.Group();
    door.position.set(-1.575, 0, frontZ);
    group.add(door);
    box(door, 3.15, 4.6, 0.15, doorMaterial, 1.575, 2.95, 0);
    box(door, 0.12, 0.6, 0.12, white, 2.55, 2.7, 0.15);
    area.door = door;
  }
  function addRing(area, distance) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.3, 48), new THREE.MeshBasicMaterial({ color: buildingColors[area.id].glow, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    area.entranceZ = area.z + (area.direction || 1) * distance;
    ring.position.set(area.x, 0.07, area.entranceZ);
    scene.add(ring);
    rings.push(ring);
  }
  function college(area) {
    const g = new THREE.Group();
    g.position.set(area.x, 0, area.z);
    g.rotation.y = Math.PI;
    scene.add(g);
    const stone = material(0xebecef);
    const brightStone = material(0xffffff);
    const stoneShade = material(0xc3c8cc);
    const roof = material(0x555d68);
    const frames = material(0x596573);
    const windows = outdoorGlass(0xb9d7e4);

    box(g, 33, 0.7, 18, stoneShade, 0, 0.35, 0);
    box(g, 0.5, 14, 16, stone, -15.75, 7.7, 0);
    box(g, 0.5, 14, 16, stone, 15.75, 7.7, 0);
    box(g, 32, 14, 0.5, stone, 0, 7.7, -7.75);
    box(g, 14, 14, 0.5, stone, -9, 7.7, 7.75);
    box(g, 14, 14, 0.5, stone, 9, 7.7, 7.75);
    box(g, 4, 8.5, 0.5, stone, 0, 10.45, 7.75);
    box(g, 33, 0.5, 17.4, stoneShade, 0, 14.95, 0);
    box(g, 33.6, 0.35, 18, brightStone, 0, 15.37, 0);
    box(g, 31, 0.18, 15.5, roof, 0, 15.63, -0.3);
    box(g, 33, 0.4, 0.7, brightStone, 0, 15.85, 8.4);
    box(g, 33, 0.3, 0.6, brightStone, 0, 7.8, 8.15);
    box(g, 33, 0.25, 0.55, brightStone, 0, 1.15, 8.15);

    function facadeWindow(x, y, width, height, front = 8.05) {
      box(g, width + 0.24, height + 0.24, 0.14, frames, x, y, front);
      box(g, width, height, 0.14, windows, x, y, front + 0.11);
      for (let offset = -width / 2 + 0.7; offset < width / 2; offset += 0.7) {
        box(g, 0.07, height, 0.08, frames, x + offset, y, front + 0.22);
      }
      box(g, width, 0.07, 0.08, frames, x, y, front + 0.22);
    }
    for (const side of [-1, 1]) {
      facadeWindow(side * 10, 4.3, 8.4, 4.8);
      facadeWindow(side * 10, 11.4, 8.4, 4.6);
      for (const y of [1.75, 8.95]) box(g, 9.1, 0.22, 0.45, brightStone, side * 10, y, 8.28);
      for (const x of [5.4, 14.6]) {
        box(g, 0.55, 13.8, 0.65, brightStone, side * x, 7.7, 8.32);
        box(g, 0.85, 0.35, 0.9, brightStone, side * x, 14.45, 8.32);
        box(g, 0.85, 0.35, 0.9, brightStone, side * x, 1.1, 8.32);
      }
      for (const z of [-5, -1.5, 2, 5.5]) {
        box(g, 0.18, 5, 2.7, frames, side * 16.02, 10.7, z);
        box(g, 0.2, 4.7, 2.4, windows, side * 16.12, 10.7, z);
        box(g, 0.18, 5, 2.7, frames, side * 16.02, 4.4, z);
        box(g, 0.2, 4.7, 2.4, windows, side * 16.12, 4.4, z);
      }
    }

    const arch = new THREE.Shape();
    arch.moveTo(-4.2, 0.7);
    arch.lineTo(-4.2, 13);
    arch.absarc(0, 13, 4.2, Math.PI, 0, true);
    arch.lineTo(4.2, 0.7);
    arch.closePath();
    const doorway = new THREE.Path();
    doorway.moveTo(-1.75, 0.7);
    doorway.lineTo(-1.75, 6);
    doorway.lineTo(1.75, 6);
    doorway.lineTo(1.75, 0.7);
    doorway.closePath();
    arch.holes.push(doorway);
    const facade = new THREE.Mesh(new THREE.ShapeGeometry(arch, 32), brightStone);
    facade.position.z = 8.48;
    g.add(facade);
    const archTrim = new THREE.Mesh(new THREE.RingGeometry(3.75, 4.05, 48, 1, 0, Math.PI), stoneShade);
    archTrim.position.set(0, 13, 8.53);
    g.add(archTrim);
    const roundWindow = new THREE.Mesh(new THREE.CircleGeometry(2.9, 48), windows);
    roundWindow.position.set(0, 13, 8.55);
    g.add(roundWindow);
    const roundFrame = new THREE.Mesh(new THREE.RingGeometry(2.8, 2.95, 48), frames);
    roundFrame.position.set(0, 13, 8.58);
    g.add(roundFrame);
    for (let i = 0; i < 8; i++) {
      const spoke = box(g, 0.07, 5.6, 0.08, frames, 0, 13, 8.64);
      spoke.rotation.z = i * Math.PI / 8;
    }
    const centerWindow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), stone);
    centerWindow.position.set(0, 13, 8.7);
    g.add(centerWindow);
    facadeWindow(0, 8.65, 2.5, 4.1, 8.55);
    addEntrance(area, g, 8.65);
    for (const x of [-2.5, 2.5]) {
      cylinder(g, 0.28, 0.35, 5.8, brightStone, x, 3.6, 8.95, 16);
      box(g, 0.8, 0.3, 0.8, stoneShade, x, 0.75, 8.95);
      box(g, 0.8, 0.3, 0.8, brightStone, x, 6.5, 8.95);
    }
    box(g, 6, 0.4, 1.4, brightStone, 0, 6.8, 8.95);

    cylinder(g, 4.8, 4.8, 0.45, brightStone, 0, 15.9, -0.5, 48);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(4.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), windows);
    dome.position.set(0, 16.15, -0.5);
    g.add(dome);
    for (let i = 0; i < 12; i++) {
      const points = [];
      const angle = i * Math.PI / 6;
      for (let j = 0; j <= 16; j++) {
        const latitude = j * Math.PI / 32;
        points.push(new THREE.Vector3(Math.cos(angle) * Math.sin(latitude) * 4.62, 16.15 + Math.cos(latitude) * 4.62, -0.5 + Math.sin(angle) * Math.sin(latitude) * 4.62));
      }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, 0.06, 5, false), frames));
    }
    cylinder(g, 1.05, 1.2, 0.7, brightStone, 0, 20.95, -0.5, 24);
    for (let i = 0; i < 3; i++) box(g, 10 + i * 1.8, 0.12, 0.8, stoneShade, 0, 0.12 + i * 0.13, 11.2 - i * 0.8);
    for (const side of [-1, 1]) {
      box(g, 4.5, 0.3, 1.2, stoneShade, side * 6.5, 0.5, 10.1);
      for (let i = 0; i < 6; i++) cylinder(g, 0.07, 0.07, 1.2, brightStone, side * (4.4 + i * 0.8), 1.25, 10.1, 8);
      box(g, 4.5, 0.13, 0.13, brightStone, side * 6.5, 1.9, 10.1);
    }
    const labelTexture = textSprite(area.title, '02  /  SEU ESPAÇO DE ESTUDOS').material.map;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.97), new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true }));
    label.position.set(0, 17.8, 8.5);
    g.add(label);
    g.traverse(object => { if (object.isMesh) cameraObstacles.push(object); });
    area.insideZ = area.z - 7.7;
    addRing(area, 11.3);
  }
  function company(area) {
    const g = new THREE.Group();
    g.position.set(area.x, 0, area.z);
    scene.add(g);
    const structure = material(0x263e50, 0.45);
    const facade = outdoorGlass(0x508796, 0.35);
    const trim = material(0xd0e6e5, 0.4);
    const glow = new THREE.MeshBasicMaterial({ color: 0x83e8f4 });
    box(g, 25, 0.7, 18, structure, 0, 0.35, 0);
    box(g, 0.5, 30, 16, structure, -11.75, 15.7, 0);
    box(g, 0.5, 30, 16, structure, 11.75, 15.7, 0);
    box(g, 24, 30, 0.5, structure, 0, 15.7, -7.75);
    box(g, 10, 30, 0.5, structure, -7, 15.7, 7.75);
    box(g, 10, 30, 0.5, structure, 7, 15.7, 7.75);
    box(g, 4, 24.7, 0.5, structure, 0, 18.35, 7.75);
    box(g, 24.8, 0.7, 17.4, trim, 0, 30.9, 0);
    box(g, 23, 0.4, 16, structure, 0, 31.45, 0);
    box(g, 11, 0.7, 8, structure, 0, 32, -0.5);
    box(g, 11.5, 0.25, 8.5, glow, 0, 32.5, -0.5);
    for (let floor = 0; floor < 5; floor++) {
      const y = 4.1 + floor * 5.3;
      for (const x of [-7, 7]) {
        box(g, 8.8, 4.2, 0.15, facade, x, y, 8.06);
        for (let divider = -3; divider <= 3; divider += 1.5) {
          box(g, 0.1, 4.2, 0.1, trim, x + divider, y, 8.19);
        }
      }
      box(g, 24.1, 0.2, 0.3, trim, 0, y + 2.3, 8.1);
      for (const side of [-1, 1]) {
        box(g, 0.18, 4.2, 13.8, facade, side * 12.05, y, 0);
        for (const z of [-5, -2.5, 0, 2.5, 5]) {
          box(g, 0.1, 4.2, 0.1, trim, side * 12.2, y, z);
        }
      }
    }
    for (const x of [-11.4, -2.2, 2.2, 11.4]) {
      box(g, 0.3, 30, 0.35, trim, x, 15.7, 8.18);
    }
    box(g, 5.2, 0.45, 1.4, glow, 0, 6.6, 8.6);
    box(g, 5.7, 0.55, 1.7, structure, 0, 6.25, 8.6);
    box(g, 0.4, 5.5, 0.3, trim, -1.9, 3.4, 8.12);
    box(g, 0.4, 5.5, 0.3, trim, 1.9, 3.4, 8.12);
    for (const x of [-5, 5]) {
      box(g, 0.45, 1.3, 0.3, structure, x, 1.4, 8.25);
      box(g, 0.25, 0.65, 0.1, glow, x, 1.45, 8.43);
    }
    addEntrance(area, g, 8.25);
    const labelTexture = textSprite('ARGOS', 'CENTRO DE NEGÓCIOS  /  03').material.map;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.24), new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true }));
    label.position.set(0, 10.1, 8.4);
    g.add(label);
    g.traverse(object => { if (object.isMesh) cameraObstacles.push(object); });
    area.insideZ = area.z + 7.7;
    addRing(area, 11.3);
  }
  function gym(area) {
    const g = new THREE.Group();
    g.position.set(area.x, 0, area.z);
    scene.add(g);
    const wall = material(0x293d49);
    const frame = material(0xe4e9e7);
    const accent = material(0xf19b55);
    box(g, 20, 0.7, 14, wall, 0, 0.35, 0);
    box(g, 0.5, 9.5, 13, wall, -9.5, 5.45, 0);
    box(g, 0.5, 9.5, 13, wall, 9.5, 5.45, 0);
    box(g, 19, 9.5, 0.5, wall, 0, 5.45, -6.25);
    box(g, 7.5, 9.5, 0.5, wall, -5.75, 5.45, 6.25);
    box(g, 7.5, 9.5, 0.5, wall, 5.75, 5.45, 6.25);
    box(g, 4, 4.3, 0.5, wall, 0, 8.05, 6.25);
    box(g, 20.5, 0.6, 14.5, frame, 0, 10.4, 0);
    box(g, 20.5, 0.35, 0.8, accent, 0, 10.9, 6.8);
    for (const x of [-5.5, 5.5]) {
      box(g, 3, 0.65, 2, wall, x, 11, -1.5);
      for (const offset of [-0.75, 0, 0.75]) box(g, 0.12, 0.18, 1.7, frame, x + offset, 11.36, -1.5);
    }
    for (const x of [-6, 6]) {
      box(g, 6.2, 5.4, 0.16, frame, x, 4.4, 6.55);
      box(g, 5.8, 5, 0.18, glass, x, 4.4, 6.67);
      box(g, 0.15, 5, 0.1, frame, x, 4.4, 6.8);
      box(g, 5.8, 0.15, 0.1, frame, x, 4.4, 6.8);
    }
    box(g, 5, 0.5, 1.4, accent, 0, 6.3, 6.9);
    addEntrance(area, g, 6.8);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.5), new THREE.MeshBasicMaterial({ map: textSprite('ACADEMIA', 'TRAINING  /  01').material.map }));
    sign.position.set(0, 8.25, 6.7);
    g.add(sign);
    for (const x of [-7, 7]) {
      box(g, 3.2, 0.22, 0.22, frame, x, 1.8, 7.2);
      box(g, 0.4, 1.4, 0.55, accent, x - 1.1, 1.8, 7.2);
      box(g, 0.4, 1.4, 0.55, accent, x + 1.1, 1.8, 7.2);
    }
    g.traverse(object => { if (object.isMesh) cameraObstacles.push(object); });
    area.insideZ = area.z + 6;
    addRing(area, 9.5);
  }
  function building(area) {
    if (area.id === 'estudos') {
      college(area);
      return;
    }
    if (area.id === 'financas') {
      company(area);
      return;
    }
    if (area.id === 'treinos') {
      gym(area);
      return;
    }
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
    addEntrance(area, g, 5.28);
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
    area.insideZ = area.z + 4.6;
    addRing(area, 8.3);
  }
  areas.forEach(building);

  const treeCrowns = [];
  function tree(x, z, scale) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    scene.add(g);
    box(g, 0.8, 3.5, 0.8, treeTrunk, 0, 1.75, 0);
    const crown = new THREE.Group();
    crown.position.y = 3.4;
    g.add(crown);
    box(crown, 3.7, 2.7, 3.7, treeLeaves, 0, 1, 0);
    box(crown, 2.8, 2.4, 2.8, treeHighlights, 0, 3.1, 0);
    treeCrowns.push(crown);
  }
  [[-49,-42,1.3],[-38,3,1],[-45,25,1.2],[-30,38,1.1],[39,-36,1.2],[43,5,1.1],[37,32,1.35],[-16,-43,1],[19,-48,1.1]].forEach(args => tree(...args));
  const clouds = [];
  function cloud(x, y, z, scale) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.scale.setScalar(scale);
    scene.add(group);
    box(group, 8, 1.2, 2.4, white, 0, 0, 0);
    box(group, 3.4, 1.4, 2.4, white, -1.6, 1, 0);
    box(group, 2.5, 1, 2.4, white, 1.5, 0.8, 0);
    clouds.push(group);
  }
  [[-35,31,-55,1.3],[5,37,-65,1.1],[43,30,-48,1.4],[-55,28,8,.9],[50,35,25,1]].forEach(args => cloud(...args));
  function lamp(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    scene.add(g);
    box(g, 0.5, 0.5, 0.5, dark, 0, 0.25, 0);
    cylinder(g, 0.12, 0.18, 5, dark, 0, 2.75, 0);
    box(g, 1.1, 0.8, 1.1, new THREE.MeshStandardMaterial({ color: 0xfff0cc, emissive: 0xffbd62, emissiveIntensity: 0.35 }), 0, 5.5, 0);
    box(g, 1.3, 0.2, 1.3, black, 0, 6, 0);
  }
  [[-10,12],[10,12],[-36,-3],[36,-3],[-17,-19],[17,-19]].forEach(args => lamp(...args));
  const benchWood = material(0x9b6b48);
  const benchMetal = new THREE.MeshStandardMaterial({ color: 0x3e4b50, metalness: 0.45, roughness: 0.55 });
  const planterStone = material(0xb9b5aa);
  const shrubMaterial = material(0x497e4b);
  const flowerMaterial = material(0xe4b7a0);
  const shrubGeometry = new THREE.SphereGeometry(0.55, 10, 7);
  const flowerGeometry = new THREE.SphereGeometry(0.13, 8, 6);
  function addScenery(group, x, z, width, depth) {
    group.position.set(x, 0, z);
    scene.add(group);
    sceneryObstacles.push({ x, z, halfWidth: width / 2 + 0.5, halfDepth: depth / 2 + 0.5 });
    group.traverse(object => { if (object.isMesh) cameraObstacles.push(object); });
  }
  function bench(x, z) {
    const group = new THREE.Group();
    for (const zOffset of [-0.38, 0, 0.38]) box(group, 4.2, 0.18, 0.32, benchWood, 0, 1, zOffset);
    for (const y of [1.55, 1.9]) box(group, 4.2, 0.22, 0.16, benchWood, 0, y, -0.5);
    for (const xOffset of [-1.6, 1.6]) {
      box(group, 0.18, 1, 0.9, benchMetal, xOffset, 0.5, 0);
      box(group, 0.18, 1.05, 0.16, benchMetal, xOffset, 1.5, -0.5);
    }
    addScenery(group, x, z, 4.4, 1.4);
  }
  [[-15,15],[15,15],[-15,28],[15,28]].forEach(args => bench(...args));
  function planter(x, z) {
    const group = new THREE.Group();
    box(group, 3.2, 0.85, 1.5, planterStone, 0, 0.425, 0);
    box(group, 3.3, 0.15, 1.6, white, 0, 0.85, 0);
    for (const xOffset of [-1, 0, 1]) {
      const shrub = new THREE.Mesh(shrubGeometry, shrubMaterial);
      shrub.position.set(xOffset, 1.16, 0);
      shrub.scale.set(1.05, 0.8, 1);
      shrub.castShadow = true;
      group.add(shrub);
      const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
      flower.position.set(xOffset + 0.18, 1.55, 0.22);
      group.add(flower);
    }
    addScenery(group, x, z, 3.3, 1.6);
  }
  [[-16,-13],[16,-13],[-43,-18],[-27,-18],[-20,37],[20,37]].forEach(args => planter(...args));
  for (let i = 0; i < 10; i++) {
    const x = -48 + i * 10.7;
    if (Math.abs(x) > 22) box(scene, 0.45, 2.2, 0.45, dark, x, 1.1, 49);
    if (i < 9 && Math.abs(x) > 22 && Math.abs(x + 10.7) > 22) box(scene, 10.5, 0.24, 0.25, dark, x + 5.3, 1.5, 49);
  }

  const boardSurface = document.createElement('canvas');
  boardSurface.width = 1024;
  boardSurface.height = 576;
  const boardTexture = new THREE.CanvasTexture(boardSurface);
  boardTexture.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Group();
  board.position.set(30, 0, -10);
  board.rotation.y = 0.15;
  scene.add(board);
  const boardGlow = new THREE.MeshBasicMaterial({ color: 0x74e9f4 });
  box(board, 13, 7.4, 0.35, black, 0, 7, 0);
  box(board, 13.15, 0.1, 0.1, boardGlow, 0, 10.75, 0.2);
  box(board, 13.15, 0.1, 0.1, boardGlow, 0, 3.25, 0.2);
  box(board, 0.1, 7.5, 0.1, boardGlow, -6.55, 7, 0.2);
  box(board, 0.1, 7.5, 0.1, boardGlow, 6.55, 7, 0.2);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(12, 6.4), new THREE.MeshBasicMaterial({ map: boardTexture }));
  screen.position.set(0, 7, 0.21);
  board.add(screen);
  const boardBase = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.3, 48), new THREE.MeshBasicMaterial({ color: 0x7ce8f4, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
  boardBase.rotation.x = -Math.PI / 2;
  boardBase.position.set(30, 0.09, -10);
  scene.add(boardBase);
  board.traverse(object => { if (object.isMesh) cameraObstacles.push(object); });
  window.refreshGameBoard = (completed, total, percent) => {
    const ctx = boardSurface.getContext('2d');
    ctx.fillStyle = '#102a3a';
    ctx.fillRect(0, 0, 1024, 576);
    ctx.strokeStyle = '#2c6071';
    ctx.lineWidth = 2;
    for (let x = 0; x < 1024; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 576); ctx.stroke(); }
    for (let y = 0; y < 576; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke(); }
    ctx.fillStyle = '#8be9ef';
    ctx.font = 'bold 25px Arial';
    ctx.fillText('NOIRVERSE  /  CENTRAL DE PROGRESSO', 60, 67);
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
    ctx.fillStyle = '#7ce8f4';
    ctx.fillRect(360, 420, 585 * percent / 100, 14);
    ctx.fillStyle = '#9bced1';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('SEU RITMO. SUAS CONQUISTAS.', 60, 515);
    boardTexture.needsUpdate = true;
  };
  updateProgress();

  const lobbyScene = new THREE.Scene();
  lobbyScene.background = new THREE.Color(0x263e50);
  lobbyScene.add(new THREE.HemisphereLight(0xe4f6ff, 0x718493, 1.7));
  const lobbyLight = new THREE.DirectionalLight(0xfff0da, 1.5);
  lobbyLight.position.set(-5, 15, 8);
  lobbyScene.add(lobbyLight);
  const lobbyFloor = material(0xc8d4d3);
  const lobbyWall = material(0x354e60);
  const lobbyTrim = material(0xdce9e8);
  const lobbyAccent = new THREE.MeshBasicMaterial({ color: 0x79e5e9 });
  box(lobbyScene, 26, 0.5, 22, lobbyFloor, 0, -0.25, 0);
  box(lobbyScene, 26, 11, 0.5, lobbyWall, 0, 5.5, -10.5);
  box(lobbyScene, 0.5, 11, 22, lobbyWall, -12.75, 5.5, 0);
  box(lobbyScene, 0.5, 11, 12.5, lobbyWall, 12.75, 5.5, -4.75);
  box(lobbyScene, 0.5, 11, 4.5, lobbyWall, 12.75, 5.5, 8.75);
  box(lobbyScene, 0.5, 5, 5, lobbyWall, 12.75, 8.5, 4);
  box(lobbyScene, 26, 0.2, 0.3, lobbyAccent, 0, 9.8, -10.15);
  box(lobbyScene, 2, 0.12, 20, lobbyTrim, 0, 0.07, 0);
  const lobbyDestinations = [
    { id: 'argos', x: -6, entranceZ: -6.5, insideZ: -9.4 },
    { id: 'financas', x: 6, entranceZ: -6.5, insideZ: -9.4 }
  ];
  for (const destination of lobbyDestinations) {
    const doorway = new THREE.Group();
    doorway.position.set(destination.x, 0, -10);
    lobbyScene.add(doorway);
    box(doorway, 4.5, 6, 0.25, lobbyTrim, 0, 3, 0);
    addEntrance(destination, doorway, 0.2, indoorGlass);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.97), new THREE.MeshBasicMaterial({
      map: textSprite(destination.id === 'argos' ? 'ARGOS' : 'PESSOAL', destination.id === 'argos' ? 'PAINEL ADMINISTRADOR' : 'NEGÓCIOS PESSOAIS').material.map
    }));
    sign.position.set(0, 7.5, 0.3);
    doorway.add(sign);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.7, 1.9, 40), new THREE.MeshBasicMaterial({ color: 0x79e5e9, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(destination.x, 0.08, destination.entranceZ);
    lobbyScene.add(ring);
    rings.push(ring);
  }
  const lobbyExit = { id: 'exit', x: 9, entranceZ: 4, insideX: 13, insideZ: 4, rotation: -Math.PI / 2 };
  const exitDoorway = new THREE.Group();
  exitDoorway.position.set(12.45, 0, 4);
  exitDoorway.rotation.y = -Math.PI / 2;
  lobbyScene.add(exitDoorway);
  box(exitDoorway, 0.4, 6, 0.4, lobbyTrim, -1.85, 3, 0);
  box(exitDoorway, 0.4, 6, 0.4, lobbyTrim, 1.85, 3, 0);
  box(exitDoorway, 4.1, 0.4, 0.4, lobbyTrim, 0, 6, 0);
  addEntrance(lobbyExit, exitDoorway, 0.1, indoorGlass);
  const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 1.27), new THREE.MeshBasicMaterial({ map: textSprite('SAÍDA', 'VOLTAR AO MUNDO').material.map }));
  exitSign.position.set(0, 7.3, 0.25);
  exitDoorway.add(exitSign);
  const exitRing = new THREE.Mesh(new THREE.RingGeometry(1.7, 1.9, 40), new THREE.MeshBasicMaterial({ color: 0xffd079, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  exitRing.rotation.x = -Math.PI / 2;
  exitRing.position.set(lobbyExit.x, 0.08, lobbyExit.entranceZ);
  lobbyScene.add(exitRing);
  rings.push(exitRing);
  let inLobby = false;
  let outsideYaw = 0;

  const player = new THREE.Group();
  player.position.set(0, 0, 20);
  scene.add(player);
  const dustCanvas = document.createElement('canvas');
  dustCanvas.width = dustCanvas.height = 32;
  const dustContext = dustCanvas.getContext('2d');
  const dustGradient = dustContext.createRadialGradient(16, 16, 1, 16, 16, 16);
  dustGradient.addColorStop(0, 'rgba(230,213,181,0.65)');
  dustGradient.addColorStop(1, 'rgba(230,213,181,0)');
  dustContext.fillStyle = dustGradient;
  dustContext.fillRect(0, 0, 32, 32);
  const dustTexture = new THREE.CanvasTexture(dustCanvas);
  dustTexture.colorSpace = THREE.SRGBColorSpace;
  const dustParticles = Array.from({ length: 8 }, () => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTexture, transparent: true, depthWrite: false, opacity: 0 }));
    sprite.visible = false;
    worldScene.add(sprite);
    return { sprite, life: 0, duration: 0, driftX: 0, driftZ: 0 };
  });
  let dustIndex = 0;
  function emitDust(count) {
    for (let i = 0; i < count; i++) {
      const particle = dustParticles[dustIndex++ % dustParticles.length];
      const angle = Math.random() * Math.PI * 2;
      particle.life = particle.duration = 0.45 + Math.random() * 0.2;
      particle.driftX = Math.cos(angle) * 0.65;
      particle.driftZ = Math.sin(angle) * 0.65;
      particle.sprite.position.set(player.position.x + Math.cos(angle) * 0.3, 0.25, player.position.z + Math.sin(angle) * 0.3);
      particle.sprite.scale.setScalar(0.55);
      particle.sprite.visible = true;
    }
  }
  const torsoMaterial = material(0x222222);
  const skinMaterial = material(0xb2b2b2);
  const headMaterial = material(0xb2b2b2);
  const pantsMaterial = material(0x594a44);
  const eyeMaterial = material(0x343b4f);
  const heroAccent = material(0xffc758);
  const hairMaterial = material(0x1a1a1a);
  box(player, 1.5, 1.65, 0.85, torsoMaterial, 0, 2.05, 0);
  box(player, 1.18, 1.2, 1.05, headMaterial, 0, 3.48, 0);
  const hair = box(player, 1.3, 0.35, 1.15, hairMaterial, 0, 4.08, 0);
  box(player, 0.16, 0.16, 0.08, eyeMaterial, -0.27, 3.55, -0.54);
  box(player, 0.16, 0.16, 0.08, eyeMaterial, 0.27, 3.55, -0.54);
  const heroDetails = new THREE.Group();
  player.add(heroDetails);
  for (const z of [-0.46, 0.46]) {
    const emblem = box(heroDetails, 0.45, 0.45, 0.08, heroAccent, 0, 2.25, z);
    emblem.rotation.z = Math.PI / 4;
  }
  box(heroDetails, 1.52, 0.18, 0.9, heroAccent, 0, 1.4, 0);
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
  box(leftLeg, 0.65, 1.15, 0.75, pantsMaterial, 0, -0.57, 0);
  box(rightLeg, 0.65, 1.15, 0.75, pantsMaterial, 0, -0.57, 0);
  box(leftLeg, 0.7, 0.22, 0.95, black, 0, -1.12, -0.1);
  box(rightLeg, 0.7, 0.22, 0.95, black, 0, -1.12, -0.1);

  function applyAvatar() {
    const hero = options.theme === 'hero';
    skinMaterial.color.set({ light: 0xf1c9a6, medium: 0xc98e68, dark: 0x80513b }[options.skin]);
    headMaterial.color.set(hero ? options.primary : skinMaterial.color);
    torsoMaterial.color.set(hero || options.outfit === 'custom' ? options.primary : { dark: 0x242424, light: 0xebebeb, gray: 0x858585, blue: 0x4689c3, coral: 0xe27e72, green: 0x5da86b }[options.outfit]);
    pantsMaterial.color.set(hero || options.outfit === 'custom' ? options.secondary : 0x594a44);
    eyeMaterial.color.set(hero ? 0xffffff : 0x343b4f);
    heroAccent.color.set(options.accent);
    heroDetails.visible = hero;
    hairMaterial.color.set({ dark: 0x1a1a1a, light: 0xe5e5e5, gray: 0x888888, brown: 0x654332, blond: 0xd4a75d }[options.hair]);
    hair.visible = !hero && options.style !== 'none';
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
    if (inLobby) return Math.abs(x) > 11.5 || z < -8.8 || z > 9.8;
    return areas.some(area => Math.abs(x - area.x) < (area.halfWidth || 7.6) && Math.abs(z - area.z) < (area.halfDepth || 6.6))
      || sceneryObstacles.some(obstacle => Math.abs(x - obstacle.x) < obstacle.halfWidth && Math.abs(z - obstacle.z) < obstacle.halfDepth)
      || (Math.abs(x - 30) < 7 && Math.abs(z + 10) < 1.4);
  }
  function updateNearby() {
    nearby = null;
    let min = Infinity;
    for (const area of (inLobby ? [...lobbyDestinations, lobbyExit] : areas)) {
      const distance = Math.hypot(player.position.x - area.x, player.position.z - area.entranceZ);
      if (distance < (inLobby ? 2.7 : 4.2) && distance < min) {
        nearby = area.id;
        min = distance;
      }
    }
    interaction.hidden = !nearby || dialog.open || avatarDialog.open || Boolean(transition);
    if (nearby) {
      interaction.querySelector('small').textContent = nearby === 'exit' ? 'VOLTAR AO MUNDO' : 'ENTRAR EM';
      document.querySelector('#near-name').textContent = nearby === 'exit' ? 'Saída do prédio' : !inLobby && nearby === 'financas' ? 'Edifício Argos' : names[nearby];
    }
  }
  function changeScene(toLobby) {
    inLobby = toLobby;
    moveSpeed = 0;
    dustTimer = 0;
    document.querySelector('#lobby-hint').hidden = !toLobby;
    document.querySelector('#game').classList.toggle('in-lobby', toLobby);
    scene = toLobby ? lobbyScene : worldScene;
    scene.add(player);
    if (toLobby) {
      outsideYaw = yaw;
      yaw = 0;
      lobbyExit.door.rotation.y = 0;
      player.position.set(0, 0, 5);
      camera.position.set(0, 11, 20);
    } else {
      const area = areas.find(item => item.id === 'financas');
      area.door.rotation.y = 0;
      yaw = outsideYaw;
      player.position.set(area.x, 0, area.entranceZ);
      camera.position.set(player.position.x + Math.sin(yaw) * 24, 13, player.position.z + Math.cos(yaw) * 24);
    }
    cameraOrbit.copy(camera.position);
    scene.updateMatrixWorld(true);
    updateNearby();
  }
  function enter() {
    if (nearby && !dialog.open && !avatarDialog.open && !transition) {
      controls.clear();
      moveSpeed = 0;
      jumpHeight = 0;
      jumpVelocity = 0;
      const area = (inLobby ? [...lobbyDestinations, lobbyExit] : areas).find(item => item.id === nearby);
      transition = { area, elapsed: 0, startX: player.position.x, startZ: player.position.z };
      document.querySelector('#transition-name').textContent = area.id === 'exit' ? 'Saída do prédio' : !inLobby && area.id === 'financas' ? 'Edifício Argos' : names[area.id];
      document.querySelector('#transition-screen small').textContent = area.id === 'exit' ? 'VOLTANDO AO MUNDO' : 'ENTRANDO NO SEU ESPAÇO';
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
      if (key === ' ' && !event.repeat && jumpHeight === 0 && jumpVelocity === 0) jumpVelocity = 7;
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
  window.addEventListener('blur', () => { controls.clear(); moveSpeed = 0; });
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
  const cameraOrbit = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const cameraDirection = new THREE.Vector3();
  const cameraRay = new THREE.Raycaster();
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
      moveSpeed += (10 - moveSpeed) * (1 - Math.exp(-dt * 9));
      const length = Math.hypot(horizontal, vertical);
      horizontal /= length;
      vertical /= length;
      const dx = (Math.cos(yaw) * horizontal - Math.sin(yaw) * vertical) * moveSpeed * dt;
      const dz = (-Math.sin(yaw) * horizontal - Math.cos(yaw) * vertical) * moveSpeed * dt;
      const x = THREE.MathUtils.clamp(player.position.x + dx, -56, 56);
      const z = THREE.MathUtils.clamp(player.position.z + dz, -56, 56);
      const previousX = player.position.x;
      const previousZ = player.position.z;
      if (!isBlocked(x, player.position.z)) player.position.x = x;
      if (!isBlocked(player.position.x, z)) player.position.z = z;
      const angle = Math.atan2(-dx, -dz);
      const difference = Math.atan2(Math.sin(angle - player.rotation.y), Math.cos(angle - player.rotation.y));
      player.rotation.y += difference * Math.min(1, dt * 12);
      moving = player.position.x !== previousX || player.position.z !== previousZ;
      if (moving) walkTime += dt * 11 * moveSpeed / 10;
    } else {
      moveSpeed = 0;
    }
    if (transition) {
      transition.elapsed += dt;
      const { area, elapsed, startX, startZ } = transition;
      area.door.rotation.y = Math.min(elapsed / 0.65, 1) * Math.PI * 0.48;
      const step = THREE.MathUtils.clamp((elapsed - 0.4) / 1.15, 0, 1);
      const eased = step * step * (3 - 2 * step);
      player.position.x = THREE.MathUtils.lerp(startX, area.insideX === undefined ? area.x : area.insideX, eased);
      player.position.z = THREE.MathUtils.lerp(startZ, area.insideZ, eased);
      player.rotation.y = area.rotation === undefined ? (area.direction === -1 ? Math.PI : 0) : area.rotation;
      moving = step > 0 && step < 1;
      if (moving) walkTime += dt * 11;
      if (elapsed >= 1.15) document.querySelector('#transition-screen').classList.add('visible');
      if (elapsed >= 1.85) {
        transition = null;
        if (inLobby && area.id === 'exit') {
          changeScene(false);
        } else if (!inLobby && area.id === 'financas') {
          changeScene(true);
        } else if (inLobby && area.id === 'argos') {
          player.position.set(area.x, 0, area.entranceZ);
          area.door.rotation.y = 0;
          document.querySelector('#transition-screen').classList.remove('visible');
          window.location.assign(argosAdminUrl);
        } else {
          enteredArea = area;
          openArea(area.id);
        }
        document.querySelector('#transition-screen').classList.remove('visible');
      }
    }
    walkBlend += ((moving ? 1 : 0) - walkBlend) * (1 - Math.exp(-dt * 10));
    const swing = Math.sin(walkTime) * 0.65 * walkBlend;
    const breathing = Math.sin(clock.elapsedTime * 2) * 0.025 * (1 - walkBlend);
    leftArm.rotation.x = swing + breathing;
    rightArm.rotation.x = -swing - breathing;
    leftLeg.rotation.x = -swing;
    rightLeg.rotation.x = swing;
    player.rotation.z = Math.sin(walkTime) * 0.035 * walkBlend;
    if (!paused && (jumpHeight > 0 || jumpVelocity > 0)) {
      jumpVelocity -= 18 * dt;
      jumpHeight = Math.max(0, jumpHeight + jumpVelocity * dt);
      if (jumpHeight === 0) {
        jumpVelocity = 0;
        landingImpact = 1;
        if (!inLobby) emitDust(4);
      }
    }
    landingImpact *= Math.exp(-dt * 9);
    player.scale.y = 1 - landingImpact * 0.08;
    player.position.y = jumpHeight + Math.abs(Math.sin(walkTime)) * 0.06 * walkBlend;
    if (!paused && moving && !inLobby && jumpHeight === 0) {
      dustTimer += dt;
      if (dustTimer >= 0.45) {
        emitDust(1);
        dustTimer = 0;
      }
    } else {
      dustTimer = 0;
    }
    dustParticles.forEach(particle => {
      if (particle.life <= 0) return;
      particle.life = Math.max(0, particle.life - dt);
      particle.sprite.position.x += particle.driftX * dt;
      particle.sprite.position.z += particle.driftZ * dt;
      particle.sprite.position.y += dt * 0.35;
      const progress = 1 - particle.life / particle.duration;
      particle.sprite.scale.setScalar(0.55 + progress * 0.7);
      particle.sprite.material.opacity = (1 - progress) * 0.5;
      particle.sprite.visible = particle.life > 0;
    });
    clouds.forEach(cloud => {
      cloud.position.x += dt * 0.3;
      if (cloud.position.x > 70) cloud.position.x = -70;
    });
    treeCrowns.forEach((crown, index) => {
      crown.rotation.z = Math.sin(clock.elapsedTime * 0.8 + index * 0.7) * 0.025;
    });
    rings.forEach((ring, index) => {
      ring.material.opacity = 0.55 + Math.sin(clock.elapsedTime * 2 + index) * 0.2;
    });
    board.position.y = Math.sin(clock.elapsedTime * 1.3) * 0.3;
    boardBase.material.opacity = 0.5 + Math.sin(clock.elapsedTime * 2) * 0.2;
    board.updateMatrixWorld(true);
    const cameraOffset = inLobby ? 15 : 24;
    cameraTarget.set(player.position.x + Math.sin(yaw) * cameraOffset, (inLobby ? 11 : 13) + jumpHeight * 0.3, player.position.z + Math.cos(yaw) * cameraOffset);
    cameraOrbit.lerp(cameraTarget, 1 - Math.exp(-4 * dt));
    lookTarget.set(player.position.x, 4 + jumpHeight, player.position.z);
    cameraDirection.subVectors(cameraOrbit, lookTarget);
    const cameraDistance = cameraDirection.length();
    cameraRay.set(lookTarget, cameraDirection.normalize());
    cameraRay.far = cameraDistance;
    const obstacle = inLobby ? null : cameraRay.intersectObjects(cameraObstacles, false)[0];
    camera.position.copy(obstacle ? lookTarget : cameraOrbit);
    if (obstacle) camera.position.addScaledVector(cameraDirection, Math.max(0.5, obstacle.distance - 0.4));
    camera.lookAt(lookTarget);
    updateNearby();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  camera.position.set(0, 13, 44);
  cameraOrbit.copy(camera.position);
  scene.updateMatrixWorld(true);
  updateNearby();
  animate();
})();
