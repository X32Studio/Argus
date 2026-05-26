# Model Context Protocol (MCP)

Primary site: https://modelcontextprotocol.io/
Spec (this record): https://modelcontextprotocol.io/specification/2025-06-18
Spec repo: https://github.com/modelcontextprotocol/modelcontextprotocol
Maintainer: Model Context Protocol — A Series of LF Projects, LLC (originally authored by Anthropic; transferred to Linux Foundation stewardship in 2025)
License: MIT (spec and reference implementations)
Wire format: JSON-RPC 2.0 over stdio or Streamable HTTP

> **Schema note.** This work is a PROTOCOL, not a framework. The framework record schema is reused with the substitutions called out in the iteration brief: `execution_kernel_pattern = "n/a — protocol, not framework"`, `multi_agent_support = none`, `tool_protocol = self`, etc.

## 1 What this work actually does

MCP standardizes how an LLM-powered host application talks to external context and tools. Concretely, it defines:

- **A three-role architecture.** *Host* is the LLM app that owns user trust and initiates connections (Claude Desktop, ChatGPT, VS Code Copilot Chat, an agent framework). *Clients* are connectors inside the host; each client maintains exactly one stateful session to one *server*. The host fans out to many clients; each client speaks to one server.
- **A JSON-RPC 2.0 message protocol** with an explicit `initialize → initialized → traffic → shutdown` lifecycle and **capability negotiation**: each side advertises which optional features it implements, and a peer MUST NOT use a feature the other side did not advertise.
- **Two standard transports** (as of 2025-06-18): **stdio** (client launches server as subprocess, newline-delimited JSON-RPC over stdin/stdout) and **Streamable HTTP** (one HTTP endpoint handling POST + GET, with optional SSE streams, session IDs via `Mcp-Session-Id`, resumability via `Last-Event-ID`). The earlier 2024-11-05 HTTP+SSE transport is deprecated. Custom transports are allowed if they preserve framing.
- **Three server-side primitives** with explicitly different control axes — `Resources` (application-controlled context), `Tools` (model-controlled actions), `Prompts` (user-controlled templates) — plus three client-side primitives the server can request — `Sampling` (server asks host to run an LLM completion), `Roots` (server asks host for filesystem/URI boundaries), `Elicitation` (server asks host to prompt the user).

The product framing on the official site is "USB-C for AI applications": one socket, many compliant peripherals. The technical framing is "LSP for LLM context": MCP explicitly cites the Language Server Protocol as design inspiration.

## 2 Technical mechanism

### 2.1 Roles and lifecycle

```
+-----------------------------+
| Host (LLM app, owns user)   |
|   +---------+   +---------+ |
|   | Client1 |   | Client2 | |
|   +----+----+   +----+----+ |
+--------|-------------|------+
         | stdio / HTTP |
         v             v
     +--------+     +--------+
     | Server1|     | Server2|
     +--------+     +--------+
```

Lifecycle:

1. Client connects on transport.
2. Client sends `initialize` with its supported protocol version + advertised client capabilities.
3. Server responds with negotiated version + advertised server capabilities.
4. Client sends `initialized` notification.
5. Normal JSON-RPC traffic; either side may send requests or notifications consistent with the negotiated capability set.
6. Either side may cancel a request via `CancelledNotification`; client may close session (HTTP DELETE on Streamable HTTP) or terminate the subprocess (stdio).

### 2.2 Transports — what the spec actually mandates

**stdio.** Client launches server as a subprocess. JSON-RPC messages are newline-delimited on stdin/stdout; UTF-8; no embedded newlines in a message; `stderr` is reserved for free-form logging. The spec says "Clients SHOULD support stdio whenever possible" — it's the lowest-attack-surface transport for local servers.

**Streamable HTTP.** One endpoint, two methods:

- `POST /mcp` carries each client→server JSON-RPC message. `Accept: application/json, text/event-stream`. Server replies with either a single JSON object or opens an SSE stream that eventually contains the JSON-RPC response.
- `GET /mcp` lets the client open a long-lived SSE stream for server-initiated requests/notifications.

Session state: optional `Mcp-Session-Id` header (cryptographically secure, ASCII-visible). Resumability: `Last-Event-ID` replay on reconnect. Protocol version: `MCP-Protocol-Version: 2025-06-18` header. Origin validation is **MUST** to block DNS-rebinding attacks against local servers — this is the single most underrated security clause in the spec.

