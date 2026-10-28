import * as THREE from './vendor/three.module.js';

// Original procedural sculptures. Geometry, paper and light are generated locally.
const TAU = Math.PI * 2;
const WHITE = 0xffffff;
const CLAY = 0xef3f42;
const COPPER = 0x275aff;
const GOLD = 0xffdf36;
const INK = 0x173c8a;

function seeded(seed = 137) {
  return () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
}

function merge(parts) {
  let count = 0;
  const converted = parts.map(part => {
    const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry;
    count += geometry.attributes.position.count;
    return {...part, geometry};
  });
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  let offset = 0;
  const color = new THREE.Color();
  for (const part of converted) {
    const geometry = part.geometry;
    const position = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    const uv = geometry.attributes.uv;
    color.set(part.color ?? WHITE);
    positions.set(position.array, offset * 3);
    if (normal) normals.set(normal.array, offset * 3);
    if (uv) uvs.set(uv.array, offset * 2);
    for (let index = 0; index < position.count; index++) {
      colors[(offset + index) * 3] = color.r;
      colors[(offset + index) * 3 + 1] = color.g;
      colors[(offset + index) * 3 + 2] = color.b;
    }
    offset += position.count;
    geometry.dispose();
    if (geometry !== part.original && part.original) part.original.dispose();
  }
  parts.forEach(part => part.geometry.dispose());
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  result.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  result.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  result.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return result;
}

function tube(points, radius, segments = 40, sides = 6) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, sides, false);
}

function softShadow(scene, y, width, depth, opacity = .14) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 3, 64, 64, 63);
  gradient.addColorStop(0, 'rgba(77,48,29,.55)');
  gradient.addColorStop(.35, 'rgba(77,48,29,.24)');
  gradient.addColorStop(1, 'rgba(77,48,29,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({map: texture, transparent: true, opacity, depthWrite: false});
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = y;
  scene.add(shadow);
  return shadow;
}

