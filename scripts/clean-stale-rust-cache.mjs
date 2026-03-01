import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function readRustField(details, key) {
  const match = details.match(new RegExp(`^${key}:\\s+(.+)$`, "m"));
  return match?.[1]?.trim() ?? "unknown";
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const tauriDir = path.join(repoRoot, "src-tauri");
const targetDir = path.join(tauriDir, "target");
const stampPath = path.join(targetDir, ".rust-toolchain-stamp");

const rustcPath = execSync("command -v rustc", { encoding: "utf8" }).trim();
const rustcDetails = execSync("rustc -Vv", { encoding: "utf8" });

const currentStamp = [
  `rustc_path=${rustcPath}`,
  `host=${readRustField(rustcDetails, "host")}`,
  `release=${readRustField(rustcDetails, "release")}`,
  `commit_hash=${readRustField(rustcDetails, "commit-hash")}`,
].join("\n");

const previousStamp = fs.existsSync(stampPath)
  ? fs.readFileSync(stampPath, "utf8").trim()
  : null;
const hasTargetDir = fs.existsSync(targetDir);
const hasArtifacts =
  hasTargetDir &&
  fs.readdirSync(targetDir).some((entry) => entry !== path.basename(stampPath));
const shouldClean = hasArtifacts && previousStamp !== currentStamp;

if (shouldClean) {
  console.log(
    "Rust toolchain changed since last cached build. Cleaning src-tauri target cache...",
  );
  execSync("cargo clean", { cwd: tauriDir, stdio: "inherit" });
}

fs.mkdirSync(targetDir, { recursive: true });
fs.writeFileSync(stampPath, `${currentStamp}\n`);

if (!shouldClean) {
  console.log("Rust toolchain stamp is up to date.");
}
