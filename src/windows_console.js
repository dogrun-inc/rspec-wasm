import { execSync } from "node:child_process";

export function configureWindowsConsole(platform = process.platform, execute = execSync) {
  if (platform !== "win32") {
    return;
  }

  try {
    const currentCodePage = execute("chcp", { encoding: "utf-8" });
    if (!currentCodePage.includes("65001")) {
      execute("chcp 65001", { stdio: "ignore" });
    }
  } catch {
    // Keep the CLI usable when chcp is unavailable.
  }
}