function particles(group, curves, {count = 48, color = GOLD, radius = .026, speed = .055} = {}) {
  const geometry = new THREE.SphereGeometry(radius, 7, 5);
  const material = new THREE.MeshStandardMaterial({color, emissive: color, emissiveIntensity: .65, metalness: .25, roughness: .25});
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  group.add(mesh);
  const dummy = new THREE.Object3D();
  const point = new THREE.Vector3();
  return time => {
    for (let index = 0; index < count; index++) {
      const progress = (time * speed * (1 + index % 5 * .13) + index * .61803) % 1;
      curves[index % curves.length].getPoint(progress, point);
      dummy.position.copy(point);
      const scale = .65 + .35 * Math.sin(progress * Math.PI);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
}

function curvesGeometry(curves, segments = 48) {
  const positions = new Float32Array(curves.length * segments * 6);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  let offset = 0;
  for (const curve of curves) {
    for (let step = 0; step < segments; step++) {
      curve.getPoint(step / segments, a);
      curve.getPoint((step + 1) / segments, b);
      positions[offset++] = a.x; positions[offset++] = a.y; positions[offset++] = a.z;
      positions[offset++] = b.x; positions[offset++] = b.y; positions[offset++] = b.z;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geometry;
}

function brain(group) {
  const random = seeded(71);
  const form = new THREE.Group();
  group.add(form);
  const skin = new THREE.MeshPhysicalMaterial({color: 0x1640d6, roughness: .30, metalness: .30, clearcoat: .5});
  const ridgeMaterial = new THREE.MeshPhysicalMaterial({vertexColors: true, roughness: .34, metalness: .43, clearcoat: .24});
  const ridges = [];
  const shells = [];
  const point = (side, u, v, lift = 0) => {
    const sine = Math.sin(u);
    const fold = .022 * Math.sin(u * 19 + 2 * Math.sin(v * 7)) * Math.sin(v * 17 + u * 3);
    const x = side * (.075 + (1.30 + lift + fold) * sine * Math.cos(v));
    const y = Math.max(-.96, (1.23 + lift + fold) * Math.cos(u));
    const z = (1.58 + lift + fold) * sine * Math.sin(v) * (1 + .035 * Math.cos(v));
    return new THREE.Vector3(x, y, z);
  };
  // A custom half-ellipsoid leaves a real sagittal fissure between hemispheres.
  for (const side of [-1, 1]) {
    const positions = [], indices = [];
    const rows = 64, columns = 64;
    for (let row = 0; row <= rows; row++) {
      const u = row / rows * Math.PI;
      for (let column = 0; column <= columns; column++) {
        const p = point(side, u, -Math.PI / 2 + column / columns * Math.PI);
        positions.push(p.x, p.y, p.z);
      }
    }
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const a = row * (columns + 1) + column;
      if (side > 0) indices.push(a, a + 1, a + columns + 1, a + 1, a + columns + 2, a + columns + 1);
      else indices.push(a, a + columns + 1, a + 1, a + 1, a + columns + 1, a + columns + 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    shells.push({geometry});

    // Broken, interlocking folds vary in direction, length and radius like cortical gyri.
    for (let band = 0; band < 14; band++) {
      const center = .19 + band / 13 * 2.63;
      const phase = band * 1.71 + side * .83;
      const sections = band % 3 === 0 ? 2 : 1;
      for (let section = 0; section < sections; section++) {
        const start = -1.48 + section * 1.56 + random() * .07;
        const end = sections === 2 ? start + 1.34 : 1.47 - random() * .11;
        const points = [];
        for (let step = 0; step <= 45; step++) {
          const v = start + (end - start) * step / 45;
          const u = center + .075 * Math.sin(v * 5.2 + phase) + .049 * Math.sin(v * 10.1 - phase) + .025 * Math.sin(v * 18 + phase);
          points.push(point(side, THREE.MathUtils.clamp(u, .08, 3.03), v, .035));
        }
        ridges.push({geometry: tube(points, .065 + random() * .022, 66, 7), color: band % 4 === 0 ? 0xffdf36 : band % 3 === 0 ? 0x30c578 : COPPER});
      }
    }
    for (let seam = 0; seam < 9; seam++) {
      const points = [];
      const u0 = .4 + random() * 2.1;
      const v0 = -1.30 + random() * 2.4;
      for (let step = 0; step <= 12; step++) {
        const q = step / 12;
        points.push(point(side, u0 + q * .34, v0 + Math.sin(q * Math.PI) * .10, .04));
      }
      ridges.push({geometry: tube(points, .055, 20, 6), color: 0x448aff});
    }
  }
  form.add(new THREE.Mesh(merge(shells), skin));
  form.add(new THREE.Mesh(merge(ridges), ridgeMaterial));

  // The cerebellum and brainstem complete the silhouette beneath the cortex.
  const cerebellum = new THREE.Mesh(new THREE.SphereGeometry(.63, 32, 24), skin);
  cerebellum.scale.set(1.21, .63, .92);
  cerebellum.position.set(0, -.97, -1.02);
  form.add(cerebellum);
  const fineFolds = [];
  for (let band = 0; band < 10; band++) {
    const y = -.77 - band * .044;
    const radius = .68 * Math.sqrt(Math.max(.1, 1 - ((band - 4.5) / 7) ** 2));
    const points = [];
    for (let step = 0; step <= 36; step++) {
      const angle = step / 36 * TAU;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, y + .012 * Math.sin(angle * 8), -1.02 + Math.sin(angle) * radius * .79));
    }
    fineFolds.push({geometry: tube(points, .022, 48, 5), color: COPPER});
  }
  form.add(new THREE.Mesh(merge(fineFolds), ridgeMaterial));
  form.add(new THREE.Mesh(tube([new THREE.Vector3(0, -.81, -.5), new THREE.Vector3(.03, -1.23, -.62), new THREE.Vector3(.13, -1.61, -.35), new THREE.Vector3(.28, -1.74, -.27)], .16, 24, 12), skin));

  const nodes = [];
  for (let index = 0; index < 122; index++) {
    nodes.push(point(index % 2 ? 1 : -1, .26 + random() * 2.42, -1.4 + random() * 2.8, .13));
  }
  const connections = [];
  for (let index = 0; index < nodes.length; index++) {
    const origin = nodes[index];
    let nearest = -1, distance = Infinity;
    for (let other = 0; other < nodes.length; other++) {
      if (other === index || other % 2 !== index % 2) continue;
      const d = origin.distanceToSquared(nodes[other]);
      if (d < distance && d > .05) { distance = d; nearest = other; }
    }
    if (nearest !== -1) {
      const target = nodes[nearest];
      const middle = origin.clone().add(target).multiplyScalar(.5).multiplyScalar(1.035);
      connections.push(new THREE.QuadraticBezierCurve3(origin, middle, target));
    }
    if (index % 9 === 0) {
      const target = nodes[(index + 39) % nodes.length];
      const middle = origin.clone().add(target).multiplyScalar(.6);
      middle.y += .24;
      connections.push(new THREE.QuadraticBezierCurve3(origin, middle, target));
    }
  }
  form.add(new THREE.LineSegments(curvesGeometry(connections, 18), new THREE.LineBasicMaterial({color: 0xb4e4ff, transparent: true, opacity: .42})));
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(.025, 6, 4), new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .27, metalness: .45}), nodes.length);
  const dummy = new THREE.Object3D();
  nodes.forEach((node, index) => { dummy.position.copy(node); dummy.updateMatrix(); dots.setMatrixAt(index, dummy.matrix); });
  form.add(dots);
  const animateSignals = particles(form, connections, {count: 45, radius: .034, color: 0xffdf36, speed: .15});
  form.rotation.set(.11, -.48, -.12);
  return time => {
    form.rotation.y = -.48 + Math.sin(time * .11) * .18;
    form.rotation.x = .11 + Math.sin(time * .13) * .045;
    form.rotation.z = -.12 + Math.cos(time * .09) * .025;
    const breathing = 1 + Math.sin(time * .44) * .008;
    form.scale.setScalar(breathing);
    form.position.y = .10 + Math.sin(time * .32) * .055;
    animateSignals(time);
  };
}

