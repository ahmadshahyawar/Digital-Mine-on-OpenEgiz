import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = "E:\\Digital Mine on OpenEgiz";
const SKILL = "C:\\Users\\R C S\\.codex\\plugins\\cache\\openai-primary-runtime\\presentations\\26.1020.11127\\skills\\presentations";
const BUILD = path.join(ROOT, ".presentation-build");
const FINAL = path.join(ROOT, "presentation", "output", "presentation.pptx");
const FONT = "Aptos";
const C = { ink: "#F4F7F8", muted: "#A9B6BC", bg: "#071116", panel: "#101F26", panel2: "#162A32", orange: "#FF8A35", cyan: "#32D6C5", green: "#7DDA8A", red: "#FF6B5F", line: "#31505B", white: "#FFFFFF" };

await fs.mkdir(BUILD, { recursive: true });
const p = Presentation.create({ slideSize: { width: 1280, height: 720 } });

function box(slide, x, y, w, h, fill = C.panel, radius = "rounded-xl", line = "none") {
  return slide.shapes.add({ geometry: radius === "none" ? "rect" : "roundRect", position: { left: x, top: y, width: w, height: h }, fill, line: { fill: line, width: line === "none" ? 0 : 1 } });
}
function text(slide, value, x, y, w, h, size = 24, color = C.ink, bold = false, align = "left") {
  const s = slide.shapes.add({ geometry: "textbox", position: { left: x, top: y, width: w, height: h }, fill: "none", line: { fill: "none", width: 0 } });
  s.text = value;
  s.text.style = { fontFamily: FONT, fontSize: size, color, bold, alignment: align, verticalAlignment: "middle" };
  return s;
}
function base(title, n) {
  const slide = p.slides.add();
  slide.background.fill = C.bg;
  box(slide, 0, 0, 1280, 9, C.orange, "none");
  text(slide, title, 64, 40, 1100, 58, 34, C.ink, true);
  text(slide, String(n).padStart(2, "0"), 1170, 48, 48, 30, 14, C.muted, true, "right");
  return slide;
}
function pill(slide, label, x, y, w, fill = C.panel2, color = C.cyan) {
  box(slide, x, y, w, 36, fill, "rounded-xl");
  text(slide, label, x + 12, y + 2, w - 24, 30, 13, color, true, "center");
}
function metric(slide, value, label, x, y, w, color = C.cyan) {
  box(slide, x, y, w, 112, C.panel);
  text(slide, value, x + 18, y + 12, w - 36, 48, 31, color, true);
  text(slide, label, x + 18, y + 64, w - 36, 28, 15, C.muted);
}
function connector(slide, x1, y1, x2, y2, color = C.orange) {
  slide.shapes.add({ geometry: "line", position: { left: x1, top: y1, width: Math.max(1, x2 - x1), height: Math.max(1, y2 - y1) }, line: { fill: color, width: 3, beginArrowType: "none", endArrowType: "triangle" }, fill: "none" });
}

// 1 Cover
{
  const s = p.slides.add(); s.background.fill = C.bg;
  box(s, 0, 0, 1280, 720, C.bg, "none");
  box(s, 790, 0, 490, 720, C.panel, "none");
  // Abstract open-pit benches
  for (let i = 0; i < 6; i++) {
    const inset = i * 38;
    box(s, 835 + inset, 85 + inset, 390 - inset * 1.25, 390 - inset * 1.25, i % 2 ? C.panel2 : "#1B3640", "rounded-xl", C.line);
  }
  box(s, 0, 0, 15, 720, C.orange, "none");
  pill(s, "DIGITAL MINE ON OPENGIZ", 70, 76, 260);
  text(s, "Ademix", 70, 154, 620, 72, 54, C.ink, true);
  text(s, "3D open-pit operations twin", 70, 235, 650, 70, 38, C.orange, true);
  text(s, "A connected haulage and crushing simulation built for decisions, not decoration.", 70, 330, 610, 90, 23, C.muted);
  text(s, "Ahmad Shah Yawar  •  Turken Gulzat", 70, 610, 650, 34, 17, C.ink, true);
  text(s, "Al-Farabi Kazakh National University", 70, 650, 650, 28, 15, C.muted);
}

// 2 Decision problem
{
  const s = base("One disruption changes the whole production chain", 2);
  text(s, "Dispatchers need to see consequences across equipment, roads, stockpiles and the crusher in one place.", 64, 112, 1040, 56, 21, C.muted);
  const items = [
    ["01", "Observe", "Live state for trucks, excavator, road, ROM pad and crusher", C.cyan],
    ["02", "Intervene", "Trigger breakdown, road closure or crusher slowdown", C.orange],
    ["03", "Compare", "Read projected throughput against the 900 t/h baseline", C.green],
  ];
  items.forEach(([n, h, b, col], i) => { const y = 205 + i * 135; text(s, n, 76, y, 70, 50, 26, col, true); box(s, 154, y - 5, 2, 85, col, "none"); text(s, h, 184, y - 5, 190, 38, 25, C.ink, true); text(s, b, 385, y - 5, 745, 70, 18, C.muted); });
  pill(s, "DECISION LOOP", 1000, 610, 190, C.panel2, C.orange);
}

