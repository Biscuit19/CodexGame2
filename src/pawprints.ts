import * as THREE from "three";
import type { Raid } from "./raid";

/** Small, reusable ground decals; no per-frame mesh, texture, or material allocation. */
export class PawPrints {
  group = new THREE.Group();
  marks: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  constructor() {
    this.group.name = "player-paw-trail";
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 96;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "white";
    for (const [x, y, angle] of [
      [26, 35, -0.4],
      [41, 23, -0.13],
      [59, 23, 0.13],
      [74, 35, 0.4],
    ]) {
      c.beginPath();
      c.ellipse(x, y, 8, 11, angle, 0, Math.PI * 2);
      c.fill();
    }
    c.beginPath();
    c.moveTo(28, 69);
    c.bezierCurveTo(21, 55, 35, 48, 48, 46);
    c.bezierCurveTo(61, 48, 75, 55, 68, 69);
    c.bezierCurveTo(65, 77, 56, 70, 48, 70);
    c.bezierCurveTo(39, 70, 32, 77, 28, 69);
    c.fill();
    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(11, 13);
    for (let n = 0; n < 16; n++) {
      const mark = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          map: texture,
          color: "#443c2c",
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        }),
      );
      mark.visible = false;
      this.marks.push(mark);
      this.group.add(mark);
    }
  }
  update(footprints: Raid["footprints"]) {
    const recent = footprints.slice(-this.marks.length);
    this.marks.forEach((mark, i) => {
      const f = recent[i];
      mark.visible = !!f;
      if (!f) return;
      mark.position.set(f.x, 0.12, f.y);
      mark.rotation.set(-Math.PI / 2, -f.angle - Math.PI / 2, 0, "YXZ");
      mark.material.opacity = 0.34 * Math.max(0, Math.min(1, f.life / 2));
    });
  }
}