function aircraft(group) {
  const craft = new THREE.Group();
  group.add(craft);
  const nose = [2.30, .12, 0], tail = [-1.80, -.10, 0];
  const ridge = [-1.06, .38, 0];
  const foldLeft = [-1.45, .14, -.40], foldRight = [-1.45, .14, .40];
  const wingLeft = [-1.92, .06, -1.64], wingRight = [-1.92, .06, 1.64];
  const wingMidLeft = [-.65, .015, -1.05], wingMidRight = [-.65, .015, 1.05];
  const keel = [-1.60, -.54, 0];
  const triangles = [
    [nose, wingMidLeft, foldLeft, 0xffffff], [foldLeft, wingMidLeft, wingLeft, 0xe6eeff],
    [nose, foldRight, wingMidRight, 0xffffff], [foldRight, wingRight, wingMidRight, 0xffffff],
    [nose, ridge, foldLeft, 0xffdf36], [nose, foldRight, ridge, 0xffffff],
    [ridge, tail, foldLeft, 0xef3f42], [ridge, foldRight, tail, 0x275aff],
    [nose, keel, tail, 0xef3f42],
    [foldLeft, tail, wingLeft, 0x275aff], [foldRight, wingRight, tail, 0xffdf36],
  ];
  const positions = [], colors = [];
  const color = new THREE.Color();
  triangles.forEach(([a, b, c, hex]) => {
    color.set(hex);
    for (const p of [a, b, c]) { positions.push(...p); colors.push(color.r, color.g, color.b); }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const rest = Float32Array.from(positions);
  const paper = new THREE.MeshPhysicalMaterial({vertexColors: true, side: THREE.DoubleSide, roughness: .65, metalness: .035, clearcoat: .08});
  craft.add(new THREE.Mesh(geometry, paper));
  const edges = new THREE.EdgesGeometry(geometry, 10);
  craft.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({color: 0x275aff, transparent: true, opacity: .58})));

  // Hairline inset creases emphasize the multiple folded paper planes.
  const creases = [];
  for (const side of [-1, 1]) {
    for (let index = 0; index < 3; index++) {
      const z = side * (.46 + index * .17);
      creases.push(-1.61 + index * .12, .073, z, 1.58 - index * .48, .125, side * (.14 + index * .048));
    }
  }
  const creaseGeometry = new THREE.BufferGeometry();
  creaseGeometry.setAttribute('position', new THREE.Float32BufferAttribute(creases, 3));
  craft.add(new THREE.LineSegments(creaseGeometry, new THREE.LineBasicMaterial({color: 0x275aff, transparent: true, opacity: .35})));
  craft.rotation.set(.10, -.21, .18);
  craft.scale.setScalar(1.03);

  const flows = [];
  const random = seeded(19);
  for (let index = 0; index < 66; index++) {
    const level = (index - 32.5) / 32.5;
    const y = level * 1.64;
    const z = -.80 + random() * 2.1;
    const points = [];
    for (let step = 0; step <= 14; step++) {
      const u = step / 14;
      const x = -4.20 + u * 8.35;
      const deflect = Math.exp(-((x + .35) ** 2) / 3.1);
      const curl = Math.sin(u * 5 + index * .13) * .13;
      points.push(new THREE.Vector3(x, y + Math.sign(level || 1) * deflect * (.55 - Math.abs(level) * .16) + curl, z + Math.sin(u * 4 + index * .2) * .19));
    }
    flows.push(new THREE.CatmullRomCurve3(points));
  }
  const flowGroup = new THREE.Group();
  flowGroup.rotation.z = .18;
  flowGroup.position.z = -.35;
  group.add(flowGroup);
  flowGroup.add(new THREE.LineSegments(curvesGeometry(flows, 60), new THREE.LineBasicMaterial({color: 0x6798ff, transparent: true, opacity: .25, depthWrite: false})));
  const animateSignals = particles(flowGroup, flows, {count: 61, radius: .022, color: 0xef3f42, speed: .065});

  // A folded strip trails in the wake, resolving into the same signal field.
  const fragments = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(.065), new THREE.MeshStandardMaterial({color: COPPER, metalness: .48, roughness: .40}), 16);
  fragments.frustumCulled = false;
  group.add(fragments);
  const dummy = new THREE.Object3D();
  return time => {
    craft.position.set(Math.sin(time * .17) * .16, .10 + Math.sin(time * .39) * .10, Math.sin(time * .23) * .13);
    craft.rotation.x = .10 + Math.sin(time * .29) * .075;
    craft.rotation.y = -.21 + Math.sin(time * .17) * .14;
    craft.rotation.z = .18 + Math.sin(time * .24) * .045;
    const attribute = geometry.attributes.position;
    for (let index = 0; index < attribute.count; index++) {
      const z = rest[index * 3 + 2];
      attribute.array[index * 3 + 1] = rest[index * 3 + 1] + Math.sin(time * .64 + z * 1.2) * Math.abs(z) ** 2 * .018;
    }
    attribute.needsUpdate = true;
    geometry.computeVertexNormals();
    for (let index = 0; index < 16; index++) {
      const progress = (index / 16 + time * .035) % 1;
      dummy.position.set(-1.6 - progress * 2.25, -.2 + Math.sin(progress * 7 + index) * .37, Math.cos(progress * 6 + index) * .6);
      dummy.rotation.set(time * .20 + index, index * .51, time * .12);
      dummy.scale.setScalar(.4 + Math.sin(progress * Math.PI) * .65);
      dummy.updateMatrix(); fragments.setMatrixAt(index, dummy.matrix);
    }
    fragments.instanceMatrix.needsUpdate = true;
    animateSignals(time);
  };
}

function pageTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 768; canvas.height = 1024;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, 768, 1024);
  // Abstract typesetting stays decorative when the artwork is mirrored for RTL.
  context.fillStyle = '#275aff'; context.fillRect(91, 100, 150, 3);
  context.fillStyle = '#111111'; context.fillRect(91, 159, 480, 6); context.fillRect(91, 203, 375, 6);
  context.fillStyle = '#ef3f42'; context.fillRect(90, 246, 54, 2);
  const random = seeded(48);
  for (let row = 0; row < 31; row++) {
    if (row === 10 || row === 23) continue;
    const y = 292 + row * 18.5;
    let x = 91;
    const end = row === 9 || row === 22 || row === 30 ? 390 + random() * 110 : 676;
    while (x < end - 18) {
      const length = Math.min(end - x, 14 + random() * 42);
      context.fillStyle = `rgba(25,40,65,${.32 + random() * .28})`;
      context.fillRect(x, y, length, 1.8);
      x += length + 6 + random() * 5;
    }
  }
  context.fillStyle = '#275aff'; context.fillRect(365, 960, 24, 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function pageGeometry(side, layer = 0, columns = 28, rows = 14) {
  const positions = [], uvs = [], indices = [];
  for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
    const u = column / columns, v = row / rows;
    const x = side * (.025 + u * 1.94);
    const y = .10 + .25 * Math.sin(u * Math.PI * .90) - layer * .009;
    const z = (v - .5) * 2.68 + Math.sin(u * Math.PI) * .025;
    positions.push(x, y, z);
    uvs.push(side > 0 ? u : 1 - u, 1 - v);
  }
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const a = row * (columns + 1) + column;
    if (side > 0) indices.push(a, a + columns + 1, a + 1, a + 1, a + columns + 1, a + columns + 2);
    else indices.push(a, a + 1, a + columns + 1, a + 1, a + columns + 2, a + columns + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function reading(group) {
  const book = new THREE.Group();
  group.add(book);
  const coverMaterial = new THREE.MeshPhysicalMaterial({color: 0x00a65a, roughness: .55, metalness: .16, clearcoat: .10});
  const edgeMaterial = new THREE.MeshStandardMaterial({color: 0xffdf36, metalness: .55, roughness: .4});
  for (const side of [-1, 1]) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.14, .09, 2.94), coverMaterial);
    board.position.set(side * 1.04, -.18, 0); board.rotation.z = side * -.025;
    book.add(board);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(.018, .016, 2.86), edgeMaterial);
    trim.position.set(side * 2.10, -.12, 0); book.add(trim);
  }
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, 2.94, 18), coverMaterial);
  spine.rotation.x = Math.PI / 2; spine.position.y = -.13; book.add(spine);
  const leaves = [];
  for (let layer = 1; layer <= 25; layer++) for (const side of [-1, 1]) {
    leaves.push({geometry: pageGeometry(side, layer, 20, 6), color: layer % 5 === 0 ? 0xe4f0ff : 0xffffff});
  }
  book.add(new THREE.Mesh(merge(leaves), new THREE.MeshStandardMaterial({vertexColors: true, side: THREE.DoubleSide, roughness: .85, metalness: .01})));
  const texture = pageTexture();
  const paper = new THREE.MeshPhysicalMaterial({map: texture, side: THREE.DoubleSide, roughness: .80, metalness: .01, clearcoat: .03});
  for (const side of [-1, 1]) book.add(new THREE.Mesh(pageGeometry(side), paper));

  // Fine stacked page edges remain visible at the fore-edge and head of the book.
  const edgeLines = [];
  for (let layer = 1; layer <= 25; layer++) for (const side of [-1, 1]) {
    for (let step = 0; step < 32; step++) {
      const u0 = step / 32, u1 = (step + 1) / 32;
      for (const v of [-1.344, 1.344]) {
        edgeLines.push(side * (.025 + u0 * 1.94), .10 + .25 * Math.sin(u0 * Math.PI * .90) - layer * .009, v,
          side * (.025 + u1 * 1.94), .10 + .25 * Math.sin(u1 * Math.PI * .90) - layer * .009, v);
      }
    }
  }
  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgeLines, 3));
  book.add(new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({color: 0xa2b8df, transparent: true, opacity: .47})));

  const turning = [];
  for (let index = 0; index < 2; index++) {
    const geometry = pageGeometry(1, 0, 28, 14);
    const material = paper.clone(); material.transparent = true;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 2 + index;
    book.add(mesh);
    turning.push({geometry, material, index});
  }
  const loose = [];
  for (let index = 0; index < 4; index++) {
    const geometry = pageGeometry(1, 0, 12, 6);
    const material = paper.clone();
    material.transparent = true; material.opacity = .80;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(.23 + index * .025, .5, .25 + index * .018);
    mesh.position.set(-1.30 + index * .72, .94 + index * .28, -.72 - index * .16);
    mesh.rotation.set(-.18 + index * .11, -.34 + index * .31, -.45 + index * .23);
    book.add(mesh);
    loose.push(mesh);
  }
  const ribbon = new THREE.Mesh(tube([new THREE.Vector3(.15, .15, -.95), new THREE.Vector3(.16, .18, .45), new THREE.Vector3(.22, -.02, 1.30), new THREE.Vector3(.27, -.45, 1.66)], .035, 24, 4), new THREE.MeshStandardMaterial({color: 0xef3f42, roughness: .74}));
  book.add(ribbon);
  book.rotation.set(.02, -.28, -.095);
  return time => {
    book.rotation.y = -.28 + Math.sin(time * .12) * .10;
    book.rotation.z = -.095 + Math.sin(time * .16) * .022;
    book.position.y = -.25 + Math.sin(time * .28) * .035;
    for (const page of turning) {
      const progress = (time * .045 + .24 + page.index * .48) % 1;
      const smooth = progress * progress * (3 - 2 * progress);
      const angle = smooth * Math.PI;
      page.material.opacity = Math.min(1, progress * 12, (1 - progress) * 12);
      const attribute = page.geometry.attributes.position;
      for (let row = 0; row <= 14; row++) for (let column = 0; column <= 28; column++) {
        const u = column / 28, v = row / 14;
        const width = .025 + u * 1.94;
        const curl = Math.sin(u * Math.PI) * (.15 + .08 * Math.sin(v * Math.PI + angle));
        const offset = (row * 29 + column) * 3;
        attribute.array[offset] = width * Math.cos(angle) + Math.sin(angle) * curl;
        attribute.array[offset + 1] = .125 + width * Math.sin(angle) + Math.cos(angle) * curl;
        attribute.array[offset + 2] = (v - .5) * 2.66 + Math.sin(u * Math.PI) * Math.sin(angle + v * 2) * .14;
      }
      attribute.needsUpdate = true;
      page.geometry.computeVertexNormals();
    }
    for (let index = 0; index < loose.length; index++) {
      const mesh = loose[index];
      mesh.position.y = .94 + index * .28 + Math.sin(time * .34 + index) * .13;
      mesh.rotation.z = -.45 + index * .23 + Math.sin(time * .22 + index) * .10;
      mesh.rotation.y = -.34 + index * .31 + Math.sin(time * .15 + index) * .15;
    }
  };
}