// 3 Architecture
{
  const s = base("OpenEgiz is the source of truth", 3);
  text(s, "The browser does not invent mine state. Telemetry flows through MQTT into Eclipse Ditto twins, then the interface reads it through the API.", 64, 108, 1120, 64, 20, C.muted);
  const nodes = [
    [70, 245, 190, "Python simulator", "Deterministic events"],
    [300, 245, 155, "MQTT", "Telemetry"],
    [495, 245, 190, "Eclipse Ditto", "11 digital twins"],
    [725, 245, 170, "Twin API", "Read model"],
    [935, 245, 250, "React + Three.js", "3D command center"],
  ];
  nodes.forEach(([x,y,w,h,sub]) => { box(s,x,y,w,132,C.panel); text(s,h,x+16,y+22,w-32,38,21,C.ink,true,"center"); text(s,sub,x+12,y+72,w-24,30,14,C.muted,false,"center"); });
  for (let i=0;i<nodes.length-1;i++) connector(s,nodes[i][0]+nodes[i][2]+8,311,nodes[i+1][0]-8,311);
  box(s, 300, 465, 585, 96, C.panel2);
  text(s, "InfluxDB", 330, 483, 160, 30, 18, C.cyan, true);
  text(s, "time-series history", 330, 517, 180, 24, 14, C.muted);
  text(s, "Grafana", 585, 483, 160, 30, 18, C.cyan, true);
  text(s, "operational trends", 585, 517, 180, 24, 14, C.muted);
  connector(s, 575, 378, 575, 460, C.cyan);
}

// 4 Model
{
  const s = base("Eleven twins describe one connected mine", 4);
  text(s, "Relationships make the model navigable. Features carry operational state, not only geometry.", 64, 108, 1020, 48, 20, C.muted);
  const groups = [
    [70, 205, 270, 335, "Mine system", ["North Pit", "Haul road", "ROM stockpile"]],
    [380, 205, 370, 335, "Mobile fleet", ["3 haul trucks", "1 excavator", "Position • speed • payload • status"]],
    [790, 205, 420, 335, "Processing + control", ["Crusher", "Scenario controller", "Inventory • processed tonnes • constraints"]],
  ];
  groups.forEach(([x,y,w,h,title,rows], gi) => { box(s,x,y,w,h,gi===1?C.panel2:C.panel); text(s,title,x+24,y+24,w-48,38,23,gi===1?C.orange:C.cyan,true); rows.forEach((r,i)=>{ box(s,x+24,y+89+i*67,w-48,48,"#0B181E"); text(s,r,x+39,y+97+i*67,w-78,30,16,i===rows.length-1?C.muted:C.ink,i<2); }); });
  text(s, "Twin relationships", 70, 585, 205, 28, 15, C.orange, true);
  text(s, "mine → assets → process state → scenario impact", 275, 585, 760, 28, 17, C.ink);
}

// 5 3D interface
{
  const s = base("The 3D scene is an operational interface", 5);
  box(s, 64, 118, 760, 500, "#0B181E");
  // Stylised terrain and haul route
  for (let i=0;i<5;i++) box(s, 115+i*44, 174+i*43, 520-i*88, 320-i*68, i%2?"#17313A":"#1E3C45", "rounded-xl", C.line);
  connector(s, 210, 490, 615, 235, C.orange);
  [[220,475],[385,380],[585,264]].forEach(([x,y],i)=>{box(s,x,y,55,28,i===1?C.red:C.orange,"rounded-xl"); text(s,`T${i+1}`,x,y+1,55,22,11,C.bg,true,"center");});
  box(s, 854, 118, 362, 500, C.panel);
  text(s, "Interface layers", 884, 150, 300, 36, 24, C.ink, true);
  [["Spatial","Camera, benches, route, animated fleet"],["Operational","KPIs, asset selection, status and payload"],["Decision","Scenario controls and projected impact"]].forEach(([h,b],i)=>{ const y=220+i*112; text(s,h,884,y,270,30,19,[C.cyan,C.orange,C.green][i],true); text(s,b,884,y+35,280,57,15,C.muted); });
  text(s, "Conceptual interface composition", 92, 580, 310, 23, 12, C.muted);
}

// 6 Simulation
{
  const s = base("Mass balance keeps the simulation credible", 6);
  text(s, "Truck cycles deliver ore to the ROM pad. The crusher consumes inventory continuously, so material is never deleted at dump time.", 64, 108, 1110, 58, 20, C.muted);
  metric(s, "77 t", "truck payload", 64, 205, 245, C.orange);
  metric(s, "250 t", "initial ROM inventory", 330, 205, 265, C.cyan);
  metric(s, "900 t/h", "baseline crusher rate", 616, 205, 275, C.green);
  metric(s, "15.5 km/h", "closed-road speed", 912, 205, 304, C.red);
  box(s, 64, 365, 1152, 180, C.panel2);
  text(s, "Material accounting", 94, 390, 280, 32, 22, C.ink, true);
  text(s, "initial ROM + delivered ore = current ROM + processed ore", 94, 445, 860, 44, 25, C.orange, true);
  text(s, "Scenario parameters are explicit, testable and visible to the jury.", 94, 500, 920, 28, 16, C.muted);
}

