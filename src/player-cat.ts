import * as THREE from "three";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

type Uniform = { value: number };
export type PlayerPose = {
  arms: THREE.Group[];
  ears: THREE.Group[];
  face: { blink: Uniform; gaze: Uniform; earL: Uniform; earR: Uniform };
  blinkAt: number;
  blinkStart: number;
  phase: number;
};
export type PlayerCatRig = {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  legs: THREE.Group[];
  arms: THREE.Group[];
  tail: THREE.Group;
  tailJoints: THREE.Object3D[];
  eyes: THREE.Group[];
  gun: THREE.Group;
  knife: THREE.Group;
  helmet: THREE.Group;
  vest: THREE.Group;
  pack: THREE.Group;
  player: PlayerPose;
};
const smoothMin = (a: number, b: number, k: number) => {
  const h = Math.max(0, Math.min(1, 0.5 + (b - a) / (2 * k)));
  return b * (1 - h) + a * h - k * h * (1 - h);
};
/** A single continuous head/ear surface, with gradient normals rather than polygon face normals. */
function sculptHead(mat: THREE.Material) {
  const resolution = 64,
    bound = 36;
  const surface = new MarchingCubes(resolution, mat, false, false, 40000);
  surface.isolation = 0;
  for (let z = 0; z < resolution; z++)
    for (let y = 0; y < resolution; y++)
      for (let x = 0; x < resolution; x++) {
        const px = ((x / resolution) * 2 - 1) * bound;
        const py = ((y / resolution) * 2 - 1) * bound;
        const pz = ((z / resolution) * 2 - 1) * bound;
        const cheeks = 1.02 - 0.1 * Math.max(0, Math.min(1, (py + 14) / 30));
        let distance =
          (Math.hypot(px / (26.5 * cheeks), py / 17.5, pz / 17.5) - 1) * 17.5;
        for (const side of [-1, 1]) {
          const ey = py - 12;
          const ex = px - side * (16.8 + ey * 0.13);
          const radial = Math.hypot(ex, (pz + 1.0) * 1.25);
          const slope = (9.4 - 3.0) / 12.0,
            cosine = Math.sqrt(1 - slope * slope);
          const k = -slope * radial + cosine * ey;
          const ear =
            k < 0
              ? Math.hypot(radial, ey) - 9.4
              : k > cosine * 12
                ? Math.hypot(radial, ey - 12) - 3.0
                : cosine * radial + slope * ey - 9.4;
          distance = smoothMin(distance, ear, 3.5);
        }
        surface.field[z * resolution * resolution + y * resolution + x] =
          -distance;
      }
  surface.update();
  const count = surface.geometry.drawRange.count;
  const geometry = new THREE.BufferGeometry();
  for (const name of ["position", "normal"] as const) {
    const values = new Float32Array(
      surface.geometry.getAttribute(name).array.slice(0, count * 3),
    );
    if (name === "position")
      for (let i = 0; i < values.length; i++) values[i] *= bound;
    geometry.setAttribute(name, new THREE.BufferAttribute(values, 3));
  }
  geometry.computeBoundingSphere();
  geometry.boundingSphere!.radius += 4; // animated ears can extend beyond the resting surface
  surface.geometry.dispose();
  return geometry;
}
const shaderMath = /* glsl */ `
float oval(vec2 p, vec2 radius) {
  float d = length(p / radius);
  float aa = max(fwidth(d), 0.014);
  return 1.0 - smoothstep(1.0 - aa, 1.0 + aa, d);
}
float stroke(vec2 p, vec2 a, vec2 b, float width) {
  vec2 q = p - a, v = b - a;
  float d = length(q - v * clamp(dot(q,v)/dot(v,v),0.0,1.0));
  return 1.0 - smoothstep(width, width + max(fwidth(d),0.07), d);
}
`;
/** Calico markings and facial features are pigment on the surface, never attached eye/nose meshes. */
function skin(
  kind: "head" | "body" | "armL" | "armR" | "foot",
  pose: PlayerPose,
) {
  const mat = new THREE.MeshStandardMaterial({
    color: "#fff1d9",
    roughness: 0.91,
    metalness: 0,
  });
  mat.name = `player-calico-${kind}`;
  mat.customProgramCacheKey = () => `calico-b-${kind}-v3`;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      catBlink: pose.face.blink,
      catGaze: pose.face.gaze,
      catEarL: pose.face.earL,
      catEarR: pose.face.earR,
    });
    const common = `varying vec3 catLocal; uniform float catBlink,catGaze,catEarL,catEarR;`;
    shader.vertexShader = common + "\n" + shader.vertexShader;
    shader.fragmentShader = common + shaderMath + shader.fragmentShader;
    const earDeform =
      kind === "head"
        ? /* glsl */ `
      float earWeight = smoothstep(10.0,26.0,position.y) * smoothstep(8.0,16.0,abs(position.x));
      float earAngle = mix(catEarL,catEarR,step(0.0,position.x)) * earWeight;
      float earCos = cos(earAngle), earSin = sin(earAngle);
      vec2 pivot = vec2(sign(position.x)*16.8,12.0);
      transformed.xy = pivot + mat2(earCos,earSin,-earSin,earCos)*(transformed.xy-pivot);
      transformed.z += sin(earAngle)*earWeight*3.0;
    `
        : "";
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>\ncatLocal=position;\n${earDeform}`,
    );
    const headPaint = /* glsl */ `
      // Part at the crown, then sweep OUTWARD towards the cheeks: the white blaze widens below.
      float down = max(0.,19.-p.y);
      float blazeHalf = .6 + .64*down + .008*down*down;
      float bangs = smoothstep(blazeHalf-.55,blazeHalf+.55,abs(p.x));
      float backPatch = smoothstep(-8.,-5.,p.y+sin(p.x*.14)*1.5);
      float furMask = mix(backPatch,bangs,smoothstep(-8.,4.,p.z));
      pigment=mix(pigment,p.x<0.?vec3(.70,.27,.056):vec3(.10,.045,.027),furMask);
      float innerEar = oval(vec2(abs(p.x)-17.2,p.y-21.3),vec2(5.5,6.4))*smoothstep(0.5,2.2,p.z);
      pigment=mix(pigment,vec3(.55,.16,.14),innerEar);
      float front=smoothstep(10.0,14.0,p.z);
      vec2 eyeLeft=p.xy-vec2(-8.4+catGaze,.8);
      vec2 eyeRight=p.xy-vec2(8.4+catGaze,.8);
      float eye= max(oval(eyeLeft,vec2(4.1,max(.25,5.3*catBlink))),oval(eyeRight,vec2(4.1,max(.25,5.3*catBlink))));
      pigment=mix(pigment,vec3(.020,.013,.010),eye*front);
      float light = max(oval(eyeLeft-vec2(-.9,2.0*catBlink),vec2(.86,1.0*catBlink)),oval(eyeRight-vec2(-.9,2.0*catBlink),vec2(.86,1.0*catBlink)));
      pigment=mix(pigment,vec3(1.0,.97,.89),light*front*smoothstep(.35,.7,catBlink));
      float nose=oval(p.xy-vec2(0.0,-4.8),vec2(2.05,1.25));
      pigment=mix(pigment,vec3(.65,.20,.16),nose*front);
      float mouth=stroke(p.xy,vec2(0.,-5.7),vec2(0.,-7.0),.30);
      mouth=max(mouth,stroke(p.xy,vec2(0.,-7.),vec2(-2.3,-8.1),.30));
      mouth=max(mouth,stroke(p.xy,vec2(0.,-7.),vec2(2.3,-8.1),.30));
      float whiskers=0.;
      for(int n=0;n<2;n++) {
        float yy=-3.2-float(n)*3.0;
        whiskers=max(whiskers,stroke(vec2(abs(p.x),p.y),vec2(13.0,yy),vec2(20.0,yy+.8-float(n)),.45));
      }
      pigment=mix(pigment,vec3(.12,.08,.06),max(mouth*front,whiskers*smoothstep(3.,8.,p.z))*.95);
    `;
    const bodyPaint = /* glsl */ `
      float orange=1.-smoothstep(.85,1.0,length((p-vec3(13.,8.,-7.))/vec3(11.,13.,11.)));
      float brown=1.-smoothstep(.85,1.0,length((p-vec3(-14.,-6.,-3.))/vec3(10.,10.,12.)));
      pigment=mix(pigment,vec3(.70,.27,.056),orange);
      pigment=mix(pigment,vec3(.10,.045,.027),brown);
      float belt=1.-smoothstep(1.0,1.4,abs(p.y+7.5));
      pigment=mix(pigment,vec3(.26,.17,.115),belt);
    `;
    // All four paws remain white. Toe creases are pigment, not separate fingers/claws.
    const limbPaint =
      kind === "foot"
        ? /* glsl */ `
      pigment=vec3(.98,.97,.93);
      float toes=0.;
      for(int n=0;n<3;n++) {
        float xx=float(n-1)*2.;
        float around=stroke(p.xz,vec2(xx,2.3),vec2(xx*1.06,5.5),.18);
        float frontCrease=stroke(p.xy,vec2(xx,-.9),vec2(xx,1.3),.18)*smoothstep(2.6,3.6,p.z);
        toes=max(toes,max(around,frontCrease));
      }
      // No upper-surface mask: the same three creases wrap around the toes onto the sole.
      pigment=mix(pigment,vec3(.065,.045,.035),toes);
    `
        : /* glsl */ `
      pigment=vec3(.98,.97,.93);
      float toes=stroke(p.xy,vec2(-1.4,-2.0),vec2(-1.7,-4.1),.18);
      toes=max(toes,stroke(p.xy,vec2(1.4,-2.0),vec2(1.7,-4.1),.18));
      pigment=mix(pigment,vec3(.065,.045,.035),toes*smoothstep(3.0,4.0,p.z));
    `;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>\nvec3 p=catLocal; vec3 pigment=vec3(.97,.88,.73);\n${kind === "head" ? headPaint : kind === "body" ? bodyPaint : limbPaint}\ndiffuseColor.rgb=pigment;`,
    );
  };
  return mat;
}
function ellipsoid(
  parent: THREE.Object3D,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
) {
  const geometry = new THREE.SphereGeometry(1, 40, 28);
  geometry.scale(sx, sy, sz);
  const m = new THREE.Mesh(geometry, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function limb(
  parent: THREE.Group,
  mat: THREE.Material,
  x: number,
  y: number,
  length: number,
  foot = false,
) {
  const group = new THREE.Group();
  group.position.set(x, y, 0);
  parent.add(group);
  const geometry = new THREE.SphereGeometry(1, 36, 24),
    positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const py = positions.getY(i),
      forward = foot ? Math.pow(Math.max(0, -py), 1.5) * 1.4 : 0;
    positions.setXYZ(
      i,
      positions.getX(i) * 4.8,
      py * length,
      positions.getZ(i) * (foot ? 4.1 : 4.8) + forward,
    );
  }
  geometry.computeVertexNormals();
  const shape = new THREE.Mesh(geometry, mat);
  shape.position.set(0, -length + 2, foot ? 5 : 4);
  group.add(shape);
  return group;
}
function continuousTail(parent: THREE.Group) {
  const tail = new THREE.Group();
  tail.position.set(0, 15, -12);
  parent.add(tail);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-4, 1, -8),
    new THREE.Vector3(-11, 9, -14),
    new THREE.Vector3(-10, 20, -16),
    new THREE.Vector3(-4, 25, -15),
  ]);
  const rings = 60,
    boneCount = 6,
    geometry = new THREE.TubeGeometry(curve, rings, 4.1, 12, false);
  const positions = geometry.getAttribute("position"),
    colors = [],
    indices = [],
    weights = [];
  const cream = new THREE.Color("#f5dfba"),
    orange = new THREE.Color("#e89642"),
    brown = new THREE.Color("#563a29");
  for (let i = 0; i < positions.count; i++) {
    const ring = Math.floor(i / 13),
      t = ring / rings,
      c = curve.getPointAt(t),
      v = new THREE.Vector3().fromBufferAttribute(positions, i);
    v.sub(c)
      .multiplyScalar(1 - t * 0.52)
      .add(c);
    positions.setXYZ(i, v.x, v.y, v.z);
    const b = t * (boneCount - 1),
      low = Math.min(boneCount - 2, Math.floor(b)),
      f = b - low;
    indices.push(low, low + 1, 0, 0);
    weights.push(1 - f, f, 0, 0);
    const color = t > 0.77 ? cream : t > 0.44 ? brown : orange;
    colors.push(color.r, color.g, color.b);
  }
  geometry.computeVertexNormals();
  geometry.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute(indices, 4),
  );
  geometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(weights, 4),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
  });
  const mesh = new THREE.SkinnedMesh(geometry, material),
    bones: THREE.Bone[] = [];
  for (let i = 0; i < boneCount; i++) {
    const bone = new THREE.Bone(),
      position = curve.getPointAt(i / (boneCount - 1));
    if (i) {
      bone.position
        .copy(position)
        .sub(curve.getPointAt((i - 1) / (boneCount - 1)));
      bones[i - 1].add(bone);
    } else {
      bone.position.copy(position);
      mesh.add(bone);
    }
    bones.push(bone);
  }
  mesh.bind(new THREE.Skeleton(bones));
  mesh.frustumCulled = false;
  tail.add(mesh);
  // Rounded end cap is skinned with the final joint, never a visible string of separate spheres.
  ellipsoid(
    bones[boneCount - 1],
    new THREE.MeshStandardMaterial({ color: "#f5dfba", roughness: 0.95 }),
    0,
    0,
    0,
    2.1,
    2.1,
    2.1,
  );
  return { tail, bones };
}
export function createPlayerCat(): PlayerCatRig {
  const root = new THREE.Group(),
    body = new THREE.Group(),
    head = new THREE.Group();
  root.name = "player-calico-b";
  root.scale.setScalar(0.75);
  root.add(body);
  const eyes = [new THREE.Group(), new THREE.Group()],
    ears = [new THREE.Group(), new THREE.Group()];
  const pose: PlayerPose = {
    arms: [],
    ears,
    face: {
      blink: { value: 1 },
      gaze: { value: 0 },
      earL: { value: 0 },
      earR: { value: 0 },
    },
    blinkAt: 0,
    blinkStart: -10,
    phase: Math.random() * 5,
  };
  const headMaterial = skin("head", pose);
  const headMesh = new THREE.Mesh(sculptHead(headMaterial), headMaterial);
  headMesh.name = "continuous-head-and-ears";
  head.add(headMesh);
  head.add(...eyes, ...ears);
  head.position.set(0, 40, 2);
  body.add(head);
  ellipsoid(body, skin("body", pose), 0, 20, 0, 20, 15, 14.5).name =
    "rounded-calico-body";
  const arms = [
    limb(body, skin("armL", pose), -19, 28.5, 7),
    limb(body, skin("armR", pose), 19, 28.5, 7),
  ];
  pose.arms = arms;
  const legs = [
    limb(body, skin("foot", pose), -7.5, 5, 4.1, true),
    limb(body, skin("foot", pose), 7.5, 5, 4.1, true),
  ];
  const pouch = new THREE.Group();
  pouch.name = "small-cloth-pouch";
  pouch.position.set(18.5, 12.8, 8);
  pouch.rotation.y = -0.3;
  body.add(pouch);
  const cloth = new THREE.MeshStandardMaterial({
    color: "#76523b",
    roughness: 1,
  });
  pouch.add(new THREE.Mesh(new RoundedBoxGeometry(7, 6.5, 3.5, 4, 1.4), cloth));
  const flap = new THREE.Mesh(
    new RoundedBoxGeometry(7.2, 2.6, 1.2, 4, 0.5),
    new THREE.MeshStandardMaterial({ color: "#956b4a", roughness: 1 }),
  );
  flap.position.set(0, 2, 2);
  pouch.add(flap);
  const { tail, bones } = continuousTail(body);
  const gun = new THREE.Group(),
    knife = new THREE.Group();
  gun.position.set(0, -9, 8);
  gun.scale.setScalar(0.68);
  knife.position.copy(gun.position);
  knife.scale.copy(gun.scale);
  arms[0].add(gun, knife);
  const blade = new THREE.Mesh(
    new RoundedBoxGeometry(3, 5, 22, 3, 0.8),
    new THREE.MeshStandardMaterial({ color: "#f3dea3", roughness: 0.6 }),
  );
  blade.position.z = 14;
  knife.add(blade);
  knife.visible = false;
  const helmet = new THREE.Group(),
    vest = new THREE.Group(),
    pack = new THREE.Group();
  helmet.visible = vest.visible = pack.visible = false;
  body.children.forEach((child) => (child.position.y -= 29));
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 64;
  const ctx = shadowCanvas.getContext("2d")!,
    gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  gradient.addColorStop(0, "rgba(25,34,22,.35)");
  gradient.addColorStop(1, "rgba(25,34,22,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(56, 43),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(shadowCanvas),
      transparent: true,
      depthWrite: false,
    }),
  );
  shadow.material.name = "player-contact-shadow";
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.8;
  root.add(shadow);
  return {
    root,
    body,
    head,
    legs,
    arms,
    tail,
    tailJoints: bones,
    eyes,
    gun,
    knife,
    helmet,
    vest,
    pack,
    player: pose,
  };
}
export function animatePlayerCat(
  rig: PlayerCatRig,
  time: number,
  walk: number,
  angle: number,
  roll: number,
  rollDirection: number,
  rollAim: number,
) {
  const pose = rig.player,
    stride = walk ? Math.sin(walk) : 0;
  rig.body.position.y =
    31 + (walk ? Math.abs(stride) * 1.1 : Math.sin(time * 2.2) * 0.35);
  rig.body.rotation.set(0, 0, stride * 0.065);
  rig.head.rotation.set(
    walk ? Math.sin(walk * 2 + 0.5) * 0.045 : Math.sin(time * 1.3) * 0.018,
    Math.sin(time * 0.8) * 0.022,
    -stride * 0.035,
  );
  rig.head.position.z = 2 + (walk ? Math.sin(walk * 2) * 0.45 : 0);
  rig.legs.forEach((leg, i) => {
    leg.rotation.x = walk ? Math.sin(walk + i * Math.PI) * 0.62 : 0;
    leg.rotation.z = walk ? stride * 0.025 : 0;
  });
  pose.arms.forEach((arm, i) => {
    arm.rotation.x = walk
      ? -Math.sin(walk + i * Math.PI) *
        (i === 0 && (rig.gun.visible || rig.knife.visible) ? 0.32 : 0.48)
      : Math.sin(time * 1.7 + i) * 0.025;
    arm.rotation.z =
      (i ? -0.06 : 0.06) + (walk ? Math.cos(walk + i * Math.PI) * 0.035 : 0);
  });
  // Usually a broad left/right sweep, with brief softer intervals and delayed tip follow-through.
  const quiet = Math.pow((1 + Math.sin(time * 0.28 + pose.phase)) / 2, 12);
  const sweep = (0.85 - quiet * 0.63) * Math.sin(time * 1.9 + pose.phase);
  rig.tailJoints.forEach((joint, i) => {
    joint.rotation.y =
      i === 0
        ? sweep
        : Math.sin(time * 2.2 - i * 0.48 + pose.phase) * (0.04 + i * 0.006);
    joint.rotation.x = Math.sin(time * 1.7 - i * 0.39) * 0.055;
  });
  pose.ears.forEach((ear, i) => {
    const twitch = Math.pow(
      Math.max(0, Math.sin(time * 1.4 + i * 2.3 + pose.phase)),
      12,
    );
    ear.rotation.z =
      Math.sin(time * 0.85 + i * 2) * 0.06 + (i ? 1 : -1) * twitch * 0.27;
  });
  pose.face.earL.value = pose.ears[0].rotation.z;
  pose.face.earR.value = pose.ears[1].rotation.z;
  if (!pose.blinkAt) pose.blinkAt = time + 1.2 + pose.phase * 0.25;
  if (time >= pose.blinkAt) {
    pose.blinkStart = time;
    pose.blinkAt = time + 3.1 + Math.sin(time) * 0.5;
  }
  const blinkTime = time - pose.blinkStart;
  const blink =
    blinkTime < 0.24 ? Math.max(0.055, Math.abs(blinkTime - 0.12) / 0.12) : 1;
  pose.face.blink.value = blink;
  pose.face.gaze.value = Math.sin(time * 0.75) * 0.36;
  rig.eyes.forEach((eye) => (eye.scale.y = blink));
  rig.helmet.visible = rig.vest.visible = rig.pack.visible = false;
  if (roll > 0) {
    const progress = Math.min(1, (0.35 - roll) / 0.35),
      forward = Math.cos(rollDirection - rollAim) >= -1e-6;
    rig.root.rotation.y = Math.PI / 2 - rollDirection - (forward ? 0 : Math.PI);
    rig.body.quaternion.setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      (forward ? 1 : -1) * progress * Math.PI * 2,
    );
    rig.body.position.y = 29 + Math.sin(progress * Math.PI) * 9;
    rig.head.rotation.x = -0.18;
    rig.legs.forEach((leg) => (leg.rotation.x = -0.75));
    pose.arms.forEach((arm) => (arm.rotation.x = -0.65));
  }
}