/** A single still or animated frame; scheduling and motion preferences belong to the caller. */
export function createArtwork(canvas, kind = 'studio') {
  const scene = new THREE.Scene();
  scene.background = null;
  let renderer, disposed = false, contextLost = false;
  let width = 0, height = 0, pixelRatio = 0;
  const lost = () => { contextLost = true; };
  canvas.addEventListener('webglcontextlost', lost);
  function dispose() {
    if (disposed) return;
    disposed = true;
    canvas.removeEventListener('webglcontextlost', lost);
    const geometries = new Set(), materials = new Set(), textures = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    textures.forEach(texture => texture.dispose());
    scene.clear();
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
    }
  }
  try {
    // The controller copies this frame immediately onto its visible 2D canvas.
    // Alpha lets the existing warm paper background remain visible behind it.
    renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: false});
    renderer.setClearColor(WHITE, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    const camera = new THREE.OrthographicCamera(-5, 5, 3, -3, .1, 60);
    if (kind === 'reading') camera.position.set(0, 5.8, 7.8);
    else if (kind === 'signals') camera.position.set(0, 4.2, 8.4);
    else camera.position.set(0, 1.3, 8.8);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xa1b6dd, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(-3, 6, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 2.0);
    fill.position.set(5, 2, -3); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xd8e9ff, 1.25);
    rim.position.set(-2, 1, -5); scene.add(rim);
    const sculpture = new THREE.Group();
    scene.add(sculpture);
    const shadow = softShadow(scene, kind === 'studio' ? -1.94 : kind === 'reading' ? -.68 : -1.55, kind === 'signals' ? 7 : 5.5, 3.6, kind === 'studio' ? .22 : .18);
    const animate = kind === 'signals' ? aircraft(sculpture) : kind === 'reading' ? reading(sculpture) : brain(sculpture);
    return {
      get lost() { return disposed || contextLost || renderer.getContext().isContextLost(); },
      resize(nextWidth, nextHeight, dpr = 1) {
        if (disposed || !Number.isFinite(nextWidth) || !Number.isFinite(nextHeight) || nextWidth <= 0 || nextHeight <= 0) return;
        const ratio = Number.isFinite(dpr) ? Math.min(Math.max(dpr, 1), 1.5) : 1;
        if (width === nextWidth && height === nextHeight && pixelRatio === ratio) return;
        width = nextWidth; height = nextHeight; pixelRatio = ratio;
        renderer.setPixelRatio(ratio);
        renderer.setSize(width, height, false);
        const mobile = width < 720;
        const viewHeight = mobile ? (kind === 'reading' ? 4.25 : 4.65) : 5.65;
        const viewWidth = viewHeight * width / height;
        camera.left = -viewWidth / 2; camera.right = viewWidth / 2;
        camera.top = viewHeight / 2; camera.bottom = -viewHeight / 2;
        camera.updateProjectionMatrix();
        sculpture.position.x = mobile ? 0 : viewWidth * .225;
        shadow.position.x = sculpture.position.x;
        sculpture.scale.setScalar(mobile && kind === 'signals' ? .91 : 1);
      },
      render(timeSeconds = 0) {
        if (disposed || contextLost || !width || !height) return;
        animate(Number.isFinite(timeSeconds) ? timeSeconds : 0);
        renderer.render(scene, camera);
      },
      dispose,
    };
  } catch (error) {
    try { dispose(); } catch { /* Preserve the construction failure for the caller's fallback. */ }
    throw error;
  }
}
