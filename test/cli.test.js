import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { installAzuranceContext, parseArgs } from "../lib/cli.js";

test("parseArgs applies defaults", () => {
  assert.deepEqual(parseArgs([]), {
    target: "both",
    dir: ".",
    force: false,
    dryRun: false,
    help: false
  });
});

test("installs complete context into an empty directory", async () => {
  const dir = await tempDir();

  await installAzuranceContext({ target: "both", dir, force: false, dryRun: false });

  await assertFileExists(path.join(dir, "AGENTS.md"));
  await assertFileExists(path.join(dir, ".azurance/llm/context.md"));
  await assertFileExists(path.join(dir, ".azurance/llm/provider-api.md"));
  await assertFileExists(path.join(dir, ".azurance/llm/insurer-api.md"));
  await assertFileExists(path.join(dir, ".azurance/llm/openapi/provider-api-bff.openapi.yml"));
  await assertFileExists(path.join(dir, ".azurance/llm/openapi/insurer-bff.openapi.yml"));
});

test("provider target excludes insurer files", async () => {
  const dir = await tempDir();

  await installAzuranceContext({ target: "provider", dir, force: false, dryRun: false });

  await assertFileExists(path.join(dir, ".azurance/llm/provider-api.md"));
  await assertFileMissing(path.join(dir, ".azurance/llm/insurer-api.md"));
  await assertFileExists(path.join(dir, ".azurance/llm/openapi/provider-api-bff.openapi.yml"));
  await assertFileMissing(path.join(dir, ".azurance/llm/openapi/insurer-bff.openapi.yml"));
});

test("insurer target excludes provider files", async () => {
  const dir = await tempDir();

  await installAzuranceContext({ target: "insurer", dir, force: false, dryRun: false });

  await assertFileExists(path.join(dir, ".azurance/llm/insurer-api.md"));
  await assertFileMissing(path.join(dir, ".azurance/llm/provider-api.md"));
  await assertFileExists(path.join(dir, ".azurance/llm/openapi/insurer-bff.openapi.yml"));
  await assertFileMissing(path.join(dir, ".azurance/llm/openapi/provider-api-bff.openapi.yml"));
});

test("appends a managed Azurance section when AGENTS.md exists", async () => {
  const dir = await tempDir();
  const agentsPath = path.join(dir, "AGENTS.md");
  await fs.writeFile(agentsPath, "# Existing agent rules\n", "utf8");

  await installAzuranceContext({ target: "both", dir, force: false, dryRun: false });

  const agents = await fs.readFile(agentsPath, "utf8");
  assert.match(agents, /# Existing agent rules/);
  assert.match(agents, /azurance-llm:start/);
  assert.match(agents, /Azurance API Integration/);
});

test("force refreshes files managed by Azurance", async () => {
  const dir = await tempDir();
  const contextPath = path.join(dir, ".azurance/llm/context.md");

  await installAzuranceContext({ target: "both", dir, force: false, dryRun: false });
  await fs.writeFile(contextPath, "stale", "utf8");

  await installAzuranceContext({ target: "both", dir, force: true, dryRun: false });

  const context = await fs.readFile(contextPath, "utf8");
  assert.match(context, /Azurance LLM Context/);
});

test("dry run does not create files", async () => {
  const dir = await tempDir();

  const result = await installAzuranceContext({ target: "both", dir, force: false, dryRun: true });

  assert.equal(result.dryRun, true);
  await assertFileMissing(path.join(dir, "AGENTS.md"));
  await assertFileMissing(path.join(dir, ".azurance/llm/context.md"));
});

async function tempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), "azurance-llm-"));
}

async function assertFileExists(filePath) {
  const stat = await fs.stat(filePath);
  assert.equal(stat.isFile(), true);
}

async function assertFileMissing(filePath) {
  await assert.rejects(fs.stat(filePath), { code: "ENOENT" });
}
