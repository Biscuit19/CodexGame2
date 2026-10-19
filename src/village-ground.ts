import {
  villageRiver,
  villageTributary,
  villageWaterWidth,
  villageRoads,
  villageBridges,
  villageBuildings,
  villageZones,
} from "./village";

export function drawVillageGround(c: CanvasRenderingContext2D, labels = false) {
  c.fillStyle = "#82965f";
  c.fillRect(0, 0, 2400, 1800);
  c.lineCap = "round";
  c.lineJoin = "round";
  const stroke = (points: number[][], color: string, width: number) => {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  };
  // Broad open lawns, a small number of readable paths and one coherent cultivated block.
  for (const road of villageRoads) {
    stroke(road, "#aa9667", 66);
    stroke(road, "#c5ac7b", 53);
  }
  c.fillStyle = "#b0a364";
  c.fillRect(1790, 775, 500, 245);
  c.lineCap = "butt";
  for (let y = 790; y < 1010; y += 25) {
    c.strokeStyle = "#786c3f";
    c.lineWidth = 10;
    c.beginPath();
    c.moveTo(1800, y);
    c.lineTo(2280, y);
    c.stroke();
    c.strokeStyle = "#a8b16b";
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(1800, y - 5);
    c.lineTo(2280, y - 5);
    c.stroke();
  }
  c.lineCap = "round";
  for (const river of [villageRiver, villageTributary]) {
    stroke(river, "#c3b17e", villageWaterWidth + 32);
    stroke(river, "#3c7784", villageWaterWidth + 5);
    stroke(river, "#559aaa", villageWaterWidth);
    stroke(river, "#75b0b6", villageWaterWidth - 44);
  }
  for (const b of villageBridges) {
    c.fillStyle = "#ad8b60";
    c.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
  }
  for (const b of villageBuildings) {
    c.fillStyle = "#a79c76";
    c.fillRect(b.x - b.w / 2 - 20, b.y - b.h / 2 - 16, b.w + 40, b.h + 40);
    c.fillStyle = "#bca77f";
    c.fillRect(b.x - b.w / 2 + 8, b.y - b.h / 2 + 8, b.w - 16, b.h - 16);
  }
  c.fillStyle = "#b4a16f";
  c.fillRect(1680, 150, 550, 490);
  // Repaint the farmhouse footprint over the courtyard.
  const boss = villageBuildings.find((b) => b.id === "boss")!;
  c.fillStyle = "#a79c76";
  c.fillRect(
    boss.x - boss.w / 2 - 12,
    boss.y - boss.h / 2 - 12,
    boss.w + 24,
    boss.h + 24,
  );
  c.fillStyle = "#bca77f";
  c.fillRect(
    boss.x - boss.w / 2 + 8,
    boss.y - boss.h / 2 + 8,
    boss.w - 16,
    boss.h - 16,
  );
  if (labels) {
    c.font = 'bold 40px "Noto Sans SC",sans-serif';
    c.textAlign = "center";
    c.textBaseline = "middle";
    for (const z of villageZones) {
      c.lineWidth = 8;
      c.strokeStyle = "#314d40";
      c.strokeText(z.name, z.x, z.y);
      c.fillStyle = "#f7edd0";
      c.fillText(z.name, z.x, z.y);
    }
  }
}
