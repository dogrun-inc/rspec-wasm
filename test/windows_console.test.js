import test from "node:test";
import assert from "node:assert/strict";
import { configureWindowsConsole } from "../src/windows_console.js";

test("configureWindowsConsole: changes a Windows console to UTF-8", () => {
  const calls = [];
  const execute = (command, options) => {
    calls.push({ command, options });
    return "Active code page: 932";
  };

  configureWindowsConsole("win32", execute);

  assert.deepEqual(calls, [
    { command: "chcp", options: { encoding: "utf-8" } },
    { command: "chcp 65001", options: { stdio: "ignore" } },
  ]);
});

test("configureWindowsConsole: keeps an existing UTF-8 code page", () => {
  const calls = [];
  const execute = (command, options) => {
    calls.push({ command, options });
    return "Active code page: 65001";
  };

  configureWindowsConsole("win32", execute);

  assert.deepEqual(calls, [
    { command: "chcp", options: { encoding: "utf-8" } },
  ]);
});

test("configureWindowsConsole: does nothing outside Windows", () => {
  let called = false;
  configureWindowsConsole("linux", () => {
    called = true;
  });

  assert.equal(called, false);
});

test("configureWindowsConsole: ignores chcp failures", () => {
  assert.doesNotThrow(() => {
    configureWindowsConsole("win32", () => {
      throw new Error("chcp is unavailable");
    });
  });
});