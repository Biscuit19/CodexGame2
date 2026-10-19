import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

type EarFace = { earL: { value: number }; earR: { value: number } };
/** Palette follows h1…h5 in equipment.png, independently of rarity/UI colors. */
export const helmetStyles = [
  { id: "h1", color: "#aab2b8", trim: "#59656d", cut: 10.4 },
  { id: "h2", color: "#708746", trim: "#344b30", cut: 9.8 },
  { id: "h3", color: "#447abe", trim: "#153c62", cut: 10.4 },
  { id: "h4", color: "#7062a4", trim: "#302d51", cut: 9.2 },
  { id: "h5", color: "#fff0c8", trim: "#eaae31", cut: 10.4 },
] as const;

export function createPlayerHelmets(
  shellGeometry: (height: number) => THREE.BufferGeometry,
  face: EarFace,
  earDeformation: string,
) {
  const helmets = new THREE.Group();
  helmets.name = "fitted-cat-ear-helmets";
  for (const style of helmetStyles) {
    const model = new THREE.Group();
    model.name = `player-helmet-${style.id}`;
    model.userData.helmetTier = Number(style.id[1]);
    model.visible = false;
    helmets.add(model);
    function material(color: string, opacity = 1) {
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.65,
        metalness: 0.15,
        side: THREE.DoubleSide,
        transparent: opacity < 1,
        opacity,
        depthWrite: opacity === 1,
      });
      mat.customProgramCacheKey = () =>
        "player-helmet-detail-ear-deformation-v1";
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.catEarL = face.earL;
        shader.uniforms.catEarR = face.earR;
        shader.vertexShader =
          "uniform float catEarL, catEarR;\n" + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>\n${earDeformation}`,
        );
      };
      return mat;
    }
    const main = material(style.color),
      edge = material(style.trim),
      ink = material("#102d39");
    main.name = `player-${style.id}-shell`;
    const shell = new THREE.Mesh(
      shellGeometry(style.cut).scale(1.025, 1.025, 1.025),
      main,
    );
    shell.name = "helmet-shell";
    model.add(shell);
    function mesh(
      name: string,
      geometry: THREE.BufferGeometry,
      mat: THREE.Material,
    ) {
      const m = new THREE.Mesh(geometry, mat);
      m.name = name;
      model.add(m);
      return m;
    }
    function box(
      name: string,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      mat: THREE.Material,
      angle = 0,
    ) {
      return mesh(
        name,
        new RoundedBoxGeometry(w, h, d, 3, Math.min(0.65, h / 3, d / 3))
          .rotateZ(angle)
          .translate(x, y, z),
        mat,
      );
    }
    function tube(
      name: string,
      points: number[][],
      radius: number,
      mat: THREE.Material,
    ) {
      const curve = new THREE.CatmullRomCurve3(
        points.map(
          (p) => new THREE.Vector3(...(p as [number, number, number])),
        ),
      );
      return mesh(
        name,
        new THREE.TubeGeometry(curve, 32, radius, 8, false),
        mat,
      );
    }
    function polygon(
      name: string,
      points: number[][],
      z: number,
      depth: number,
      mat: THREE.Material,
    ) {
      const shape = new THREE.Shape();
      points.forEach(([x, y], i) =>
        i ? shape.lineTo(x, y) : shape.moveTo(x, y),
      );
      shape.closePath();
      return mesh(
        name,
        new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: true,
          bevelThickness: 0.25,
          bevelSize: 0.25,
          bevelSegments: 2,
          steps: 1,
        }).translate(0, 0, z),
        mat,
      );
    }
    // A real rolled rim, with a brow and a rear lip rather than a painted stripe.
    const rim = style.id === "h1" ? edge : ink;
    tube(
      "rolled-brow-rim",
      [
        [-20.5, 10.6, 8],
        [-15, 10.6, 14],
        [0, 10.6, 17],
        [15, 10.6, 14],
        [20.5, 10.6, 8],
      ],
      0.7,
      rim,
    );
    tube(
      "rear-helmet-lip",
      [
        [-20, 10.6, -8],
        [-14, 10.6, -14],
        [0, 10.6, -16],
        [14, 10.6, -14],
        [20, 10.6, -8],
      ],
      0.65,
      edge,
    );
    for (const side of [-1, 1]) {
      const x = side * 15.2;
      polygon(
        "armored-ear-inset",
        [
          [x - side * 3.3, 18],
          [x, 25],
          [x + side * 3, 18],
        ],
        2.6,
        0.65,
        edge,
      );
    }
    if (style.id === "h1") {
      // Old steel helmet: silver dome, rolled brim, rivets and short hanging straps.
      for (const x of [-17, 17]) {
        box("steel-rivet", x, 11.7, 12.3, 1.4, 1.4, 1.2, edge);
        box(
          "chin-strap",
          x,
          -0.3,
          7.4,
          1.7,
          12,
          1.3,
          edge,
          x < 0 ? 0.18 : -0.18,
        );
        box("strap-buckle", x, -5.4, 8.4, 3.2, 2.7, 1.4, main);
      }
      tube(
        "steel-crown-ridge",
        [
          [0, 14, -12],
          [0, 18, 0],
          [0, 14, 12],
        ],
        0.45,
        edge,
      );
    } else if (style.id === "h2") {
      // The icon's central rectangular mount and separate temple armor blocks.
      box("tactical-mount-frame", 0, 13.2, 17.1, 7, 8, 2, ink);
      box("tactical-mount", 0, 13.2, 18.3, 5, 5.8, 1.4, edge);
      for (const side of [-1, 1]) {
        box(
          "temple-armor-block",
          side * 20,
          10,
          8,
          4.8,
          7.5,
          3.6,
          main,
          side * 0.2,
        );
        box(
          "temple-armor-inset",
          side * 20,
          10,
          10,
          3.2,
          5.2,
          1,
          edge,
          side * 0.2,
        );
        box("tactical-strap", side * 16, -0.5, 6.5, 2, 11, 1.5, edge);
        box("tactical-buckle", side * 16, -4.2, 7.7, 3.8, 2, 1.4, main);
      }
      tube(
        "tactical-brow-seam",
        [
          [-17, 12.5, 12],
          [0, 13.5, 16.7],
          [17, 12.5, 12],
        ],
        0.5,
        edge,
      );
    } else if (style.id === "h3" || style.id === "h4") {
      const special = style.id === "h4";
      const lens = material(special ? "#a58cdb" : "#94deef", 0.63);
      box("visor-upper-frame", 0, 7.7, 17.3, 28, 2.2, 2.6, ink);
      polygon(
        "curved-goggle-lens",
        [
          [-13, 6.7],
          [-12, 0.8],
          [-5, -0.8],
          [0, 0.4],
          [5, -0.8],
          [12, 0.8],
          [13, 6.7],
        ],
        17.1,
        1,
        lens,
      );
      for (const side of [-1, 1]) {
        box("earcup-frame", side * 21.4, 3.5, 6, 4.5, 11, 5, edge);
        box("earcup-pad", side * 22, 3.5, 7.8, 2.8, 7.3, 2, main);
      }
      if (special) {
        polygon(
          "respirator-jaw",
          [
            [-12, -1.4],
            [-10, -9],
            [0, -12],
            [10, -9],
            [12, -1.4],
            [5, -3],
            [0, -1],
            [-5, -3],
          ],
          13.2,
          2.4,
          edge,
        );
        polygon(
          "nose-guard",
          [
            [-3, -2],
            [0, 0.1],
            [3, -2],
            [2, -9],
            [0, -10.5],
            [-2, -9],
          ],
          16.1,
          1.2,
          main,
        );
        for (const side of [-1, 1])
          for (let i = 0; i < 3; i++)
            box(
              "respirator-vent",
              side * (5.5 + i * 1.6),
              -5.3,
              16.2,
              0.65,
              3.2,
              0.8,
              ink,
              side * 0.15,
            );
      }
    } else {
      const gold = edge;
      for (const side of [-1, 1]) {
        polygon(
          "gold-ear-inset",
          [
            [side * 11.3, 18],
            [side * 15.2, 25],
            [side * 18.4, 18],
          ],
          3.4,
          1,
          material("#f9ad23"),
        );
        polygon(
          "ivory-cheek-plate",
          [
            [side * 11, 4],
            [side * 16, -1],
            [side * 13, -8],
            [side * 6, -10],
            [side * 4, -6],
          ],
          13.7,
          2.2,
          main,
        );
        box("gold-temple-hinge", side * 20.3, 3.3, 8.2, 3.4, 8, 3, gold);
      }
      polygon(
        "gold-forehead-chevron",
        [
          [-6, 13.5],
          [0, 7.5],
          [6, 13.5],
        ],
        17.2,
        1.1,
        gold,
      );
      polygon(
        "gold-mask-frame",
        [
          [-14, 5],
          [0, 1.5],
          [14, 5],
          [13, -1],
          [4, -4],
          [3, -10],
          [-3, -10],
          [-4, -4],
          [-13, -1],
        ],
        17.1,
        1.1,
        gold,
      );
      polygon(
        "black-t-visor",
        [
          [-12, 3.4],
          [0, 0.3],
          [12, 3.4],
          [11, -0.2],
          [2, -2.5],
          [1.7, -9],
          [-1.7, -9],
          [-2, -2.5],
          [-11, -0.2],
        ],
        18.4,
        0.7,
        ink,
      );
    }
  }
  return helmets;
}
