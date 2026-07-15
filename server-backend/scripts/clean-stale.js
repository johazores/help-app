/**
 * Removes a stale `src/` tree left over from older project layouts.
 *
 * This project uses the root layout (`app/` + `pages/` at the repo root). If a
 * `src/` folder from a previous version is still present (e.g. after unzipping
 * an update on top of an old checkout), its outdated files break type-checking
 * even though they aren't routed. Running before every build makes deploys
 * immune to leftover files.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const appDir = path.join(root, "app");
const srcDir = path.join(root, "src");

if (fs.existsSync(appDir) && fs.existsSync(srcDir)) {
  fs.rmSync(srcDir, { recursive: true, force: true });
  console.log("[clean-stale] Removed leftover src/ directory from an older layout.");
} else {
  console.log("[clean-stale] No stale src/ directory — nothing to do.");
}
