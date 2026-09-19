#!/usr/bin/env python3
"""MCP stdio server pour Odybench — expose les primitives de bench (seam
odybench-api:4710) aux agents de l'app packagée. Stdlib uniquement.

Pourquoi MCP et pas un tool opencode : un tool custom (.ts / plugin) exige zod
resolu au chargement, ce qu'une app packagee ne fournit pas a un fichier
materialise. MCP = tools en JSON-schema, chargement fiable (meme voie que
graphify_mcp.py). Le vrai travail (streaming, watchdog, scoring) vit dans
odybench-api ; ici on ne fait que des appels HTTP.

Framing stdio = JSON-RPC newline-delimited ; ne JAMAIS ecrire autre chose sur
stdout."""
import json
import os
import urllib.request
import sys

API = os.environ.get("ODYBENCH_API_URL", "http://localhost:4710").rstrip("/")
BASE = os.environ.get("ODYSSAI_BASE", "http://localhost:8000/v1")
SUPPORTED = {"2024-11-05", "2025-03-26", "2025-06-18"}
TIMEOUT = int(os.environ.get("ODYBENCH_MCP_TIMEOUT", "1800"))

TOOLS = [
    {"name": "engine_models",
     "description": "Liste les modeles publies par OdyssAI-x avec leur etat de chargement (loaded). "
                    "Sert a savoir ce qui est pret avant de bencher (evite le 404 'not loaded'). "
                    "Les modeles cloud sont publies en 'or:...' sur le meme endpoint.",
     "inputSchema": {"type": "object",
                     "properties": {"only_loaded": {"type": "boolean", "description": "ne retourner que les charges"}}}},
    {"name": "ensure_loaded",
     "description": "Garantit qu'un modele SOUS TEST est charge sur le moteur avant ses tests. "
                    "Le pool tient un modele a la fois (charger = swap) : charge un modele UNE fois, "
                    "fais TOUS ses tests, puis passe au suivant. Idempotent.",
     "inputSchema": {"type": "object",
                     "properties": {"model": {"type": "string", "description": "id moteur du modele"},
                                    "mode": {"type": "string", "enum": ["pipeline", "tensor"]},
                                    "nodes": {"type": "integer"}},
                     "required": ["model"]}},
    {"name": "run_test",
     "description": "Execute UN test d'un modele sous test. Ecrit la reponse + _meta et classe le resultat : "
                    "ok | empty | truncated | loop | failed | fatal. Adaptation (1x max) : truncated -> +max_tokens ; "
                    "empty (reasoning present) -> thinking off ; loop -> temperature basse + repetition_penalty ; "
                    "failed/fatal -> NE PAS relancer.",
     "inputSchema": {"type": "object",
                     "properties": {"bench": {"type": "string", "description": "ex. 'Bench C', 'Bench P'"},
                                    "model": {"type": "string"},
                                    "test": {"type": "string", "description": "ex. 'c03', 'p04'"},
                                    "max_tokens": {"type": "integer"},
                                    "thinking": {"type": "string", "enum": ["on", "off"]},
                                    "temperature": {"type": "number"},
                                    "repetition_penalty": {"type": "number"}},
                     "required": ["bench", "model", "test"]}},
    {"name": "classify",
     "description": "Re-classe une reponse deja sur disque : ok|empty|truncated|loop|failed|fatal|missing. Sans relancer.",
     "inputSchema": {"type": "object",
                     "properties": {"bench": {"type": "string"}, "model": {"type": "string"}, "test": {"type": "string"}},
                     "required": ["bench", "model", "test"]}},
    {"name": "bench_tests",
     "description": "Liste les ids de test d'un bench (ex. 'Bench P' -> p01..p04).",
     "inputSchema": {"type": "object", "properties": {"bench": {"type": "string"}}, "required": ["bench"]}},
    {"name": "sweep",
     "description": "Rapport d'erreurs MECANIQUE d'un (bench, modele) : statut de CHAQUE test sur disque. "
                    "C'est la source de verite du rapport de campagne, jamais la narration.",
     "inputSchema": {"type": "object",
                     "properties": {"bench": {"type": "string"}, "model": {"type": "string"}},
                     "required": ["bench", "model"]}},
    {"name": "ag_run",
     "description": "Lance Bench AG (bench agentique a boucle executee, scoring MECANIQUE, aucun juge LLM) sur un "
                    "modele. Le modele DOIT supporter les tool calls. Long (jusqu'a 90 instances x reps).",
     "inputSchema": {"type": "object",
                     "properties": {"model": {"type": "string"},
                                    "tests": {"type": "string", "description": "ex. 'g01,e04' (defaut: toutes)"},
                                    "reps": {"type": "integer"}},
                     "required": ["model"]}},
]


