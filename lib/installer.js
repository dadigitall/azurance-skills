import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const START_MARKER = "<!-- azurance-llm:start -->";
export const END_MARKER = "<!-- azurance-llm:end -->";

export const VALID_TARGETS = new Set(["provider", "insurer", "both"]);
export const VALID_AGENTS = new Set(["codex", "claude", "windsurf", "cursor", "generic", "all"]);
export const VALID_SCOPES = new Set(["project", "global", "both"]);
export const VALID_INSTALLS = new Set(["context", "skill", "adapter", "all"]);

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = path.join(packageRoot, "templates");

const SKILL_AGENTS = ["codex", "claude", "windsurf"];

const AGENT_ROOTS = {
  codex: {
    project: ".agents/skills",
    global: ".agents/skills"
  },
  claude: {
    project: ".claude/skills",
    global: ".claude/skills"
  },
  windsurf: {
    project: ".windsurf/skills",
    global: ".codeium/windsurf/skills"
  }
};

const GENERIC_BRIDGES = [
  "CLAUDE.md",
  "GEMINI.md",
  ".github/copilot-instructions.md"
];

export function normalizeOptions(options = {}) {
  return {
    target: options.target ?? "both",
    dir: options.dir ?? ".",
    force: options.force ?? false,
    dryRun: options.dryRun ?? false,
    install: options.install ?? "context",
    agent: options.agent ?? "generic",
    scope: options.scope ?? "project",
    update: options.update ?? false,
    homeDir: options.homeDir ?? os.homedir()
  };
}

export async function installAzuranceContext(options = {}) {
  const normalized = normalizeOptions(options);
  const projectDir = await resolveProjectDir(normalized);
  return installContext(projectDir, normalized);
}

export async function installAzurance(options = {}) {
  const normalized = normalizeOptions(options);
  const projectDir = await resolveProjectDir(normalized);

  if (normalized.update) {
    return updateExisting(projectDir, normalized);
  }

  const actions = [];

  if (normalized.install === "context" || normalized.install === "all") {
    if (normalized.install === "context" && normalized.scope === "global") {
      throw new Error("--install context is project-scoped; use --scope project or --install skill for a global skill");
    }

    if (normalized.scope !== "global") {
      actions.push(...(await installContext(projectDir, normalized)).actions);
    }
  }

  if (normalized.install === "skill" || normalized.install === "all") {
    actions.push(...(await installSkills(projectDir, normalized)));
  }

  if (normalized.install === "adapter" || normalized.install === "all") {
    actions.push(...(await installAdapters(projectDir, normalized)));
  }

  return {
    projectDir,
    target: normalized.target,
    install: normalized.install,
    agent: normalized.agent,
    scope: normalized.scope,
    dryRun: normalized.dryRun,
    actions
  };
}

export async function detectInstallations(projectDir, homeDir = os.homedir()) {
  const installations = [];

  const projectContext = path.join(projectDir, ".azurance/llm/context.md");
  const projectAgents = path.join(projectDir, "AGENTS.md");
  if (await pathExists(projectContext) || await hasManagedSection(projectAgents)) {
    installations.push({ id: "context", agent: "generic", scope: "project", kind: "context", path: projectContext });
  }

  for (const agent of SKILL_AGENTS) {
    const skillPath = path.join(projectDir, AGENT_ROOTS[agent].project, "azurance-api", "SKILL.md");
    if (await pathExists(skillPath)) {
      installations.push({ id: `${agent}:project`, agent, scope: "project", kind: "skill", path: skillPath });
    }
  }

  const cursorPath = path.join(projectDir, ".cursor/rules/azurance-api.mdc");
  if (await pathExists(cursorPath)) {
    installations.push({ id: "cursor:project", agent: "cursor", scope: "project", kind: "cursor", path: cursorPath });
  }

  for (const relativeFile of GENERIC_BRIDGES) {
    const bridgePath = path.join(projectDir, relativeFile);
    if (await hasManagedSection(bridgePath)) {
      installations.push({
        id: `generic:${relativeFile}`,
        agent: "generic",
        scope: "project",
        kind: "bridge",
        path: bridgePath,
        relativeFile
      });
    }
  }

  for (const agent of SKILL_AGENTS) {
    const skillPath = path.join(homeDir, AGENT_ROOTS[agent].global, "azurance-api", "SKILL.md");
    if (await pathExists(skillPath)) {
      installations.push({ id: `${agent}:global`, agent, scope: "global", kind: "skill", path: skillPath });
    }
  }

  return installations;
}

export async function installDetected(options = {}) {
  const normalized = normalizeOptions({ ...options, update: true });
  const projectDir = await resolveProjectDir(normalized);
  return updateExisting(projectDir, normalized);
}

export function agentRoots() {
  return structuredClone(AGENT_ROOTS);
}

async function resolveProjectDir(options) {
  const projectDir = path.resolve(process.cwd(), options.dir);
  await ensureProjectDirectory(projectDir);
  return projectDir;
}

