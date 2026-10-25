import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SKILL = "C:\\Users\\R C S\\.codex\\plugins\\cache\\openai-primary-runtime\\presentations\\26.1024.11018\\skills\\presentations";
const BUILD = path.join(ROOT, ".presentation-build-final");
const FINAL = path.join(ROOT, "presentation", "output", "ademix-final-2026-10-25.pptx");
const RUNTIME_PYTHON = "C:\\Users\\R C S\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const FONT = "Aptos";
const C = { ink: "#F4F7F8", muted: "#A9B6BC", bg: "#071116", panel: "#101F26", panel2: "#162A32", orange: "#FF8A35", cyan: "#32D6C5", green: "#7DDA8A", red: "#FF6B5F", line: "#31505B" };

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
  const slide = p.slides.add(); slide.background.fill = C.bg;
  box(slide, 0, 0, 1280, 9, C.orange, "none");
  text(slide, title, 64, 38, 1100, 62, 34, C.ink, true);
  text(slide, String(n).padStart(2, "0"), 1170, 48, 48, 30, 14, C.muted, true, "right");
  return slide;
}
function pill(slide, label, x, y, w, fill = C.panel2, color = C.cyan) {
  box(slide, x, y, w, 36, fill); text(slide, label, x + 12, y + 2, w - 24, 30, 13, color, true, "center");
}
function metric(slide, value, label, x, y, w, color = C.cyan) {
  box(slide, x, y, w, 106); text(slide, value, x + 18, y + 10, w - 36, 44, 30, color, true); text(slide, label, x + 18, y + 59, w - 36, 30, 14, C.muted);
}
function connector(slide, x1, y1, x2, y2, color = C.orange) {
  slide.shapes.add({ geometry: "line", position: { left: Math.min(x1, x2), top: Math.min(y1, y2), width: Math.max(1, Math.abs(x2 - x1)), height: Math.max(1, Math.abs(y2 - y1)) }, line: { fill: color, width: 3, beginArrowType: "none", endArrowType: "triangle" }, fill: "none" });
}
async function addImage(slide, rel, x, y, w, h, fit = "contain") {
  const bytes = await fs.readFile(path.join(ROOT, rel));
  slide.images.add({ blob: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), contentType: "image/png", alt: `Ademix interface evidence: ${path.basename(rel)}`, fit, position: { left: x, top: y, width: w, height: h }, geometry: "roundRect", borderRadius: "rounded-xl" });
}

{
  const s = p.slides.add(); s.background.fill = C.bg;
  await addImage(s, "evidence/final-release/live-opening.png", 555, 0, 725, 720, "cover");
  box(s, 0, 0, 610, 720, C.bg, "none"); box(s, 0, 0, 14, 720, C.orange, "none");
  pill(s, "DIGITAL MINE ON OPENGIZ", 64, 68, 260);
  text(s, "Ademix", 64, 150, 470, 72, 54, C.ink, true);
  text(s, "3D open-pit operations twin", 64, 232, 470, 88, 36, C.orange, true);
  text(s, "Live OpenEgiz twins connect mine events to dispatcher decisions.", 64, 338, 450, 82, 23, C.muted);
  text(s, "Ahmad Shah Yawar  |  Professor", 64, 612, 450, 30, 17, C.ink, true);
  text(s, "Team Ademix", 64, 651, 450, 26, 15, C.muted);
}

{
  const s = base("The load-haul-crush decision", 2);
  text(s, "A dispatcher must keep ore moving when equipment, road speed or crusher capacity changes.", 64, 108, 1110, 54, 21, C.muted);
  const items = [["Observe", "Returned twin state shows trucks, queues, road condition, production and constraints.", C.cyan], ["Decide", "The Decision workspace compares fixed and Smart Dispatch using matched model evidence.", C.orange], ["Act", "The operator restores the road or crusher, tows a failed truck, or parks surplus fleet.", C.green]];
  items.forEach(([h, b, col], i) => { const y = 205 + i * 135; text(s, String(i + 1).padStart(2, "0"), 76, y, 68, 48, 25, col, true); box(s, 154, y - 5, 3, 88, col, "none"); text(s, h, 184, y - 5, 190, 38, 25, C.ink, true); text(s, b, 385, y - 5, 760, 72, 18, C.muted); });
  pill(s, "FICTIONAL LAYOUT | SOURCE-CALIBRATED | SYNTHETIC TELEMETRY", 290, 610, 700, C.panel2, C.orange);
}