The older 2024-11-05 HTTP+SSE transport (separate POST endpoint + GET-SSE) is deprecated; backwards-compat probing is documented but new servers should target Streamable HTTP only.

### 2.3 Capability surface — what each primitive *mechanically* does

| Primitive | Control axis | RPC methods | What it returns | What it enables |
|-----------|--------------|------------|------------------|------------------|
| Resources | application-controlled | `resources/list`, `resources/read`, `resources/subscribe`, `notifications/resources/updated` | Addressable URIs returning text or binary content blocks with MIME types | Inject files/DB rows/doc pages/git history into a turn; host (not model) decides what to attach |
| Tools | model-controlled | `tools/list`, `tools/call` | JSON-schema-validated input → content blocks (text/image/resource refs) + optional `structuredContent` | The function-calling surface; the LLM picks and invokes |
| Prompts | user-controlled | `prompts/list`, `prompts/get` | Parameterized message templates rendered into chat messages | Slash commands / menus; server-versioned, user-triggered workflows |
| Sampling (client) | server-initiated | `sampling/createMessage` | Server asks the host to run an LLM completion on its behalf; user must approve, user controls the prompt and what the server sees | A server can be "agentic" without bundling model credentials |
| Roots (client) | server-initiated | `roots/list` | Host advertises URI/filesystem boundaries the server may operate within | Workspace scoping |
| Elicitation (client) | server-initiated | `elicitation/create` | Server asks host to prompt user for additional input mid-session | Filling missing parameters interactively |

The control-axis column is load-bearing. Resources are app-controlled (host decides what to inject), Tools are model-controlled (LLM decides what to call), Prompts are user-controlled (human invokes by name). That tripartite split is the protocol's main design contribution beyond plain function-calling.

### 2.4 Security model

- **Trust boundary owned by the host.** Servers are untrusted by default; tool descriptions and annotations returned by servers are explicitly flagged as untrusted unless the server itself is.
- **Consent gates (SHOULD).** Hosts SHOULD obtain explicit user consent before (a) exposing user data to a server, (b) invoking any tool, (c) any sampling request. Spec cannot enforce — it codifies an obligation on host implementors.
- **Sampling visibility limits.** When a server asks the client to sample, the user controls the actual prompt and what subset of the result the server sees. This is the protocol's main answer to "what if the server is hostile."
- **Transport hardening.** Streamable HTTP servers MUST validate `Origin` (DNS rebinding), SHOULD bind to localhost for local use, SHOULD authenticate remote connections. Session IDs MUST be crypto-secure.
- **OAuth layer.** The 2025-06-18 revision adds an OAuth-based authorization story for HTTP transports (separate page); client features now include `DCR` (Dynamic Client Registration), `CIMD` (Client-Initiated Metadata Discovery), and OAuth client-credentials flows.

### 2.5 Governance

MCP was introduced by Anthropic in late 2024 and remained Anthropic-led through early 2025. In 2025 it was transferred to the Linux Foundation as **"Model Context Protocol — A Series of LF Projects, LLC"**. The `GOVERNANCE.md` in the spec repo states the project is a Series under LF Projects and that governance changes require LF Projects approval. Core Maintainers hold day-to-day decision rights. This is the single most consequential governance event in the agent-protocol space in 2025 — MCP is now neutral-stewarded infrastructure, not a vendor product.

## 3 Why it matters for the topic's stated goals

The topic explicitly tracks "interop protocols (MCP, A2A, ACP, OpenAI Agents handoff)" under the multi-agent coordination concept layer. MCP is the dominant member of that set by adoption — every framework in this graph has at least a client adapter. Recording it as a node (not just a referenced label) is necessary to:

1. **Pressure-test the uniformity claim.** The graph currently has 8 frameworks → MCP edges with no depth metadata. Section 2 below shows those edges are dramatically uneven in what's actually implemented.
2. **Surface the missing peers.** A2A and ACP are gap nodes; MCP's existence highlights their absence.
3. **Anchor the security discussion.** The control-axis tripartite split (Resources/Tools/Prompts) is the cleanest way to reason about which framework primitives bridge to which MCP primitives — most don't bridge the full set.

## 4 What is reusable

