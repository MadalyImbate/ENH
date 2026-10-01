# MCP‑based Semantic Guardrails for GitHub PRs

This note shows how to enforce semantic guardrails on pull requests using the **Model Context Protocol (MCP)** so the GitHub App (or Action) can call a single MCP tool to decide whether a PR is coherent and policy‑compliant.

## Components
- **MCP server (`pr-guardrails`)** – exposes one tool `semantic_guardrail_check`.
- **LLM backend** – OpenAI `gpt-4o-mini` (cheap) or `gpt-4o` (higher quality).
- **GitHub Action / App worker** – invokes the MCP tool on every `pull_request` event and publishes a Check Run result.

## Server (TypeScript/Node, isolated package)
Create a new folder `mcp-guardrails/` with its own package so it does not touch the React Native app.

`mcp-guardrails/package.json`
```json
{
  "name": "pr-guardrails-mcp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.1.8",
    "openai": "^4.67.1"
  }
}
```

`mcp-guardrails/server.js`
```js
import { StdioServerTransport, Server } from "@modelcontextprotocol/sdk/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const defaultGuardrails = [
  "Do not remove auth/permission checks without replacement",
  "Do not disable logging/monitoring on sensitive flows",
  "If public API surface changes, require changelog + migration note",
  "Flag secrets or hard‑coded tokens",
  "Description must match code intent (no semantic drift)"
];

const server = new Server(
  {
    name: "pr-guardrails",
    version: "0.1.0",
    tools: [
      {
        name: "semantic_guardrail_check",
        description: "Evaluate a PR diff against semantic guardrails",
        inputSchema: {
          type: "object",
          required: ["diff"],
          properties: {
            diff: { type: "string", description: "Unified diff for the PR" },
            title: { type: "string", description: "PR title" },
            body: { type: "string", description: "PR description" },
            guardrails: {
              type: "array",
              items: { type: "string" },
              description: "Optional override list of guardrail rules"
            }
          }
        }
      }
    ]
  },
  new StdioServerTransport()
);

server.setHandler("semantic_guardrail_check", async ({ diff, title = "", body = "", guardrails }) => {
  const rules = guardrails?.length ? guardrails : defaultGuardrails;

  const system = [
    "You are a PR guardrail checker.",
    "Return JSON with keys: status(one of: pass, warn, fail), findings(list of strings), summary."
  ].join("\n");

  const user = [
    `PR title: ${title}`,
    `PR body: ${body}`,
    `Guardrails: ${rules.map((r, i) => `${i + 1}. ${r}`).join(" ")}`,
    "Diff:",
    diff
  ].join("\n\n");

  const response = await client.responses.create({
    model: "gpt-4o-mini",
    input: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "GuardrailResult",
        schema: {
          type: "object",
          required: ["status", "findings", "summary"],
          properties: {
            status: { type: "string", enum: ["pass", "warn", "fail"] },
            findings: { type: "array", items: { type: "string" } },
            summary: { type: "string" }
          }
        }
      }
    }
  });

  return response.output[0].content[0].text; // JSON string
});

server.start();
```

Run locally for smoke test:
```sh
cd mcp-guardrails
npm install
echo "dummy diff" | node server.js
```

## GitHub Action (client that calls the MCP tool)
Place this in `.github/workflows/semantic-guardrails.yml` in the GitHub App repo (not in the React Native app):
```yaml
name: semantic-guardrails
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Install MCP client deps
        run: npm install @modelcontextprotocol/client
      - name: Run MCP guardrails
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          DIFF=$(git diff origin/${{ github.base_ref }}...HEAD)
          node -e "import { Client, StdioClientTransport } from '@modelcontextprotocol/client';
const transport = new StdioClientTransport({ command: 'node', args: ['mcp-guardrails/server.js'] });
const client = new Client({ name: 'gha-client', version: '0.1.0' }, transport);
await client.connect();
const res = await client.callTool('semantic_guardrail_check', { diff: process.env.DIFF || '', title: process.env.PR_TITLE, body: process.env.PR_BODY });
console.log(res);"
```

Adapt the Check Run reporting (GitHub Status API) to block merges when `status` is `fail`.

## Why MCP here?
- The MCP server is **tool-only**: GitHub App/Action is just a client, so you can reuse the same guardrail service in local dev, CI, or ChatGPT/Claude.
- The protocol standardizes tool definitions and transports (stdio/WebSocket), making it easy to plug into existing agent stacks.

## Next steps
1. Move the Action file to the GitHub App repo and wire it to publish a Check Run.
2. Tune `defaultGuardrails` to your domain rules.
3. Switch model to `gpt-4o` if quality is insufficient.
4. Add unit tests by feeding known bad/good diffs into the MCP tool.