{
  const s = base("OpenEgiz is the source of displayed state", 3);
  text(s, "The interface never reads the simulator directly. Every operational value returns through Eclipse Ditto.", 64, 108, 1120, 54, 20, C.muted);
  const nodes = [[64, 220, 205, "Python simulation", "Deterministic events"], [310, 220, 150, "MQTT", "Ditto Protocol"], [500, 220, 210, "Eclipse Ditto", "11 digital twins"], [750, 220, 170, "Ademix API", "Authenticated reads"], [960, 220, 250, "3D command center", "Returned state only"]];
  nodes.forEach(([x,y,w,h,sub]) => { box(s,x,y,w,142); text(s,h,x+14,y+24,w-28,38,20,C.ink,true,"center"); text(s,sub,x+12,y+77,w-24,35,14,C.muted,false,"center"); });
  for (let i=0;i<nodes.length-1;i++) connector(s,nodes[i][0]+nodes[i][2]+8,291,nodes[i+1][0]-8,291);
  metric(s, "11", "Ditto twins", 180, 450, 240, C.cyan); metric(s, "143", "required fields and units", 520, 450, 260, C.orange); metric(s, "20x", "authoritative simulation clock", 880, 450, 240, C.green);
}

{
  const s = base("Eleven twins describe one production circuit", 4);
  text(s, "Thirty-eight explicit relationships make hierarchy, material flow, movement and control inspectable.", 64, 108, 1120, 50, 20, C.muted);
  box(s, 520, 185, 240, 82, C.panel2); text(s, "Mine aggregate", 540, 203, 200, 38, 22, C.orange, true, "center");
  const groups = [[64,340,300,"Mobile fleet","6 haul trucks"],[350,340,250,"Loading","1 excavator"],[650,340,250,"Infrastructure","1 haul road"],[950,340,265,"Processing + control","1 crusher + 1 controller"]];
  groups.forEach(([x,y,w,h,sub],i)=>{box(s,x,y,w,150);text(s,h,x+18,y+22,w-36,38,20,[C.cyan,C.green,C.orange,C.red][i],true,"center");text(s,sub,x+18,y+78,w-36,36,17,C.ink,true,"center");connector(s,640,270,x+w/2,330,[C.cyan,C.green,C.orange,C.red][i]);});
  text(s, "Relationships carry model meaning. Support buildings and two waste trucks remain visual context.", 90, 575, 1100, 44, 17, C.muted, false, "center");
}

{
  const s = base("The mine view starts with the operating picture", 5);
  await addImage(s, "evidence/final-release/live-overview-reset.png", 64, 120, 800, 515);
  text(s, "Opening priorities", 905, 135, 285, 34, 23, C.ink, true);
  [["Production", "Observed output and processed tonnes"],["Constraint", "Current bottleneck and scenario"],["Fleet", "Cycling and ready reserve trucks"],["Queue", "One operator-relevant wait measure"]].forEach(([h,b],i)=>{const y=195+i*105;text(s,h,905,y,265,28,18,[C.cyan,C.orange,C.green,C.red][i],true);text(s,b,905,y+32,270,53,15,C.muted);});
  text(s, "Technical layers stay closed until requested.", 905, 602, 270, 27, 14, C.muted);
}

{
  const s = base("Material balance and model assumptions", 6);
  metric(s, "77 t", "truck payload", 64, 150, 245, C.orange); metric(s, "770 t/h", "modeled baseline", 330, 150, 265, C.green); metric(s, "3.2 km", "one-way route assumption", 616, 150, 275, C.cyan); metric(s, "0 t", "accepted mass-balance error", 912, 150, 304, C.green);
  box(s, 64, 310, 720, 270, C.panel2); text(s, "Material accounting", 94, 334, 300, 32, 23, C.ink, true); text(s, "initial ROM + extracted ore", 94, 392, 320, 34, 22, C.orange, true); text(s, "payload in trucks + current ROM + processed ore", 94, 447, 610, 52, 21, C.cyan, true); text(s, "The equality is checked throughout every scenario.", 94, 518, 620, 28, 16, C.muted);
  box(s, 820, 310, 396, 270); text(s, "Evidence classes", 846, 334, 330, 32, 23, C.ink, true);
  text(s, "Sourced", 846, 388, 110, 28, 17, C.cyan, true); text(s, "OpenMines parameters and licenses", 964, 388, 225, 28, 14, C.muted);
  text(s, "Assumed", 846, 438, 110, 28, 17, C.orange, true); text(s, "Route, fleet and crusher planning values", 964, 432, 225, 42, 14, C.muted);
  text(s, "Synthetic", 846, 496, 110, 28, 17, C.green, true); text(s, "Telemetry and modeled outcomes", 964, 496, 225, 28, 14, C.muted);
}

