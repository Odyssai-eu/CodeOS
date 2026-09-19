# Context: the wired-in MCP servers

coeos-code doesn't code in a vacuum: three MCP servers give it automatic access to
your knowledge and your documents. Nothing to configure — they're wired in out
of the box.

## What's connected

| MCP | What it gives you | Where it runs |
|---|---|---|
| **rag** | Semantic search over your Qdrant store (`alpha_centauri` corpus + `obsidian-context` vault) | .44:8086 |
| **graphify** | The code graph of your stack: `graphify_explain` (where a symbol lives + its neighborhood) and `graphify_path` (shortest path between two symbols) | local (`~/.codeos/mcp/`) |
| **docling** | Converts a document (PDF, DOCX, PPTX, XLSX, CSV, HTML) into Markdown so it can be pulled into context | .44:8087 |

## How to use them

You never invoke a tool by hand: ask in plain language and coeos-code picks the
right one. coeos-code is English-only, but it answers in whatever language you
write in. Examples:

- "search my store for what we decided about the LightRAG shards" → **rag**
- "where is the CoeOS provider defined and who calls it?" → **graphify**
- "summarize this PDF: https://…" → **docling**

## Prerequisites

These MCP servers live on the LAN, so coeos-code needs macOS **local network**
permission (requested on first launch). If an MCP stops responding, that
permission is usually the cause — see [[Depannage|Troubleshooting]].

## Note

The qdrant MCP at `.44:8085` (the Companion's memory) is **deliberately not**
connected: wrong corpus plus a write tool would risk cross-project pollution.

See also: [[Memoire-et-Docs|Memory and Docs]] · [[Depannage|Troubleshooting]]