// 7 Scenarios chart
{
  const s = base("What-if modes quantify operational impact", 7);
  text(s, "Projected throughput uses the same baseline across four deterministic modes.", 64, 108, 1000, 44, 20, C.muted);
  s.charts.add("bar", {
    position: { left: 70, top: 180, width: 780, height: 420 },
    categories: ["Baseline", "Truck breakdown", "Road closure", "Crusher slowdown"],
    series: [{ name: "Projected throughput (t/h)", values: [900, 747, 648, 495], fill: C.orange }],
    hasLegend: false,
    dataLabels: { showValue: true, position: "outEnd" },
    xAxis: { minimumScale: 0, maximumScale: 1000, majorUnit: 200, majorGridlines: { style: "solid", fill: C.line, width: 1 } },
    yAxis: {},
  });
  box(s, 900, 188, 310, 388, C.panel);
  text(s, "Impact from baseline", 928, 218, 260, 32, 21, C.ink, true);
  [["Truck breakdown","−17%",C.orange],["Road closure","−28%",C.red],["Crusher slowdown","−45%",C.red]].forEach(([l,v,c],i)=>{const y=295+i*85;text(s,l,928,y,170,28,15,C.muted);text(s,v,1090,y-3,90,34,23,c,true,"right");});
}

// 8 Validation
{
  const s = base("Evidence is separated from release gates", 8);
  text(s, "What is already verified is stated plainly. Remaining environment checks stay visible until they pass.", 64, 108, 1100, 46, 20, C.muted);
  const cols = [
    [64, "Verified", C.green, ["8 simulation unit tests pass", "Frontend production build passes", "Python compile and JSON validation pass", "Compose configuration parses"]],
    [652, "Before submission", C.orange, ["Run clean end-to-end stack", "Capture real 3D interface evidence", "Record demo and rehearse jury flow", "Confirm final commit on official main"]],
  ];
  cols.forEach(([x,h,c,rows])=>{box(s,x,190,564,350,C.panel);text(s,h,x+30,218,500,38,25,c,true);rows.forEach((r,i)=>{box(s,x+30,282+i*56,18,18,c,"rounded-xl");text(s,r,x+64,270+i*56,455,42,17,C.ink,i===0);});});
  pill(s, "NO FABRICATED TELEMETRY • NO HIDDEN CLAIMS", 365, 585, 550, C.panel2, C.cyan);
}

// 9 Close
{
  const s = p.slides.add(); s.background.fill = C.bg;
  box(s, 0, 0, 1280, 12, C.orange, "none");
  text(s, "Ademix turns mine events into decisions", 84, 116, 930, 72, 42, C.ink, true);
  text(s, "Connected twins. Visible material flow. Measurable scenarios.", 84, 207, 940, 50, 26, C.orange, true);
  const stages = [["1","Select an asset"],["2","Trigger a scenario"],["3","Compare throughput"]];
  stages.forEach(([n,l],i)=>{const x=84+i*365;box(s,x,340,320,128,C.panel);text(s,n,x+24,362,52,52,31,C.cyan,true);text(s,l,x+82,360,205,56,19,C.ink,true);});
  text(s, "Team Ademix • Digital Mine on OpenEgiz", 84, 620, 650, 30, 16, C.muted);
  text(s, "github.com/openegiz-contest/team-111", 790, 620, 405, 30, 16, C.muted, false, "right");
}

for (let i = 0; i < p.slides.items.length; i++) {
  const png = await p.export({ slide: p.slides.items[i], format: "png", scale: 1 });
  await fs.writeFile(path.join(BUILD, `slide-${String(i+1).padStart(2,"0")}.png`), new Uint8Array(await png.arrayBuffer()));
}
const montage = await p.export({ format: "webp", montage: true });
await fs.writeFile(path.join(BUILD, "montage.webp"), new Uint8Array(await montage.arrayBuffer()));

const requirements = { explicitTotalSlideCount: 9, requiredNativeTableOwnerSlides: [], requiredNativeChartOwnerSlides: [7], materializeLiteralChartWorkbooks: true };
const fontPolicy = { basis: "design", families: [FONT] };
const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL, "container_tools/artifact_tool_utils.mjs")).href);
const candidatePath = path.join(BUILD, "candidate.pptx");
await (await PresentationFile.exportPptx(p)).save(candidatePath);
await fs.mkdir(path.dirname(FINAL), { recursive: true });
await finalizePresentation({
  ...requirements, workspaceDir: ROOT, candidatePath, finalPath: FINAL,
  pythonExecutable: "C:\\Users\\R C S\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe",
  integrityValidatorPath: path.join(SKILL, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"],
  requiredNativeTableOwnerSlides: [], fontPolicy, verifyArtifactToolImport: true,
  receiptPath: path.join(BUILD, "presentation.validation.json"),
});
await fs.copyFile(FINAL, path.join(ROOT, "presentation.pptx"));