{
  const s = base("Each disruption changes a visible constraint", 7);
  s.charts.add("bar", { position: { left: 54, top: 135, width: 630, height: 430 }, categories: ["Normal", "Breakdown first hour", "Road restriction", "Crusher slowdown"], series: [{ name: "Throughput (t/h)", values: [770, 691, 645.3, 495], fill: C.orange }], hasLegend: false, dataLabels: { showValue: true, position: "outEnd", textStyle: { fill: C.ink, fontSize: 14, bold: true } }, xAxis: { minimumScale: 0, maximumScale: 900, majorUnit: 150, textStyle: { fill: C.muted, fontSize: 12 }, majorGridlines: { style: "solid", fill: C.line, width: 1 } }, yAxis: { textStyle: { fill: C.muted, fontSize: 12 } } });
  await addImage(s, "evidence/final-release/live-effect.png", 715, 140, 500, 420);
  text(s, "Breakdown is the matched returning-lane first-hour case. Other values use the documented steady comparison window.", 64, 592, 1130, 40, 14, C.muted);
}

{
  const s = base("Smart Dispatch removes avoidable truck activity", 8);
  await addImage(s, "evidence/final-release/live-decision.png", 64, 122, 790, 510);
  metric(s, "4 + 2", "cycling + ready reserve", 890, 145, 300, C.cyan); metric(s, "-33%", "truck-hours per 1,000 t", 890, 280, 300, C.green); metric(s, "-26%", "estimated fuel in matched model", 890, 415, 300, C.orange);
  text(s, "Baseline throughput remains 770 t/h. Results are synthetic model evidence, not measured mine savings.", 890, 553, 300, 68, 14, C.muted);
}

{
  const s = base("A judge can follow the evidence in three minutes", 9);
  await addImage(s, "evidence/final-release/live-why-trust.png", 64, 120, 735, 500);
  text(s, "Judge route", 845, 132, 330, 32, 23, C.ink, true);
  ["1  Baseline mine", "2  HT-01 breakdown", "3  Show effect", "4  Decision evidence", "5  Why trust this?", "6  Overview and reset"].forEach((r,i)=>text(s,r,845,183+i*54,330,34,18,i===3?C.orange:C.ink,i===3));
  pill(s, "http://localhost:4173", 845, 535, 330, C.panel2, C.cyan);
  text(s, "Scope: decision demonstration, not an engineering design, safety system or site forecast.", 845, 585, 330, 58, 14, C.muted);
}

for (let i = 0; i < p.slides.items.length; i++) {
  const png = await p.export({ slide: p.slides.items[i], format: "png", scale: 1 });
  await fs.writeFile(path.join(BUILD, `slide-${String(i+1).padStart(2,"0")}.png`), new Uint8Array(await png.arrayBuffer()));
}
const montage = await p.export({ format: "webp", montage: true });
await fs.writeFile(path.join(BUILD, "montage.webp"), new Uint8Array(await montage.arrayBuffer()));

const requirements = { explicitTotalSlideCount: 9, requiredNativeTableOwnerSlides: [], requiredNativeChartOwnerSlides: [7], materializeLiteralChartWorkbooks: true };
const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL, "container_tools/artifact_tool_utils.mjs")).href);
const candidatePath = path.join(BUILD, "candidate.pptx");
await (await PresentationFile.exportPptx(p)).save(candidatePath);
await fs.mkdir(path.dirname(FINAL), { recursive: true }); await fs.rm(FINAL, { force: true }); await fs.rm(path.join(BUILD, "validation.json"), { force: true });
await finalizePresentation({ ...requirements, workspaceDir: ROOT, candidatePath, finalPath: FINAL, pythonExecutable: RUNTIME_PYTHON, integrityValidatorPath: path.join(SKILL, "container_tools/inspect_presentation_package_integrity.py"), layoutValidatorPath: path.join(SKILL, "container_tools/inspect_presentation_layout_geometry.py"), layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"], requiredNativeTableOwnerSlides: [], fontPolicy: { basis: "design", families: [FONT] }, verifyArtifactToolImport: true, receiptPath: path.join(BUILD, "validation.json") });
