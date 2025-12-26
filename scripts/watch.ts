import url from "url";
import path from "path";
import fs from "fs-extra";
import { spawn } from "child_process";

const PEOPLE_DIR = "people";
const DATA_DIR = "data";
const PUBLIC_DIR = "public";
const SCRIPTS_DIR = "scripts";

const projectRoot = path.dirname(
  path.dirname(url.fileURLToPath(import.meta.url))
);

let buildProcess: ReturnType<typeof spawn> | null = null;
let isBuilding = false;
let needsRebuild = false;

/**
 * Build the project
 */
async function build() {
  if (isBuilding) {
    needsRebuild = true;
    return;
  }

  isBuilding = true;
  console.log("\x1b[36m%s\x1b[0m", "[Watch] Building...");
  const startTime = Date.now();

  buildProcess = spawn(
    "node",
    ["--loader", "ts-node/esm/transpile-only", "scripts/build.ts"],
    {
      cwd: projectRoot,
      stdio: "inherit",
      shell: true,
    }
  );

  buildProcess.on("close", (code) => {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    if (code === 0) {
      console.log(
        "\x1b[32m%s\x1b[0m",
        `[Watch] ✓ Build completed in ${duration}s`
      );
    } else {
      console.log("\x1b[31m%s\x1b[0m", `[Watch] ✗ Build failed (${duration}s)`);
    }

    isBuilding = false;
    buildProcess = null;

    // Rebuild if there are pending changes
    if (needsRebuild) {
      needsRebuild = false;
      setTimeout(() => build(), 100);
    }
  });
}

/**
 * Debounce function to prevent multiple rapid builds
 *
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 */
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | null = null;
  return function (...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const debouncedBuild = debounce(build, 300);

/**
 * Watch files for changes
 */
function watchFiles() {
  const watchDirs = [
    path.join(projectRoot, PEOPLE_DIR),
    path.join(projectRoot, DATA_DIR),
    path.join(projectRoot, PUBLIC_DIR),
    path.join(projectRoot, SCRIPTS_DIR),
  ];

  console.log("\x1b[36m%s\x1b[0m", "[Watch] Watching for file changes...");
  console.log(
    "\x1b[90m%s\x1b[0m",
    `[Watch] Monitoring: ${watchDirs.map((d) => path.basename(d)).join(", ")}`
  );

  watchDirs.forEach((dir) => {
    if (fs.existsSync(dir)) {
      fs.watch(dir, { recursive: true }, (eventType, filename) => {
        if (filename) {
          // Ignore temporary files and hidden files
          if (
            filename.includes(".swp") ||
            filename.includes(".tmp") ||
            filename.startsWith(".") ||
            filename.includes("node_modules")
          ) {
            return;
          }

          console.log(
            "\x1b[33m%s\x1b[0m",
            `[Watch] Change detected: ${filename}`
          );
          debouncedBuild();
        }
      });
    }
  });

  // Watch root config files
  const rootFiles = ["info-i18n.yml", "tsconfig.json"];
  rootFiles.forEach((file) => {
    const filePath = path.join(projectRoot, file);
    if (fs.existsSync(filePath)) {
      fs.watchFile(filePath, () => {
        console.log("\x1b[33m%s\x1b[0m", `[Watch] Change detected: ${file}`);
        debouncedBuild();
      });
    }
  });
}

console.log("\x1b[35m%s\x1b[0m", "=".repeat(50));
console.log("\x1b[35m%s\x1b[0m", "  One Among Us - Development Mode");
console.log("\x1b[35m%s\x1b[0m", "=".repeat(50));
console.log("");

build().then(() => {
  watchFiles();
  console.log("");
  console.log("\x1b[32m%s\x1b[0m", "[Watch] ✓ Ready! Watching for changes...");
  console.log("\x1b[90m%s\x1b[0m", "[Watch] Press Ctrl+C to stop");
  console.log("");
});

process.on("SIGINT", () => {
  console.log("");
  console.log("\x1b[36m%s\x1b[0m", "[Watch] Stopping...");
  if (buildProcess) {
    buildProcess.kill();
  }
  process.exit(0);
});