def _http(method, path, payload=None, query=""):
    url = API + path + query
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"content-type": "application/json"} if data else {})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.loads(r.read().decode())


def call(name, a):
    from urllib.parse import quote
    if name == "engine_models":
        d = _http("GET", "/models", query=f"?base={quote(BASE)}")
        ms = d.get("models", [])
        if a.get("only_loaded"):
            ms = [m for m in ms if m.get("loaded")]
        return "\n".join(f"{m['id']} [{'loaded' if m.get('loaded') else 'unloaded'}] "
                         f"pool={m.get('pool')} tools={'y' if m.get('supports_tools') else 'n'}" for m in ms)
    if name == "ensure_loaded":
        d = _http("POST", "/ensure_loaded", {"base": BASE, "model": a["model"],
                                             "mode": a.get("mode"), "nodes": a.get("nodes")})
        return f"ensure_loaded {d.get('model')} -> loaded={d.get('loaded')} ({d.get('action')})"
    if name == "run_test":
        s = {k: a[k] for k in ("max_tokens", "thinking", "temperature", "repetition_penalty") if a.get(k) is not None}
        d = _http("POST", "/run_test", {"base": BASE, "bench": a["bench"], "model": a["model"],
                                        "test": a["test"], "settings": s})
        if d.get("error"):
            return f"run_test ERREUR: {d['error']}"
        return (f"run_test {d.get('test')} / {d.get('model')} -> status={d.get('status')} "
                f"finish={d.get('finish_reason')} tokens={d.get('output_tokens')}")
    if name == "classify":
        d = _http("POST", "/classify", {"bench": a["bench"], "model": a["model"], "test": a["test"]})
        return f"classify {d.get('test')} / {d.get('model')} -> {d.get('status')}"
    if name == "bench_tests":
        d = _http("GET", "/tests", query=f"?bench={quote(a['bench'])}")
        return f"{a['bench']}: {', '.join(d.get('tests', []))}"
    if name == "sweep":
        d = _http("POST", "/sweep", {"bench": a["bench"], "model": a["model"]})
        bad = ", ".join(f"{r['test']}:{r['status']}" for r in d.get("bad", [])) or "aucun"
        return f"sweep {a['bench']} / {a['model']} -> {d.get('ok')}/{d.get('n')} ok ; a traiter: {bad}"
    if name == "ag_run":
        d = _http("POST", "/ag_run", {"base": BASE, "model": a["model"],
                                      "tests": a.get("tests"), "reps": a.get("reps")})
        return f"ag_run {d.get('model')} -> ok={d.get('ok')} ; {d.get('n_scored')} tache(s) scoree(s)"
    raise ValueError(f"outil inconnu: {name}")


def reply(id_, result=None, error=None):
    msg = {"jsonrpc": "2.0", "id": id_}
    msg["error" if error is not None else "result"] = error if error is not None else result
    sys.stdout.write(json.dumps(msg) + "\n")
    sys.stdout.flush()


def handle(req):
    method, id_ = req.get("method"), req.get("id")
    if method == "initialize":
        v = (req.get("params") or {}).get("protocolVersion", "2025-03-26")
        reply(id_, {"protocolVersion": v if v in SUPPORTED else "2025-03-26",
                    "capabilities": {"tools": {}}, "serverInfo": {"name": "odybench", "version": "0.1.0"}})
    elif (method or "").startswith("notifications/"):
        return
    elif method == "ping":
        reply(id_, {})
    elif method == "tools/list":
        reply(id_, {"tools": TOOLS})
    elif method == "tools/call":
        params = req.get("params") or {}
        try:
            text = call(params.get("name"), params.get("arguments") or {})
            reply(id_, {"content": [{"type": "text", "text": text}], "isError": False})
        except Exception as e:
            reply(id_, {"content": [{"type": "text", "text": f"ERREUR: {e}"}], "isError": True})
    elif id_ is not None:
        reply(id_, error={"code": -32601, "message": f"methode non supportee: {method}"})


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except json.JSONDecodeError:
            continue
        try:
            handle(req)
        except Exception as e:
            if isinstance(req, dict) and req.get("id") is not None:
                reply(req["id"], error={"code": -32603, "message": str(e)})


if __name__ == "__main__":
    main()
