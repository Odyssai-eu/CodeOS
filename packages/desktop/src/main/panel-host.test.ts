import { describe, expect, test } from "bun:test"
import { COEOS_DEFAULT_CONFIG } from "./coeos-config"

// WU3 (MCP panel review) : garde read-only structurelle de panel-host.
// Le grill MiniMax a exigé ces asserts (F4, F6) : sans eux, un changement de
// config pourrait rendre le panel écrivain (fuite silencieuse) ou casser
// l'ordre des clés task et faire un faux positif au test « écriture refusée ».

const agents = COEOS_DEFAULT_CONFIG.agent as Record<string, Record<string, unknown>>

describe("panel-host (garde read-only du panel MCP)", () => {
  const host = agents["panel-host"]

  test("existe, primary, caché", () => {
    expect(host).toBeDefined()
    expect(host.mode).toBe("primary")
    expect(host.hidden).toBe(true)
  })

  test("n'écrit jamais : edit/write/bash deny", () => {
    const perm = host.permission as Record<string, unknown>
    expect(perm.edit).toBe("deny")
    expect(perm.write).toBe("deny")
    expect(perm.bash).toBe("deny")
  })

  test('F6 : "*": "deny" est la PREMIÈRE clé de task (piège Permission.disabled, fix 3eacc8503)', () => {
    const perm = host.permission as Record<string, unknown>
    const task = perm.task as Record<string, string>
    const keys = Object.keys(task)
    expect(keys[0]).toBe("*")
    expect(task["*"]).toBe("deny")
  })

  test("ne dispatche que les trois critiques du panel", () => {
    const task = (host.permission as Record<string, unknown>).task as Record<string, string>
    expect(task.direct).toBe("allow")
    expect(task.alternative).toBe("allow")
    expect(task.sceptique).toBe("allow")
    // aucun autre allow (executor, general, etc. tombent sur "*": "deny")
    const allowed = Object.entries(task).filter(([, v]) => v === "allow").map(([k]) => k)
    expect(allowed.sort()).toEqual(["alternative", "direct", "sceptique"])
  })

  test("steps >= 10 (dispatch 3 + synthèse, B6)", () => {
    expect(host.steps as number).toBeGreaterThanOrEqual(10)
  })

  test("F4 : la command panel n'a pas de champ agent (sinon l'override MCP est ignoré)", () => {
    const panel = (COEOS_DEFAULT_CONFIG.command as Record<string, Record<string, unknown>>).panel
    expect(panel.agent).toBeUndefined()
  })
})

describe("grill-host (opérateur dédié de grill_review — décision 2026-07-23)", () => {
  const host = agents["grill-host"]

  test("existe, primary, caché", () => {
    expect(host).toBeDefined()
    expect(host.mode).toBe("primary")
    expect(host.hidden).toBe(true)
  })

  test("n'écrit jamais : edit/write/bash deny", () => {
    const perm = host.permission as Record<string, unknown>
    expect(perm.edit).toBe("deny")
    expect(perm.write).toBe("deny")
    expect(perm.bash).toBe("deny")
  })

  test('"*": "deny" est la PREMIÈRE clé de task', () => {
    const task = (host.permission as Record<string, unknown>).task as Record<string, string>
    expect(Object.keys(task)[0]).toBe("*")
    expect(task["*"]).toBe("deny")
  })

  test("ne dispatche que grill-reviewer + sceptique (le grill sur son modèle, le sceptique sur le sien)", () => {
    const task = (host.permission as Record<string, unknown>).task as Record<string, string>
    const allowed = Object.entries(task).filter(([, v]) => v === "allow").map(([k]) => k)
    expect(allowed.sort()).toEqual(["grill-reviewer", "sceptique"])
  })

  test("grill-reviewer reste cross-modèle (MiniMax pinné, décision gelée 2026-07-15)", () => {
    const grill = agents["grill-reviewer"]
    expect(String(grill.model)).toContain("Minimax")
    // et jamais routé par compétence : pas d'entrée manifeste pour lui
  })

  test("routé par rôle (pas le modèle virtuel CoeOS misroutable) : clé grill-host dans ROLE_MANIFEST_KEY", () => {
    // ROLE_MANIFEST_KEY n'est pas exporté ; on vérifie le contrat observable :
    // le modèle statique est CoeOS mais l'affectation console le remplace via
    // la clé "grill-host" -> codeos-orchestrator (asserté par lecture source).
    const source = require("node:fs").readFileSync(require.resolve("./coeos-config.ts"), "utf8") as string
    expect(source).toMatch(/"grill-host":\s*"codeos-orchestrator"/)
  })
})
