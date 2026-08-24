import readline from "node:readline/promises";
import path from "node:path";

import {
  VALID_AGENTS,
  VALID_INSTALLS,
  VALID_SCOPES,
  VALID_TARGETS,
  detectInstallations,
  installAzurance,
  installAzuranceContext
} from "./installer.js";

export { detectInstallations, installAzurance, installAzuranceContext } from "./installer.js";

export async function runCli(argv, io = process) {
  let options = parseArgs(argv);

  if (options.help) {
    io.stdout.write(helpText());
    return;
  }

  if (options.menu || (argv.length === 0 && io.stdin?.isTTY && io.stdout?.isTTY)) {
    options = await interactiveOptions(io, options);
    if (!options) {
      return;
    }
  }

  if (options.status) {
    const projectDir = resolveProjectDir(options.dir);
    const installations = await detectInstallations(projectDir, options.homeDir);
    io.stdout.write(formatStatus(projectDir, installations));
    return;
  }

  const result = await installAzurance(options);
  io.stdout.write(formatResult(result));
}

export function parseArgs(argv) {
  const options = {
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

    if (arg === "--update") {
      options.update = true;
      options.force = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--menu") {
      options.menu = true;
      continue;
    }

    if (arg === "--status" || arg === "doctor") {
      options.status = true;
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

    let handledNamedOption = false;
    for (const [name, key] of [
      ["--install", "install"],
      ["--agent", "agent"],
      ["--scope", "scope"]
    ]) {
      if (arg === name) {
        options[key] = readValue(argv, index, name);
        index += 1;
        handledNamedOption = true;
        break;
      }

      if (arg.startsWith(`${name}=`)) {
        options[key] = arg.slice(name.length + 1);
        handledNamedOption = true;
        break;
      }
    }

    if (handledNamedOption) {
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  validateOptions(options);
  return options;
}

function validateOptions(options) {
  if (!VALID_TARGETS.has(options.target)) {
    throw new Error("--target must be provider, insurer, or both");
  }

  if (!VALID_INSTALLS.has(options.install)) {
    throw new Error("--install must be context, skill, adapter, or all");
  }

  if (!VALID_AGENTS.has(options.agent)) {
    throw new Error("--agent must be codex, claude, windsurf, cursor, generic, or all");
  }

  if (!VALID_SCOPES.has(options.scope)) {
    throw new Error("--scope must be project, global, or both");
  }
}

async function interactiveOptions(io, baseOptions) {
  const prompt = readline.createInterface({ input: io.stdin, output: io.stdout });

  try {
    io.stdout.write("\nAzurance LLM Kit\n=================\n");
    io.stdout.write("1. Installer le contexte projet et les skills multi-agents\n");
    io.stdout.write("2. Installer les skills globaux\n");
    io.stdout.write("3. Choisir un agent et une portée\n");
    io.stdout.write("4. Mettre à jour les installations existantes\n");
    io.stdout.write("5. Diagnostiquer les installations\n");
    io.stdout.write("0. Quitter\n\n");

    const choice = await prompt.question("Choix [1] : ");
    const selected = choice.trim() || "1";

    if (selected === "0") {
      return null;
    }

    if (selected === "5") {
      return { ...baseOptions, status: true };
    }

    const target = await askChoice(prompt, "Périmètre API", "both", ["provider", "insurer", "both"]);

    if (selected === "1") {
      return { ...baseOptions, target, install: "all", agent: "all", scope: "project" };
    }

    if (selected === "2") {
      return { ...baseOptions, target, install: "skill", agent: "all", scope: "global" };
    }

    if (selected === "3") {
      const agent = await askChoice(prompt, "Agent", "all", ["codex", "claude", "windsurf", "cursor", "generic", "all"]);
      const scope = await askChoice(prompt, "Portée", "project", ["project", "global", "both"]);
      const install = agent === "cursor" || agent === "generic" ? "adapter" : "skill";
      return { ...baseOptions, target, install, agent, scope };
    }

    if (selected === "4") {
      return { ...baseOptions, target, update: true, force: true, agent: "all", scope: "both" };
    }

    throw new Error("Choix invalide");
  } finally {
    prompt.close();
  }
}

async function askChoice(prompt, label, fallback, values) {
  const answer = await prompt.question(`${label} [${fallback}] (${values.join("/")}) : `);
  const value = answer.trim() || fallback;
  if (!values.includes(value)) {
    throw new Error(`${label} invalide: ${value}`);
  }
  return value;
}

export function formatResult(result) {
  const mode = result.dryRun ? "Dry run" : result.install === "update" ? "Updated" : "Installed";
  const lines = [`${mode} Azurance context`, `Project: ${result.projectDir}`];

  if (result.agent) {
    lines.push(`Agent: ${result.agent}`, `Scope: ${result.scope}`);
  }

  for (const action of result.actions) {
    const suffix = action.reason ? ` (${action.reason})` : "";
    const scope = action.scope ? ` [${action.scope}]` : "";
    lines.push(`- ${action.status}${scope}: ${action.file ?? "installation"}${suffix}`);
  }

  lines.push("", "Next steps:");
  if (result.install === "update") {
    lines.push("- Relancer l'agent concerné; les fichiers gérés ont été rafraîchis.");
  } else if (result.install === "context") {
    lines.push("- Read AGENTS.md first, then the relevant files under .azurance/llm/.");
  } else {
    lines.push("- Ask your coding agent to use the azurance-api skill.");
    lines.push("- Read only the relevant references/ files inside the installed skill.");
  }

  return `${lines.join("\n")}\n`;
}

export function formatStatus(projectDir, installations) {
  const lines = [`Azurance installation status`, `Project: ${projectDir}`];
  if (installations.length === 0) {
    lines.push("- No installation detected.");
  } else {
    for (const installation of installations) {
      lines.push(`- ${installation.scope} / ${installation.agent}: ${installation.path}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export function helpText() {
  return `Usage: azurance-llm [options]\n\n` +
    `With no arguments in a terminal, the interactive installer menu is shown.\n` +
    `In CI/non-interactive shells, the legacy project context install is preserved.\n\n` +
    `Options:\n` +
    `  --install <context|skill|adapter|all>  What to install (default: context)\n` +
    `  --agent <codex|claude|windsurf|cursor|generic|all>\n` +
    `  --scope <project|global|both>           Installation scope (default: project)\n` +
    `  --target <provider|insurer|both>         API surface (default: both)\n` +
    `  --dir <path>                             Project directory (default: .)\n` +
    `  --update                                 Refresh detected Azurance files\n` +
    `  --force                                  Replace existing managed files\n` +
    `  --status                                 Show detected project/global installs\n` +
    `  --menu                                   Open the interactive installer\n` +
    `  --dry-run                                Preview without writing files\n` +
    `  --help                                   Show this help\n\n` +
    `Examples:\n` +
    `  npx azurance-llm --install all --agent all\n` +
    `  npx azurance-llm --install skill --agent claude --scope global\n` +
    `  npx azurance-llm --update --agent all --scope both\n`;
}

function resolveProjectDir(dir) {
  return path.resolve(process.cwd(), dir);
}

function readValue(argv, index, optionName) {
  const value = argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${optionName} requires a value`);
  }

  return value;
}
