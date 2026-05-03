import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { executeTool } from "./rina-tools.js";

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

async function withTempDir<T>(prefix: string, fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = makeTempDir(prefix);
  try {
    return await fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("listFiles returns expected entries", async () => {
  await withTempDir("rina-tools-list-", async (dir) => {
    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.writeFileSync(path.join(dir, "package.json"), "{}\n");
    fs.writeFileSync(path.join(dir, "src", "example.ts"), "export const value = 1;\n");

    const result = await executeTool({ tool: "listFiles", path: "." }, { cwd: dir });

    assert.equal(result.ok, true);
    assert.ok(Array.isArray(result.output));
    assert.ok(result.output.includes("package.json"));
    assert.ok(result.output.includes("src/"));
    assert.ok(result.output.includes("src/example.ts"));
  });
});

test("readFile reads text and rejects missing, oversized, and binary-ish files", async () => {
  await withTempDir("rina-tools-read-", async (dir) => {
    fs.writeFileSync(path.join(dir, "notes.txt"), "hello world\n");
    fs.writeFileSync(path.join(dir, "large.txt"), "x".repeat(32));
    fs.writeFileSync(path.join(dir, "binary.bin"), Buffer.from([0x41, 0x00, 0x42]));

    const okResult = await executeTool({ tool: "readFile", path: "notes.txt" }, { cwd: dir });
    assert.equal(okResult.ok, true);
    assert.deepEqual(okResult.output, { path: "notes.txt", content: "hello world\n" });

    const missingResult = await executeTool({ tool: "readFile", path: "missing.txt" }, { cwd: dir });
    assert.equal(missingResult.ok, false);
    assert.match(missingResult.error, /no such file|enoent/i);

    const largeResult = await executeTool(
      { tool: "readFile", path: "large.txt" },
      { cwd: dir, maxFileBytes: 8 },
    );
    assert.equal(largeResult.ok, false);
    assert.match(largeResult.error, /file too large/i);

    const binaryResult = await executeTool({ tool: "readFile", path: "binary.bin" }, { cwd: dir });
    assert.equal(binaryResult.ok, false);
    assert.match(binaryResult.error, /binary files are not supported/i);
  });
});

test("searchInFiles finds matches and normalizes rg output to repo-relative paths", async () => {
  await withTempDir("rina-tools-search-", async (dir) => {
    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.writeFileSync(path.join(dir, "src", "example.ts"), "const missingThing = 1;\nconsole.log(missingThing);\n");

    const result = await executeTool(
      { tool: "searchInFiles", query: "missingThing", path: "." },
      {
        cwd: dir,
        execText: async () => `${path.join(dir, "src", "example.ts")}:1:const missingThing = 1;`,
      },
    );

    assert.equal(result.ok, true);
    assert.ok(Array.isArray(result.output));
    assert.ok(result.output.some((line) => String(line).startsWith("src/example.ts:1")));
  });
});

test("getGitStatus handles git repo and non-git repo", async () => {
  await withTempDir("rina-tools-git-", async (dir) => {
    execFileSync("git", ["init", "-b", "main"], { cwd: dir, stdio: "ignore" });
    fs.writeFileSync(path.join(dir, "README.md"), "# demo\n");

    const repoResult = await executeTool({ tool: "getGitStatus", cwd: dir }, { cwd: dir });
    assert.equal(repoResult.ok, true);
    assert.match(String(repoResult.output), /main/);
  });

  await withTempDir("rina-tools-non-git-", async (dir) => {
    const nonRepoResult = await executeTool({ tool: "getGitStatus", cwd: dir }, { cwd: dir });
    assert.equal(nonRepoResult.ok, false);
    assert.match(nonRepoResult.error, /git status failed|not a git repository|command failed/i);
  });
});

test("runCommand returns output correctly", async () => {
  const result = await executeTool(
    { tool: "runCommand", command: "echo hello", cwd: "/tmp/demo" },
    {
      cwd: "/workspace",
      execText: async (command, cwd) => `${cwd}: ${command}`,
    },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.output, {
    command: "echo hello",
    cwd: "/tmp/demo",
    output: "/tmp/demo: echo hello",
  });
});

test("runCommand falls back to pseudo-tty capture for empty tsc failures", async () => {
  await withTempDir("rina-tools-tsc-pty-", async (dir) => {
    const binDir = path.join(dir, "bin");
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(path.join(dir, "tsconfig.json"), "{\n  \"compilerOptions\": {}\n}\n");
    fs.writeFileSync(
      path.join(binDir, "tsc"),
      [
        "#!/usr/bin/env bash",
        "if [ -t 1 ] || [ -t 2 ]; then",
        "  printf '%s\\n' \"src/example.ts(1,1): error TS2339: Property 'PanelGroup' does not exist.\" >&2",
        "fi",
        "exit 2",
        "",
      ].join("\n"),
      { mode: 0o755 },
    );

    const fakeTsc = path.join(binDir, "tsc");
    const result = await executeTool(
      { tool: "runCommand", command: `${fakeTsc} -p ./`, cwd: dir },
      { cwd: dir },
    );

    assert.equal(result.ok, false);
    assert.match(result.error, /TS2339/i);
    assert.match(result.error, /PanelGroup/);
  });
});

test("applyPatch updates one file correctly", async () => {
  await withTempDir("rina-tools-patch-", async (dir) => {
    const filePath = path.join(dir, "src", "example.ts");
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, "export const value = 1;\n", "utf8");

    const result = await executeTool(
      { tool: "applyPatch", path: "src/example.ts", newContent: "export const value = 2;\n" },
      { cwd: dir },
    );

    assert.equal(result.ok, true);
    assert.deepEqual(result.output, {
      path: "src/example.ts",
      previousContent: "export const value = 1;\n",
      newContent: "export const value = 2;\n",
    });
    assert.equal(await fsp.readFile(filePath, "utf8"), "export const value = 2;\n");
  });
});
