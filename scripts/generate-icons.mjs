// Renders the extension icons (public/icon{16,32,48,128}.png) from the SVG sources
// using Chrome for Testing over the DevTools protocol — no extra packages.
//   npm run icons            (uses CHROME_PATH or Chrome for Testing in ~/.cache/puppeteer or ./.cache)
// 16/32px use scripts/icon-small.svg (heavier strokes); 48/128px use public/icon.svg.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sizes = [
  { size: 16, src: "scripts/icon-small.svg" },
  { size: 32, src: "scripts/icon-small.svg" },
  { size: 48, src: "public/icon.svg" },
  { size: 128, src: "public/icon.svg" },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  for (const base of [path.join(os.homedir(), ".cache/puppeteer/chrome"), path.join(root, ".cache/chrome")]) {
    if (!fs.existsSync(base)) continue;
    for (const dir of fs.readdirSync(base).sort().reverse()) {
      for (const rel of ["chrome-linux64/chrome", "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", "chrome-win64/chrome.exe"]) {
        if (fs.existsSync(path.join(base, dir, rel))) return path.join(base, dir, rel);
      }
    }
  }
  throw new Error("Chrome for Testing not found. Set CHROME_PATH or run: npx @puppeteer/browsers install chrome@stable --path .cache");
}

const port = 9335;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "icons-"));
const chrome = spawn(findChrome(), ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--hide-scrollbars", ...(process.env.CI ? ["--no-sandbox"] : []), "about:blank"], { stdio: "ignore" });

let version;
for (let i = 0; i < 50 && !version; i++) {
  try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(200); }
}
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}, sessionId) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });

const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" });
const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } }, sessionId);

for (const { size, src } of sizes) {
  const svg = fs.readFileSync(path.join(root, src), "utf8");
  const html = `<!doctype html><html><body style="margin:0;background:transparent">` +
    `<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}" width="${size}" height="${size}" style="display:block"></body></html>`;
  await send("Emulation.setDeviceMetricsOverride", { width: size, height: size, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send("Page.navigate", { url: "data:text/html;base64," + Buffer.from(html).toString("base64") }, sessionId);
  await sleep(400);
  const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: size, height: size, scale: 1 } }, sessionId);
  fs.writeFileSync(path.join(root, `public/icon${size}.png`), Buffer.from(shot.result.data, "base64"));
  console.log(`public/icon${size}.png  (${src})`);
}

chrome.kill();
fs.rmSync(profile, { recursive: true, force: true });
process.exit(0);
