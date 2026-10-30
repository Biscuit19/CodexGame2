/** Derive the workbench catalog from actual gameplay sources on EVERY dev/build.
 * Literal overrides are compiled only after checking their original baseline.
 * Structural indices, save validators, PRNG internals and rendering meshes are not design settings.
 */
import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
const files = [
  "data.ts",
  "store.ts",
  "raid.ts",
  "village.ts",
  "container-info.ts",
  "locomotion.ts",
  "knife-motion.ts",
  "reload-motion.ts",
  "combat-visuals.ts",
];
const omitted = new Set([
  "weaponRows",
  "weapons",
  "defenses",
  "bags",
  "ammo",
  "foods",
  "collectibles",
  "rng",
  "mathQuestion",
  "validateSave",
  "validateItem",
  "validateLoaded",
  "validateSlots",
  "persist",
  "load",
  "loadSlots",
  "readSlot",
  "saveSlot",
  "takeQuantity",
  "makeItem",
  "normalizeAmmo",
  "normalizeFood",
  "itemNameColor",
  "weaponSpreadDegrees",
  "foodEffect",
]);
const groupNames = {
  data: "基础规则",
  store: "经济与整备",
  raid: "战斗与敌人",
  village: "乡野布局",
  "container-info": "容器交互",
  locomotion: "角色移动",
  "knife-motion": "近战动作",
  "reload-motion": "换弹动作",
  "combat-visuals": "子弹表现",
};
const names = {
  moveScale: "敌人个体移速系数",
  autoLoadout: "一键低级配装",
  projectileTrailLength: "子弹拖尾长度",
  fullReduction: "满耐久护具穿透减伤",
  enemyAim: "敌人走位预判",
  enemyCanFire: "室内外射击规则",
  alert: "声音传播与警觉",
  noiseClock: "脚步声感知节奏",
  freeEnemyPoint: "建筑外敌人出生范围",
  tacticalMove: "战术冲刺与翻滚位移",
  tacticShot: "战术射击伤害与弹幕",
  updateVillageTactics: "乡野敌人战术节奏",
  tacticCool: "敌人战术冷却",
  tacticStep: "敌人战术轮次",
  PREFLIGHT_AMMO: "出战最低弹药数",
  PREFLIGHT_FOOD: "出战最低食物数",
  PREFLIGHT_WEAPONS: "出战最低枪械数",
  RAID_SECONDS: "单局行动时长（秒）",
  SALE_RATIO: "出售折算比例",
  PLAYER_MAX_HP: "玩家最大生命",
  MOVEMENT: "移动与体力",
  maxStamina: "最大体力",
  runSpeed: "持枪移动速度",
  knifeSpeed: "持刀移动速度",
  exhaustedSpeed: "耗尽体力速度",
  drainPerSecond: "每秒体力消耗",
  rollCost: "翻滚体力消耗",
  recoveryPerSecond: "每秒体力恢复",
  recoverThreshold: "恢复阈值",
  AMMO_STACK: "弹药堆叠上限",
  FOOD_STACK: "食物堆叠上限",
  BASE_PACK: "初始背包格数",
  EXTRACT_SECONDS: "撤离等待秒数",
  MELEE_SWING_SECONDS: "近战攻击间隔",
  capacities: "仓库容量",
  warehouseCosts: "仓库扩容价格",
  safeCap: "安全箱容量",
  safePrice: "安全箱升级价格",
  armorDur: "护甲耐久",
  helmetDur: "头盔耐久",
  ammoMult: "弹药伤害倍率",
  penetration: "弹药穿透等级",
  sale: "出售价值比例",
  weaponDamageScale: "武器耐久伤害曲线",
  wearWeapon: "开枪磨损",
  searchTime: "物品搜索时间",
  randomWeapon: "随机武器权重",
  loot: "通用收集品掉落",
  maps: "地图",
  bosses: "首领",
  hp: "生命值",
  maxHp: "最大生命值",
  time: "行动时限",
  p: "玩家初始状态",
  width: "地图宽度",
  height: "地图高度",
  spawn: "出生/生成",
  skillCool: "技能冷却",
  cool: "攻击冷却",
  tier: "等级",
  fee: "付费撤离价格",
  reward: "撤离奖励",
  price: "价格",
  range: "范围",
  damage: "伤害",
  mag: "弹匣容量",
  rpm: "射速",
  reload: "换弹",
  useFood: "食用",
  updateEnemy: "敌人AI",
  hurtPlayer: "玩家受击",
  hurtEnemy: "敌人受击",
  kill: "敌人战利品",
  melee: "近战攻击",
  shoot: "玩家射击",
  addBullet: "子弹速度与发射",
  projectileFalloff: "子弹距离衰减",
  update: "行动与移动",
  engage: "敌人警戒",
  moveActor: "移动碰撞辅助",
  blocked: "碰撞边界",
  route: "寻路",
  lineClear: "视线检测",
  interact: "交互距离",
  startSearch: "开启搜索",
  answer: "保险箱答题",
  finish: "行动结算",
  buy: "商店购买",
  buyBack: "回购",
  repairCost: "维修费用",
  repair: "维修耐久损耗",
  rescue: "救济条件",
  newSave: "新存档",
  settle: "结算",
  deploymentWarnings: "出战检查",
  defaults: "设置默认值",
  coins: "初始金币",
  buildVillage: "猫尾乡野",
  build: "其他地图生成",
  collect: "收集品掉落",
  weights: "收集品等级概率",
  count: "容器物品数量",
  container: "容器生成与内容",
  chance: "刷新概率",
  high: "高价值容器",
  region: "区域",
  hunter: "猎人小屋",
  clinic: "猫咪诊所",
  shop: "杂货铺",
  home: "普通民居",
  barn: "谷仓",
  boss: "Boss据点",
  wild: "野外",
  farm: "农田",
  shelter: "小棚屋",
  outbuilding: "废弃小屋",
  supply: "补给建筑",
  "boss-yard": "Boss外围",
  villageScale: "地图缩放",
  VILLAGE_WIDTH: "乡野地图宽度",
  VILLAGE_HEIGHT: "乡野地图高度",
  designBuildings: "建筑规格",
  villageBuildings: "建筑",
  villageBridges: "桥梁",
  villageTrees: "树木分布",
  villageRocks: "岩石分布",
  villageDecorations: "装饰分布",
  villageFenceRects: "围栏碰撞",
  CONTAINER_HIGHLIGHT_RANGE: "容器亮边距离",
  containerOutlineWidth: "容器描边宽度",
  stock: "商品限购",
  mapsReward: "结算地图奖励",
  item: "物品",
  roll: "翻滚",
  rollCooldown: "翻滚冷却",
  rollX: "翻滚X",
  rollY: "翻滚Y",
  take: "拾取",
  equipContainer: "容器装备",
  armorDurability: "护甲耐久",
  helmetDurability: "头盔耐久",
  food: "补给品",
  desired: "交战距离",
  speed: "移动速度",
  recoverInterrupted: "中断恢复",
};
const hash = (s) => createHash("sha256").update(s).digest("hex");
function canon(s) {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    ts.LanguageVariant.Standard,
    s,
  );
  let out = "",
    t;
  while ((t = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken)
    out += t === ts.SyntaxKind.NumericLiteral ? "#" : scanner.getTokenText();
  return out;
}
function ancestors(node) {
  const a = [];
  for (let p = node.parent; p; p = p.parent) a.unshift(p);
  return a;
}
function nodeName(n) {
  if (
    (n.name && ts.isIdentifier(n.name)) ||
    (n.name && ts.isStringLiteral(n.name))
  )
    return n.name.text;
  return "";
}
function segments(node, sf) {
  return ancestors(node)
    .map((p) => {
      if (ts.isObjectLiteralExpression(p)) {
        const prop = p.properties.find(
          (x) =>
            ts.isPropertyAssignment(x) &&
            ["name", "id"].includes(nodeName(x)) &&
            ts.isStringLiteral(x.initializer),
        );
        return prop?.initializer.text || "";
      }
      if (
        ts.isFunctionDeclaration(p) ||
        ts.isMethodDeclaration(p) ||
        ts.isClassDeclaration(p) ||
        ts.isVariableDeclaration(p) ||
        ts.isPropertyAssignment(p) ||
        ts.isPropertyDeclaration(p)
      )
        return nodeName(p);
      if (
        ts.isArrayLiteralExpression(p) &&
        ts.isArrayLiteralExpression(p.parent)
      )
        return `第${p.parent.elements.indexOf(p) + 1}组`;
      return "";
    })
    .filter(Boolean)
    .filter((n) => n !== "Raid");
}
function context(node) {
  for (let p = node.parent; p; p = p.parent)
    if (
      ts.isVariableDeclaration(p) ||
      ts.isPropertyAssignment(p) ||
      ts.isPropertyDeclaration(p) ||
      ts.isReturnStatement(p) ||
      ts.isExpressionStatement(p) ||
      ts.isParameter(p)
    )
      return p;
  return node.parent;
}
function structural(node, a, ss, value) {
  if (
    a.some(
      (p) =>
        ts.isTypeNode(p) ||
        ts.isImportDeclaration(p) ||
        ts.isExportDeclaration(p) ||
        (ts.isElementAccessExpression(p) && p.argumentExpression === node),
    )
  )
    return true;
  if (ss.some((s) => omitted.has(s))) return true;
  if (a.some((p) => ts.isPropertyAssignment(p) && p.name === node)) return true;
  const parent = node.parent;
  if (
    value === 60 &&
    a.some(
      (p) =>
        ts.isBinaryExpression(p) &&
        p.operatorToken.kind === ts.SyntaxKind.SlashToken &&
        /rpm|MELEE_SWING_SECONDS/.test(p.getText()),
    )
  )
    return true;
  if (
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5 &&
    ts.isCallExpression(parent) &&
    /Math\.(min|max)/.test(parent.expression.getText())
  )
    return true;
  if (
    ts.isBinaryExpression(parent) &&
    [
      ts.SyntaxKind.EqualsEqualsEqualsToken,
      ts.SyntaxKind.ExclamationEqualsEqualsToken,
      ts.SyntaxKind.EqualsEqualsToken,
      ts.SyntaxKind.ExclamationEqualsToken,
    ].includes(parent.operatorToken.kind)
  )
    return true;
  if (
    a.some(
      (p) =>
        ts.isForStatement(p) &&
        [p.initializer, p.condition, p.incrementor].some(
          (h) => h && node.pos >= h.pos && node.end <= h.end,
        ),
    )
  )
    return true;
  if (
    a.some(
      (p) =>
        ts.isBinaryExpression(p) &&
        p.operatorToken.kind === ts.SyntaxKind.PercentToken,
    )
  )
    return true;
  if (
    value === 0 &&
    !ts.isArrayLiteralExpression(parent) &&
    !/chance|prob|weight/i.test(ss.join("/"))
  )
    return true;
  if (
    value === 1 &&
    !ts.isArrayLiteralExpression(parent) &&
    !/chance|tier|qty|count|heal|penetration|PREFLIGHT/i.test(ss.join("/"))
  )
    return true;
  if (
    ss.some((s) =>
      [
        "uid",
        "id",
        "breed",
        "map",
        "phase",
        "revealed",
        "slot",
        "version",
        "ng",
        "updated",
      ].includes(s),
    )
  )
    return true;
  if (value >= 1e6 || (Math.abs(value) > 0 && Math.abs(value) < 1e-6))
    return true;
  return false;
}
function constantNumber(node) {
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isParenthesizedExpression(node))
    return constantNumber(node.expression);
  if (ts.isPropertyAccessExpression(node) && node.getText() === "Math.PI")
    return Math.PI;
  if (ts.isPrefixUnaryExpression(node)) {
    const n = constantNumber(node.operand);
    if (n === undefined) return;
    return node.operator === ts.SyntaxKind.MinusToken
      ? -n
      : node.operator === ts.SyntaxKind.PlusToken
        ? n
        : undefined;
  }
  if (ts.isBinaryExpression(node)) {
    const a = constantNumber(node.left),
      b = constantNumber(node.right);
    if (a === undefined || b === undefined) return;
    switch (node.operatorToken.kind) {
      case ts.SyntaxKind.PlusToken:
        return a + b;
      case ts.SyntaxKind.MinusToken:
        return a - b;
      case ts.SyntaxKind.AsteriskToken:
        return a * b;
      case ts.SyntaxKind.SlashToken:
        return a / b;
      case ts.SyntaxKind.AsteriskAsteriskToken:
        return a ** b;
    }
  }
}
export function collectTuning(root = process.cwd()) {
  const config = JSON.parse(
    readFileSync(resolve(root, "src/game-tuning.json"), "utf8"),
  );
  const modules = new Map(),
    entries = [],
    digest = [];
  for (const file of files) {
    const path = resolve(root, "src", file),
      code = readFileSync(path, "utf8"),
      sf = ts.createSourceFile(path, code, ts.ScriptTarget.Latest, true),
      edits = [],
      used = new Map();
    digest.push(file + code);
    const category = groupNames[file.replace(".ts", "")];
    function visit(node) {
      const atomic =
        ts.isBinaryExpression(node) && Number.isFinite(constantNumber(node));
      if (atomic || ts.isNumericLiteral(node)) {
        const target =
          ts.isPrefixUnaryExpression(node.parent) &&
          node.parent.operator === ts.SyntaxKind.MinusToken
            ? node.parent
            : node;
        const a = ancestors(target),
          ss = segments(target, sf),
          value = constantNumber(target);
        if (!structural(target, a, ss, value)) {
          const c = context(target),
            raw = c.getText(sf),
            sig = canon(raw),
            baseKey = file + ":" + ss.join("/") + ":" + sig,
            index = used.get(baseKey) || 0;
          used.set(baseKey, index + 1);
          const id =
            file.replace(".ts", "") +
            "." +
            hash(baseKey).slice(0, 12) +
            "." +
            index;
          const parent = target.parent,
            arr = ts.isArrayLiteralExpression(parent) ? parent : undefined;
          const array =
            arr && arr.elements.every((n) => constantNumber(n) !== undefined)
              ? arr.elements.map((n) => constantNumber(n))
              : undefined;
          const probabilityGroup =
            array &&
            array.length === 5 &&
            Math.abs(array.reduce((a, b) => a + b, 0) - 1) < 1e-6
              ? file +
                ":" +
                ss.join("/") +
                ":" +
                hash(canon(arr.getText(sf))).slice(0, 8)
              : undefined;
          const probability =
            ss.includes("SALE_RATIO") ||
            !!probabilityGroup ||
            (value > 0 &&
              value < 1 &&
              ts.isBinaryExpression(parent) &&
              (/^(n|roll|chance)$/.test(parent.left.getText()) ||
                /\.random\(\)$/.test(parent.left.getText())) &&
              [
                ts.SyntaxKind.LessThanToken,
                ts.SyntaxKind.GreaterThanToken,
                ts.SyntaxKind.LessThanEqualsToken,
                ts.SyntaxKind.GreaterThanEqualsToken,
              ].includes(parent.operatorToken.kind));
          const labels = ss.map((n) => names[n] || n);
          if (arr) labels.push(`第${arr.elements.indexOf(target) + 1}项`);
          if (ss.includes("weaponDamageScale"))
            labels.push(
              value === 0.3
                ? "最低威力倍率"
                : value === 0.7
                  ? "耐久威力幅度"
                  : "满威力所需耐久",
            );
          if (ss.includes("damage")) {
            const label = {
              ".85": "高穿透伤害倍率",
              ".63": "同级穿透伤害倍率",
              ".28": "低穿透伤害倍率",
              1.5: "爆头倍率",
            }[String(value).replace("0.", ".")];
            if (label) labels.push(label);
          }
          if (ss.includes("spawn") && ss.includes("hp"))
            labels.push(
              value === 55
                ? "普通敌人基础生命"
                : value === 17
                  ? "每级生命成长"
                  : "",
            );
          if (ss.includes("updateEnemy") && ss.includes("canSee"))
            labels.push(
              value === 780 ? "狙击敌人视野距离" : "普通敌人视野距离",
            );
          if (ss.includes("updateEnemy") && ss.includes("speed"))
            labels.push(
              { 28: "巡逻", 48: "重装", 84: "突击/侧翼", 62: "普通战斗" }[
                value
              ] || "",
            );
          if (
            ts.isCallExpression(parent) &&
            parent.expression.getText() === "container" &&
            parent.arguments.indexOf(target) === 4
          ) {
            labels.push(
              (names[parent.arguments[0]?.text] ||
                parent.arguments[0]?.text ||
                "") +
                " / " +
                (parent.arguments[1]?.text || "") +
                " / 刷新概率",
            );
          }

          const description = raw.replace(/\s+/g, " ").slice(0, 280);
          const over = config.numbers[id];
          if (over && (!Number.isFinite(over.value) || over.base !== value))
            throw Error(`数值配置基线已变化：${id}，请对照新源数据重新应用`);
          const positive =
            /SPEED|SECONDS|WIDTH|HEIGHT|AMMO_STACK|FOOD_STACK|BASE_PACK|MAX_HP|Speed|useTime|reload|capacity/.test(
              ss.join("/"),
            );
          const min = probability
              ? 0
              : positive
                ? 0.000001
                : value >= 0
                  ? 0
                  : -1e6,
            max = probability ? 1 : 1e6;
          const entry = {
            id,
            label: labels.join(" / ") || file,
            category: /collect|container|loot|randomWeapon|weights/.test(
              ss.join("/"),
            )
              ? "容器与掉落"
              : category,
            scope: ss[0] || file,
            base: value,
            value: over ? over.value : value,
            min,
            max,
            integer: Number.isInteger(value) && !probability,
            unit: probability ? "%" : "",
            probabilityGroup,
            description,
            source: file,
            line:
              sf.getLineAndCharacterOfPosition(target.getStart(sf)).line + 1,
          };
          entries.push(entry);
          if (over)
            edits.push({
              start: target.getStart(sf),
              end: target.end,
              replacement: `__gameNumber(${JSON.stringify(id)},${target.getText(sf)})`,
            });
        }
      }
      if (atomic) return;
      ts.forEachChild(node, visit);
    }
    visit(sf);
    modules.set(path, { code, edits });
  }
  const known = new Set(entries.map((e) => e.id));
  for (const id of Object.keys(config.numbers))
    if (!known.has(id)) throw Error(`配置含过期数值ID：${id}`);
  digest.push(
    readFileSync(new URL(import.meta.url), "utf8"),
    ...[
      "collectibles.ts",
      "game-catalog.ts",
      "game-tuning-runtime.ts",
      "audio.ts",
      "music.ts",
    ].map((f) => readFileSync(resolve(root, "src", f), "utf8")),
    ...readdirSync(resolve(root, "src/assets/audio"))
      .filter((f) => f.startsWith("approved-") && f.endsWith(".json"))
      .sort()
      .map((f) => readFileSync(resolve(root, "src/assets/audio", f), "utf8")),
    JSON.stringify(config),
    readFileSync(resolve(root, "src/audio-balance.json"), "utf8"),
    readFileSync(resolve(root, "src/audio-samples.ts"), "utf8"),
  );
  return {
    entries,
    modules,
    fingerprint: hash(digest.join("\n")).slice(0, 20),
    config,
  };
}
export function tuningPlugin() {
  let root;
  return {
    name: "tricat-current-game-tuning",
    enforce: "pre",
    configResolved(c) {
      root = c.root;
    },
    resolveId(id) {
      if (["virtual:game-tuning-catalog", "virtual:game-release"].includes(id))
        return "\0" + id;
    },
    load(id) {
      if (id === "\0virtual:game-release") {
        const c = collectTuning(root);
        return `export default ${JSON.stringify({ fingerprint: c.fingerprint, builtAt: new Date().toISOString() })}`;
      }
      if (id === "\0virtual:game-tuning-catalog") {
        const c = collectTuning(root);
        return `export default ${JSON.stringify({ schema: "tricat-game-catalog", version: 1, fingerprint: c.fingerprint, builtAt: new Date().toISOString(), entries: c.entries })}`;
      }
    },
    transform(code, id) {
      const path = id.split("?")[0];
      if (!files.some((f) => path === resolve(root, "src", f))) return;
      const m = collectTuning(root).modules.get(path);
      if (!m?.edits.length) return;
      let out = code;
      for (const e of [...m.edits].sort((a, b) => b.start - a.start))
        out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
      return {
        code:
          'import {gameNumber as __gameNumber} from "./game-tuning-runtime";\n' +
          out,
        map: null,
      };
    },
    handleHotUpdate(ctx) {
      if (
        ctx.file.endsWith("/src/game-tuning.json") ||
        files.some((f) => ctx.file === resolve(root, "src", f))
      ) {
        const mod = ctx.server.moduleGraph.getModuleById(
          "\0virtual:game-tuning-catalog",
        );
        if (mod) ctx.server.moduleGraph.invalidateModule(mod);
        const release = ctx.server.moduleGraph.getModuleById(
          "\0virtual:game-release",
        );
        if (release) ctx.server.moduleGraph.invalidateModule(release);
        ctx.server.ws.send({ type: "full-reload" });
      }
    },
  };
}
