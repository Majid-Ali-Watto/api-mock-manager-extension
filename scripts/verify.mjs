// Release/CI sanity checks for the built extension. Run after `npm run build`.
//   npm run verify                 (RELEASE_TAG=v1.2.3 also checks the tag matches)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

// Changing these is a privacy/store-review decision: update the allowlist (and
// public/privacy.html) deliberately, never as a side effect.
const ALLOWED_PERMISSIONS = ["storage"];
const ALLOWED_HOST_PERMISSIONS = [];

const errors = [];
const check = (ok, message) => { if (!ok) errors.push(message); };

const pkg = readJson(path.join(root, "package.json"));
const manifest = readJson(path.join(root, "public/manifest.json"));

check(manifest.version === pkg.version, `manifest.json version ${manifest.version} != package.json version ${pkg.version}`);
const tag = process.env.RELEASE_TAG;
if (tag) check(tag === `v${pkg.version}`, `release tag ${tag} != v${pkg.version} (bump package.json and manifest.json first)`);

for (const p of manifest.permissions || []) check(ALLOWED_PERMISSIONS.includes(p), `permission "${p}" is not in the allowlist in scripts/verify.mjs`);
for (const p of manifest.host_permissions || []) check(ALLOWED_HOST_PERMISSIONS.includes(p), `host permission "${p}" is not in the allowlist in scripts/verify.mjs`);
check(!manifest.web_accessible_resources, "web_accessible_resources lets any site detect the extension; remove it or allowlist it deliberately");

if (!fs.existsSync(dist)) {
  errors.push("dist/ not found — run `npm run build` first");
} else {
  const builtManifest = readJson(path.join(dist, "manifest.json"));
  check(builtManifest.version === manifest.version, "dist/manifest.json is stale — rebuild");
  const referenced = new Set([
    ...Object.values(manifest.icons || {}),
    ...Object.values(manifest.action?.default_icon || {}),
    manifest.action?.default_popup,
    manifest.background?.service_worker,
    ...(manifest.content_scripts || []).flatMap((cs) => cs.js || []),
    "privacy.html",
    "terms.html",
  ].filter(Boolean));
  for (const file of referenced) check(fs.existsSync(path.join(dist, file)), `dist/${file} is missing (referenced by the manifest or legal links)`);

  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  const maps = walk(dist).filter((f) => f.endsWith(".map"));
  check(maps.length === 0, `source maps must not ship: ${maps.map((f) => path.relative(root, f)).join(", ")}`);
}

if (errors.length) {
  console.error(`✖ verify failed:\n  - ${errors.join("\n  - ")}`);
  process.exit(1);
}
console.log(`✔ verify passed (v${pkg.version}${tag ? `, tag ${tag}` : ""}; permissions: ${(manifest.permissions || []).join(", ") || "none"})`);
