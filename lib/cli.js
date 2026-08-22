import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const START_MARKER = "<!-- azurance-llm:start -->";
const END_MARKER = "<!-- azurance-llm:end -->";
const VALID_TARGETS = new Set(["provider", "insurer", "both"]);

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = path.join(packageRoot, "templates");

export async function runCli(argv, io = process) {
  const options = parseArgs(argv);

  if (options.help) {
    io.stdout.write(helpText());
    return;
  }

  const result = await installAzuranceContext(options);
  io.stdout.write(formatResult(result));
}

export function parseArgs(argv) {
  const options = {
    target: "both",
    dir: ".",
    force: false,
    dryRun: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--target") {
      options.target = readValue(argv, index, "--target");
      index += 1;
      continue;
    }

    if (arg.startsWith("--target=")) {
      options.target = arg.slice("--target=".length);
      continue;
    }

    if (arg === "--dir") {
      options.dir = readValue(argv, index, "--dir");
      index += 1;
      continue;
    }

    if (arg.startsWith("--dir=")) {
      options.dir = arg.slice("--dir=".length);
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  if (!VALID_TARGETS.has(options.target)) {
    throw new Error("--target must be provider, insurer, or both");
  }

  return options;
}

export async function installAzuranceContext(options) {
  const projectDir = path.resolve(process.cwd(), options.dir);
  const files = filesForTarget(options.target);
  const actions = [];

  await ensureProjectDirectory(projectDir);

  for (const file of files) {
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

function filesForTarget(target) {
  const files = [
    {
      from: "context.md",
      to: ".azurance/llm/context.md"
    }
  ];

  if (target === "provider" || target === "both") {
    files.push(
      {
        from: "provider-api.md",
        to: ".azurance/llm/provider-api.md"
      },
      {
        from: "openapi/provider-api.openapi.yml",
        to: ".azurance/llm/openapi/provider-api.openapi.yml"
      }
    );
  }

  if (target === "insurer" || target === "both") {
    files.push(
      {
        from: "insurer-api.md",
        to: ".azurance/llm/insurer-api.md"
      },
      {
        from: "openapi/insurer-api.openapi.yml",
        to: ".azurance/llm/openapi/insurer-api.openapi.yml"
      }
    );
  }

  return files;
}

async function copyTemplateFile(projectDir, file, options) {
  const source = path.join(templateRoot, file.from);
  const destination = path.join(projectDir, file.to);
  const exists = await pathExists(destination);

  if (exists && !options.force) {
    return {
      status: "skipped",
      file: file.to,
      reason: "already exists; pass --force to replace"
    };
  }

  if (!options.dryRun) {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
  }

  return {
    status: exists ? "replaced" : "created",
    file: file.to
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

    return {
      status: "created",
      file: relativeFile
    };
  }

  const current = await fs.readFile(agentsPath, "utf8");
  const hasSection = current.includes(START_MARKER) && current.includes(END_MARKER);

  if (hasSection) {
    if (!options.force) {
      return {
        status: "skipped",
        file: relativeFile,
        reason: "Azurance section already exists; pass --force to refresh"
      };
    }

    const updated = replaceManagedSection(current, managedSection);
    if (!options.dryRun) {
      await fs.writeFile(agentsPath, updated, "utf8");
    }

    return {
      status: "replaced",
      file: relativeFile
    };
  }

  const updated = `${current.trimEnd()}\n\n${managedSection}`;
  if (!options.dryRun) {
    await fs.writeFile(agentsPath, updated, "utf8");
  }

  return {
    status: "updated",
    file: relativeFile,
    reason: "appended Azurance section"
  };
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

function readValue(argv, index, optionName) {
  const value = argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${optionName} requires a value`);
  }

  return value;
}

function formatResult(result) {
  const mode = result.dryRun ? "Dry run" : "Installed";
  const lines = [
    `${mode} Azurance LLM context in ${result.projectDir}`,
    `Target: ${result.target}`,
    ""
  ];

  for (const action of result.actions) {
    const reason = action.reason ? ` (${action.reason})` : "";
    lines.push(`- ${action.status}: ${action.file}${reason}`);
  }

  lines.push(
    "",
    "Next steps for your coding agent:",
    "- Read AGENTS.md first.",
    "- Then read .azurance/llm/context.md.",
    "- Use the OpenAPI files under .azurance/llm/openapi/ for endpoint details.",
    ""
  );

  return lines.join("\n");
}

function helpText() {
  return `azurance-llm

Install LLM-friendly context for Azurance public API integrations.

Usage:
  azurance-llm [--target provider|insurer|both] [--dir <path>] [--force] [--dry-run]

Options:
  --target   Integration surface to install. Defaults to both.
  --dir      Project directory to update. Defaults to current directory.
  --force    Replace files managed by azurance-llm.
  --dry-run  Show planned file operations without writing.
  --help     Show this help message.
`;
}