async function installContext(projectDir, options) {
  const actions = [];

  for (const file of contextFilesForTarget(options.target)) {
    actions.push(await copyTemplateFile(projectDir, file, options));
  }

  actions.push(await installAgentsFile(projectDir, options));

  return {
    projectDir,
    target: options.target,
    dryRun: options.dryRun,
    actions
  };
}

async function installSkills(projectDir, options) {
  const actions = [];
  const agents = selectedSkillAgents(options.agent);
  const scopes = selectedScopes(options.scope);

  for (const scope of scopes) {
    for (const agent of agents) {
      const baseDir = scope === "project" ? projectDir : options.homeDir;
      const root = path.join(baseDir, AGENT_ROOTS[agent][scope]);
      actions.push(...(await installSkillBundle(root, options)));
    }
  }

  if (options.agent === "cursor" || options.agent === "all") {
    if (scopes.includes("global")) {
      actions.push({
        status: "skipped",
        file: ".cursor/rules/azurance-api.mdc",
        scope: "global",
        reason: "Cursor rules are project-scoped"
      });
    }
  }

  return actions;
}

async function installAdapters(projectDir, options) {
  const actions = [];

  if (options.scope === "global") {
    return [{
      status: "skipped",
      scope: "global",
      reason: "Agent adapter files are project-scoped"
    }];
  }

  if (options.agent === "cursor" || options.agent === "all") {
    actions.push(await installCursorRule(projectDir, options));
  }

  if (options.agent === "generic") {
    for (const relativeFile of GENERIC_BRIDGES) {
      actions.push(await installBridgeFile(projectDir, relativeFile, options));
    }
  }

  return actions;
}

async function updateExisting(projectDir, options) {
  const detected = await detectInstallations(projectDir, options.homeDir);
  const selected = detected.filter((installation) => matchesSelection(installation, options));

  if (selected.length === 0) {
    return {
      projectDir,
      target: options.target,
      install: "update",
      agent: options.agent,
      scope: options.scope,
      dryRun: options.dryRun,
      actions: [{
        status: "skipped",
        reason: "No existing Azurance installation matched the selected agent and scope"
      }]
    };
  }

  const actions = [];
  const contextSelected = selected.some((installation) => installation.kind === "context");
  if (contextSelected) {
    actions.push(...(await installContext(projectDir, { ...options, force: true })).actions);
  }

  for (const installation of selected) {
    if (installation.kind === "skill") {
      const root = path.dirname(path.dirname(installation.path));
      actions.push(...(await installSkillBundle(root, { ...options, force: true })));
    }

    if (installation.kind === "cursor") {
      actions.push(await installCursorRule(projectDir, { ...options, force: true }));
    }

    if (installation.kind === "bridge") {
      actions.push(await installBridgeFile(projectDir, installation.relativeFile, { ...options, force: true }));
    }
  }

  return {
    projectDir,
    target: options.target,
    install: "update",
    agent: options.agent,
    scope: options.scope,
    dryRun: options.dryRun,
    actions
  };
}

function matchesSelection(installation, options) {
  const agentMatches = options.agent === "all"
    || options.agent === installation.agent
    || (options.agent === "generic" && installation.kind === "context");
  const scopeMatches = options.scope === "both" || options.scope === installation.scope;
  return agentMatches && scopeMatches;
}

function selectedSkillAgents(agent) {
  if (agent === "all") {
    return SKILL_AGENTS;
  }

  if (!SKILL_AGENTS.includes(agent)) {
    return [];
  }

  return [agent];
}

function selectedScopes(scope) {
  if (scope === "both") {
    return ["project", "global"];
  }

  return [scope];
}

async function installSkillBundle(root, options) {
  const files = [
    { from: "skill/SKILL.md", to: "azurance-api/SKILL.md" },
    { from: "skill/agents/openai.yaml", to: "azurance-api/agents/openai.yaml" },
    { from: "context.md", to: "azurance-api/references/context.md" }
  ];

  if (options.target === "provider" || options.target === "both") {
    files.push(
      { from: "provider-api.md", to: "azurance-api/references/provider-api.md" },
      { from: "openapi/provider-api.openapi.yml", to: "azurance-api/references/openapi/provider-api.openapi.yml" }
    );
  }

  if (options.target === "insurer" || options.target === "both") {
    files.push(
      { from: "insurer-api.md", to: "azurance-api/references/insurer-api.md" },
      { from: "openapi/insurer-api.openapi.yml", to: "azurance-api/references/openapi/insurer-api.openapi.yml" }
    );
  }

  return Promise.all(files.map((file) => copyTemplateFile(root, file, options)));
}

async function installCursorRule(projectDir, options) {
  return copyTemplateFile(projectDir, {
    from: "cursor/azurance-api.mdc",
    to: ".cursor/rules/azurance-api.mdc"
  }, options);
}

