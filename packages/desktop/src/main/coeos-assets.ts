// coeos-code — matérialise les assets embarqués (plugin session-doc, wrapper MCP graphify)
// vers ~/.odybench/ à CHAQUE démarrage (idempotent, écrase : la version app fait foi).
// Raison : OPENCODE_CONFIG_CONTENT ne résout pas les chemins relatifs
// (resolveLoadedPlugins n'est pas appelé pour les sources virtuelles) → il faut
// un file:// absolu stable sur la machine où tourne le sidecar.
import { mkdirSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import sessionDocSource from "./assets/coeos-session-doc.js?raw"
import sequencerSource from "./assets/codeos-sequencer.js?raw"
import axisSource from "./assets/codeos-axis.js?raw"
import graphifyMcpSource from "./assets/graphify_mcp.py?raw"
import odybenchMcpSource from "./assets/odybench_mcp.py?raw"
import { CODEOS_RULES } from "./coeos-config"

export type CodeosAssets = {
  sessionDocPluginUrl: string
  sequencerPluginUrl: string
  axisPluginUrl: string
  graphifyMcpPath: string
  odybenchMcpPath: string
  rulesPath: string
}

export function ensureCodeosAssets(): CodeosAssets {
  const root = join(homedir(), ".odybench")
  const pluginDir = join(root, "plugins")
  const mcpDir = join(root, "mcp")
  mkdirSync(pluginDir, { recursive: true })
  mkdirSync(mcpDir, { recursive: true })
  const pluginPath = join(pluginDir, "coeos-session-doc.js")
  writeFileSync(pluginPath, sessionDocSource)
  const sequencerPath = join(pluginDir, "codeos-sequencer.js")
  writeFileSync(sequencerPath, sequencerSource)
  const axisPath = join(pluginDir, "codeos-axis.js")
  writeFileSync(axisPath, axisSource)
  const graphifyPath = join(mcpDir, "graphify_mcp.py")
  writeFileSync(graphifyPath, graphifyMcpSource)
  const odybenchMcpPath = join(mcpDir, "odybench_mcp.py")
  writeFileSync(odybenchMcpPath, odybenchMcpSource)
  // Règles globales : le champ v1 `instructions` n'accepte QUE des chemins/URLs
  // (texte inline silencieusement ignoré — bug corrigé le 2026-07-07).
  const rulesPath = join(root, "RULES.md")
  writeFileSync(rulesPath, CODEOS_RULES)
  return {
    sessionDocPluginUrl: pathToFileURL(pluginPath).href,
    sequencerPluginUrl: pathToFileURL(sequencerPath).href,
    axisPluginUrl: pathToFileURL(axisPath).href,
    graphifyMcpPath: graphifyPath,
    odybenchMcpPath,
    rulesPath,
  }
}
