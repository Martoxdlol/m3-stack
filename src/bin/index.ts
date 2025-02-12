#!/usr/bin/env node
import { spawn } from "node:child_process";

function runCmd(cmd: string): void {
  spawn(cmd, { stdio: "inherit", shell: true });
}

const command = process.argv[2];
const subArgs = process.argv.slice(3);

if (!command) {
  console.error("No command provided");
  process.exit(1);
}

const BUILD_APP_SCRIPT = "tsc -b && vite build";
const BUILD_SERVER_SCRIPT =
  "tsup src/server/main.tsx --out-dir dist/server --sourcemap false --format esm --target=esnext --tsconfig tsconfig.json";

const scripts: Record<string, string | string[]> = {
  dev: "vite",
  build: [BUILD_APP_SCRIPT, BUILD_SERVER_SCRIPT],
  "build:app": BUILD_APP_SCRIPT,
  "build:server": BUILD_SERVER_SCRIPT,
  preview: "vite preview",
};

if (!(command in scripts)) {
  console.error(`Command ${command} not found`);
  process.exit(1);
}

if (Array.isArray(scripts[command]!)) {
  const cmd = scripts[command] as string[] | string;
  const commands: string[] = [];
  if (Array.isArray(cmd)) {
    commands.push(...cmd);
  } else {
    commands.push(cmd);
  }

  for (const c of commands) {
    console.log(`m3-stack: Running command [${command}]: ${c}`);
    runCmd(`${c} ${subArgs.join(" ")}`.trim());
  }
}