async function installBridgeFile(projectDir, relativeFile, options) {
  const file = {
    from: "AGENT.bridge.md",
    to: relativeFile
  };
  const destination = path.join(projectDir, relativeFile);
  const section = await fs.readFile(path.join(templateRoot, file.from), "utf8");
  const managedSection = `${START_MARKER}\n${section.trim()}\n${END_MARKER}\n`;
  const exists = await pathExists(destination);

  if (!exists) {
    if (!options.dryRun) {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, `${managedSection}\n`, "utf8");
    }

    return { status: "created", file: relativeFile };
  }

  const current = await fs.readFile(destination, "utf8");
  if (!current.includes(START_MARKER) || !current.includes(END_MARKER)) {
    const updated = `${current.trimEnd()}\n\n${managedSection}`;
    if (!options.dryRun) {
      await fs.writeFile(destination, updated, "utf8");
    }

    return { status: "updated", file: relativeFile, reason: "appended Azurance bridge" };
  }

  if (!options.force) {
    return { status: "skipped", file: relativeFile, reason: "Azurance section already exists; pass --update or --force to refresh" };
  }

  if (!options.dryRun) {
    await fs.writeFile(destination, replaceManagedSection(current, managedSection), "utf8");
  }

  return { status: "replaced", file: relativeFile };
}

async function copyTemplateFile(rootDir, file, options) {
  const source = path.join(templateRoot, file.from);
  const destination = path.join(rootDir, file.to);
  const exists = await pathExists(destination);

  if (exists && !options.force) {
    return {
      status: "skipped",
      file: path.relative(rootDir, destination),
      reason: "already exists; pass --update or --force to replace"
    };
  }

  if (!options.dryRun) {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
  }

  return {
    status: exists ? "replaced" : "created",
    file: path.relative(rootDir, destination)
  };
}

async function installAgentsFile(projectDir, options) {
  const relativeFile = "AGENTS.md";
  const agentsPath = path.join(projectDir, relativeFile);
  const section = await fs.readFile(path.join(templateRoot, "AGENTS.azurance.md"), "utf8");
  const managedSection = `${START_MARKER}\n${section.trim()}\n${END_MARKER}\n`;
  const exists = await pathExists(agentsPath);

  if (!exists) {
    if (!options.dryRun) {
      await fs.writeFile(agentsPath, `${managedSection}\n`, "utf8");
    }

    return { status: "created", file: relativeFile };
  }

  const current = await fs.readFile(agentsPath, "utf8");
  const hasSection = current.includes(START_MARKER) && current.includes(END_MARKER);

  if (hasSection && !options.force) {
    return { status: "skipped", file: relativeFile, reason: "Azurance section already exists; pass --update or --force to refresh" };
  }

  const updated = hasSection
    ? replaceManagedSection(current, managedSection)
    : `${current.trimEnd()}\n\n${managedSection}`;
  if (!options.dryRun) {
    await fs.writeFile(agentsPath, updated, "utf8");
  }

  return {
    status: hasSection ? "replaced" : "updated",
    file: relativeFile,
    ...(hasSection ? {} : { reason: "appended Azurance section" })
  };
}

function contextFilesForTarget(target) {
  const files = [{ from: "context.md", to: ".azurance/llm/context.md" }];

  if (target === "provider" || target === "both") {
    files.push(
      { from: "provider-api.md", to: ".azurance/llm/provider-api.md" },
      { from: "openapi/provider-api.openapi.yml", to: ".azurance/llm/openapi/provider-api.openapi.yml" }
    );
  }

  if (target === "insurer" || target === "both") {
    files.push(
      { from: "insurer-api.md", to: ".azurance/llm/insurer-api.md" },
      { from: "openapi/insurer-api.openapi.yml", to: ".azurance/llm/openapi/insurer-api.openapi.yml" }
    );
  }

  return files;
}

async function hasManagedSection(filePath) {
  if (!(await pathExists(filePath))) {
    return false;
  }

  const content = await fs.readFile(filePath, "utf8");
  return content.includes(START_MARKER) && content.includes(END_MARKER);
}

function replaceManagedSection(current, managedSection) {
  const start = current.indexOf(START_MARKER);
  const end = current.indexOf(END_MARKER);

  if (start === -1 || end === -1 || end < start) {
    return `${current.trimEnd()}\n\n${managedSection}`;
  }

  const before = current.slice(0, start).trimEnd();
  const after = current.slice(end + END_MARKER.length).trimStart();
  const prefix = before ? `${before}\n\n` : "";
  const suffix = after ? `\n${after}` : "";
  return `${prefix}${managedSection}${suffix}`;
}

async function ensureProjectDirectory(projectDir) {
  const stat = await fs.stat(projectDir).catch(() => null);

  if (!stat) {
    throw new Error(`Target directory does not exist: ${projectDir}`);
  }

  if (!stat.isDirectory()) {
    throw new Error(`Target path is not a directory: ${projectDir}`);
  }
}

async function pathExists(filePath) {
  return fs.access(filePath).then(
    () => true,
    () => false
  );
}
