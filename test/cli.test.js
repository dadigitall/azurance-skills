import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  detectInstallations,
  installAzurance,
  installAzuranceContext,
  parseArgs
} from "../lib/cli.js";

test("parseArgs applies defaults", () => {
  assert.deepEqual(parseArgs([]), {
    target: "both",
    dir: ".",
    force: false,
    dryRun: false,
    install: "context",
    agent: "generic",
    scope: "project",
    update: false,
    menu: false,
    status: false,
    help: false
  });
});

test("parseArgs supports agent, scope, install, and update options", () => {
  assert.deepEqual(parseArgs([
    "--install", "skill",
    "--agent=claude",
    "--scope", "global",
    "--target=insurer",
    "--update"
  ]), {
    target: "insurer",
    dir: ".",
    force: true,
    dryRun: false,
    install: "skill",
    agent: "claude",
    scope: "global",
    update: true,
    menu: false,
    status: false,
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
  await assertFileExists(path.join(dir, ".azurance/llm/openapi/provider-api.openapi.yml"));
  await assertFileExists(path.join(dir, ".azurance/llm/openapi/insurer-api.openapi.yml"));
});

test("provider target excludes insurer files", async () => {
  const dir = await tempDir();

  await installAzuranceContext({ target: "provider", dir, force: false, dryRun: false });

  await assertFileExists(path.join(dir, ".azurance/llm/provider-api.md"));
  await assertFileMissing(path.join(dir, ".azurance/llm/insurer-api.md"));
  await assertFileExists(path.join(dir, ".azurance/llm/openapi/provider-api.openapi.yml"));
  await assertFileMissing(path.join(dir, ".azurance/llm/openapi/insurer-api.openapi.yml"));
});

test("insurer target excludes provider files", async () => {
  const dir = await tempDir();

  await installAzuranceContext({ target: "insurer", dir, force: false, dryRun: false });

  await assertFileExists(path.join(dir, ".azurance/llm/insurer-api.md"));
  await assertFileMissing(path.join(dir, ".azurance/llm/provider-api.md"));
  await assertFileExists(path.join(dir, ".azurance/llm/openapi/insurer-api.openapi.yml"));
  await assertFileMissing(path.join(dir, ".azurance/llm/openapi/provider-api.openapi.yml"));
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

test("installs standard skill directories and the Cursor bridge", async () => {
  const dir = await tempDir();
  const home = await tempDir();

  await installAzurance({
    target: "both",
    dir,
    homeDir: home,
    install: "all",
    agent: "all",
    scope: "project",
    force: false,
    dryRun: false
  });

  await assertFileExists(path.join(dir, ".agents/skills/azurance-api/SKILL.md"));
  await assertFileExists(path.join(dir, ".agents/skills/azurance-api/references/openapi/provider-api.openapi.yml"));
  await assertFileExists(path.join(dir, ".claude/skills/azurance-api/SKILL.md"));
  await assertFileExists(path.join(dir, ".windsurf/skills/azurance-api/SKILL.md"));
  await assertFileExists(path.join(dir, ".cursor/rules/azurance-api.mdc"));
});

test("installs global skills under the selected agent roots", async () => {
  const dir = await tempDir();
  const home = await tempDir();

  await installAzurance({
    target: "provider",
    dir,
    homeDir: home,
    install: "skill",
    agent: "all",
    scope: "global",
    force: false,
    dryRun: false
  });

  await assertFileExists(path.join(home, ".agents/skills/azurance-api/SKILL.md"));
  await assertFileExists(path.join(home, ".claude/skills/azurance-api/SKILL.md"));
  await assertFileExists(path.join(home, ".codeium/windsurf/skills/azurance-api/SKILL.md"));
  await assertFileMissing(path.join(home, ".agents/skills/azurance-api/references/insurer-api.md"));
});

test("update refreshes an existing skill without touching unrelated files", async () => {
  const dir = await tempDir();

  await installAzurance({
    target: "both",
    dir,
    install: "skill",
    agent: "codex",
    scope: "project",
    force: false,
    dryRun: false
  });

  const skillPath = path.join(dir, ".agents/skills/azurance-api/SKILL.md");
  const personalPath = path.join(dir, "notes.txt");
  await fs.writeFile(skillPath, "stale skill", "utf8");
  await fs.writeFile(personalPath, "keep me", "utf8");

  const result = await installAzurance({
    target: "both",
    dir,
    install: "all",
    agent: "codex",
    scope: "project",
    update: true,
    force: true,
    dryRun: false
  });

  assert.equal(result.install, "update");
  assert.match(await fs.readFile(skillPath, "utf8"), /name: azurance-api/);
  assert.equal(await fs.readFile(personalPath, "utf8"), "keep me");
});

test("status detects project and global skill installations", async () => {
  const dir = await tempDir();
  const home = await tempDir();

  await installAzurance({
    dir,
    homeDir: home,
    install: "skill",
    agent: "claude",
    scope: "both",
    force: false,
    dryRun: false
  });

  const installations = await detectInstallations(dir, home);
  assert.deepEqual(
    installations.map(({ agent, scope, kind }) => ({ agent, scope, kind })),
    [
      { agent: "claude", scope: "project", kind: "skill" },
      { agent: "claude", scope: "global", kind: "skill" }
    ]
  );
});

test("generic adapter preserves existing project rules", async () => {
  const dir = await tempDir();
  const claudePath = path.join(dir, "CLAUDE.md");
  await fs.writeFile(claudePath, "# My rules\n", "utf8");

  await installAzurance({
    dir,
    install: "adapter",
    agent: "generic",
    scope: "project",
    force: false,
    dryRun: false
  });

  const content = await fs.readFile(claudePath, "utf8");
  assert.match(content, /# My rules/);
  assert.match(content, /azurance-llm:start/);
  await assertFileExists(path.join(dir, "GEMINI.md"));
  await assertFileExists(path.join(dir, ".github/copilot-instructions.md"));
});

test("update detects and refreshes generic bridge files", async () => {
  const dir = await tempDir();

  await installAzurance({
    dir,
    install: "adapter",
    agent: "generic",
    scope: "project",
    force: false,
    dryRun: false
  });

  const bridgePath = path.join(dir, "CLAUDE.md");
  await fs.writeFile(bridgePath, "# Personal rules\n\n<!-- azurance-llm:start -->\nstale\n<!-- azurance-llm:end -->\n", "utf8");

  const installations = await detectInstallations(dir);
  assert.equal(installations.some(({ kind, path: detectedPath }) => kind === "bridge" && detectedPath === bridgePath), true);

  await installAzurance({
    dir,
    install: "all",
    agent: "generic",
    scope: "project",
    update: true,
    force: true,
    dryRun: false
  });

  const content = await fs.readFile(bridgePath, "utf8");
  assert.match(content, /canonical Azurance agent skill/);
  assert.match(content, /# Personal rules/);
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