- **The three-role split** (host / client / server) is portable to any agent-tool architecture and cleanly separates "who owns user trust" from "who advertises capabilities."
- **Capability negotiation at initialize.** Each side declares supported features; future features are additive without breaking older peers. This is a much better baseline than monolithic versioning.
- **The control-axis tripartite** (user-controlled prompts / app-controlled resources / model-controlled tools) is a reusable mental model for any framework that wants more nuance than "everything is a tool."
- **Streamable HTTP transport shape.** Single endpoint, POST for client→server, optional SSE for server→client, resumable via `Last-Event-ID`. Better default than bespoke WebSocket designs.
- **Untrusted-by-default annotations.** The explicit "tool descriptions from servers MUST be treated as untrusted" clause is reusable as a security posture for any tool-protocol design.
- **stdio as the recommended local transport.** Subprocess + stdin/stdout has minimal attack surface for local-only servers.

## 5 What is not safely transferable

- **Treating MCP as an inter-agent protocol.** It isn't. MCP is host↔server. Peer agent coordination needs A2A / ACP / framework-native handoff. Reading MCP as "the agent protocol" leads to misuse.
- **Assuming the spec enforces security.** All security clauses are SHOULD-level for hosts. A misbehaving host can ignore them; the wire format cannot police consent.
- **Cross-protocol streaming semantics.** Streaming partial results, cancellation, and structured fan-out are richer in many framework-native tool systems than in MCP's content-block model. Wrapping a complex tool through MCP can lose fidelity.
- **Trusting server-supplied tool annotations.** Per spec, they are untrusted unless the server itself is.
- **The deprecated 2024-11-05 HTTP+SSE transport.** Don't write new servers against it.

## 6 Evidence quality

- **Primary sources read this iteration:** the main spec landing page, the 2025-06-18 spec overview, the transports page (stdio + Streamable HTTP detail), the server-features overview, the `modelcontextprotocol/modelcontextprotocol` GitHub repo metadata (license, releases, schema directory dates), the `GOVERNANCE.md` (LF Projects), the `langchain-mcp-adapters` README, the OpenAI Agents SDK MCP page.
- **Cross-checked the adoption claim** against two first-party docs (LangChain adapter, OpenAI Agents SDK) to verify the "client-only / tools-only" pattern.
- **Confidence: high** on the spec mechanics (transports, lifecycle, primitives, security clauses) and on governance (LF Projects move documented). **Medium-high** on framework adoption depth — I spot-checked LangChain and OpenAI Agents SDK directly; the other eight rows in the audit table are based on known integration shapes and would benefit from one more iteration of direct docs reads.
- **Gaps:** I did not read the OAuth/DCR sub-spec in depth; the security_model section captures it at headline-only depth. I did not enumerate Streamable HTTP error-code semantics. The 2025-11-25 schema is referenced but not read — this record uses 2025-06-18 as the stable referent per the iteration brief.

## 7 Concrete next experiments or hypotheses

1. **Edge-depth schema upgrade.** Annotate every `protocol_supports` edge in the graph with `{role: client|server|both, primitives: [tools, resources, prompts, sampling]}`. Predict: more than 80% of current edges resolve to `{role: client, primitives: [tools]}`. The "every framework supports MCP" claim will visibly weaken.
2. **A2A and ACP as missing nodes.** Add `a2a` and `acp` slugs in iteration 5, record them as protocols, and propose `competes_in_niche` edges among MCP, A2A, ACP. Test whether any framework supports more than one inter-agent protocol natively.
3. **Tool-fidelity round-trip benchmark.** Wire the same complex tool (streaming output, cancellation, structured errors) through MCP to three hosts (Claude Desktop, OpenAI Agents SDK, LangChain) and measure how much of the tool's native fidelity survives the protocol boundary.
4. **Sampling adoption survey.** Identify which hosts actually implement the client-side `sampling` capability (a high-trust feature) vs only the trivial tools-only client. Hypothesis: <20% of hosts implement sampling.
5. **Security-clause conformance test.** Build a deliberately misbehaving MCP server (hostile tool annotations, missing Origin checks reachable from a webpage) and observe which hosts catch which issues. Score them.
6. **Governance impact tracking.** Watch the LF Projects move's downstream effects across the 2026 release cycle — does spec velocity change? Do non-Anthropic maintainers appear in Core Maintainer lists? Track over 2-3 iterations.
7. **Streamable-HTTP vs stdio adoption ratio.** Survey the top-100 community MCP servers; what fraction ship stdio vs Streamable HTTP? Hypothesis: stdio still dominates for local servers, Streamable HTTP for SaaS-style remote servers.
