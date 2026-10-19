import {
  villageRiver,
  villageTributary,
  villageWaterWidth,
  villageRoads,
  villageBuildings,
  villagePoint,
  VILLAGE_WIDTH,
  VILLAGE_HEIGHT,
} from "./village";
/** World coordinates; callers choose a bounded texture resolution, independent of map dimensions. */
export function drawVillageGround(c: CanvasRenderingContext2D) {
  c.fillStyle = "#879b6a";
  c.fillRect(0, 0, VILLAGE_WIDTH, VILLAGE_HEIGHT);
  let seed = 68132;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let n = 0; n < 230; n++) {
    const x = rand() * VILLAGE_WIDTH,
      y = rand() * VILLAGE_HEIGHT;
    c.fillStyle = n % 3 ? "#93a77525" : "#627d4d20";
    c.beginPath();
    c.ellipse(
      x,
      y,
      130 + rand() * 350,
      90 + rand() * 240,
      rand(),
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  const stroke = (points: number[][], color: string, width: number) => {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  };
  c.lineCap = "round";
  c.lineJoin = "round";
  for (const road of villageRoads) {
    stroke(road, "#b2a078", 225);
    stroke(road, "#c6b087", 180);
    stroke(road, "#d4bf952e", 104);
  }
  const field = villagePoint(1790, 775),
    end = villagePoint(2290, 1020);
  c.fillStyle = "#b6a475";
  c.fillRect(field.x, field.y, end.x - field.x, end.y - field.y);
  c.lineCap = "butt";
  for (let y = field.y + 45; y < end.y - 20; y += 87) {
    stroke(
      [
        [field.x + 25, y],
        [end.x - 25, y],
      ],
      "#8e855c",
      28,
    );
    stroke(
      [
        [field.x + 25, y - 12],
        [end.x - 25, y - 12],
      ],
      "#9eaa70",
      19,
    );
  }
  c.lineCap = "round";
  for (const river of [villageRiver, villageTributary]) {
    stroke(river, "#a2a17b", villageWaterWidth + 100);
    stroke(river, "#d0bc8e", villageWaterWidth + 60);
    stroke(river, "#487e86", villageWaterWidth + 5);
    stroke(river, "#659c9f", villageWaterWidth);
    stroke(river, "#7fafa925", villageWaterWidth - 100);
  }
  const court = villagePoint(1680, 150),
    courtEnd = villagePoint(2230, 640);
  c.fillStyle = "#b7aa85";
  c.fillRect(court.x, court.y, courtEnd.x - court.x, courtEnd.y - court.y);
  for (const b of villageBuildings) {
    c.save();
    c.translate(b.x, b.y);
    c.rotate(b.rotation);
    c.fillStyle = "#b2a486";
    c.fillRect(
      -b.w / 2 - 55,
      -b.h / 2 - 45,
      b.w + 110,
      b.h + b.entryDepth + 100,
    );
    c.fillStyle = "#bda789";
    c.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    c.fillRect(-b.w * 0.3, b.h / 2, b.w * 0.6, b.entryDepth);
    c.restore();
  }
  // Restrained texture marks retain open ground instead of creating extra colliders.
  for (let n = 0; n < 11500; n++) {
    const x = rand() * VILLAGE_WIDTH,
      y = rand() * VILLAGE_HEIGHT;
    c.fillStyle = n % 2 ? "#e3d9a609" : "#3b573b0b";
    c.fillRect(x, y, 3 + rand() * 9, 2 + rand() * 4);
  }
}
