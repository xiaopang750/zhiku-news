# 智库文章研读台（zhiku-news）

当前 Site 源代码导出，包含文章列表/详情、检索、RAG 问答、MCP 接口和 D1 数据结构。

## 导出说明

- 来源：Site v29，源提交 `286ce3c8b708f53c96faf854eb065cfe5cfbf803`，2026-11-09。
- 这是源代码快照，不含文章数据库、采集文件、备份、运行日志、依赖目录或任何生产凭据。
- 当前 Site 仍托管在 Sites；提交到 GitHub 不会自动迁移托管，也不建立持续同步。
- 问答依赖运行平台、模型配置及数据绑定，克隆源码并不等于拥有生产数据库或可立即部署到普通 Node 服务器。
- 新同步接口规则见 `SYNC_SECURITY.md`。`SYNC_PROTOCOL.md`、`sync_site.py` 和 `verify_site.py` 为历史工具，不能当作当前生产同步客户端。
- 测试中部分旧集成用例依赖原工作区文章 fixture；仓库不包含这些文章数据。

## 开发

需要 Node.js >= 22.13.0。使用 `npm ci` 安装依赖，`npm run dev` 本地开发，`npm run build` 构建。D1 绑定名为 `DB`，数据库迁移见 `drizzle/`。部署时通过运行平台独立配置必要密钥，切勿提交到仓库。

下方保留原项目的运行说明。

---

# vinext-starter

A clean full-stack starter running on [vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`
- Portable: Windows, macOS, or Linux; no Bash required
- Managed Linux: managed Linux runtime with Bash, `flock`, `curl`, `sha256sum`, and GNU `timeout`
- Git and `tar` (including Windows `tar.exe`) are required for publishing; portable publication does not require Bash

## Sites Lifecycle

The Sites initializer copies the shared starter and selects managed-linux only when `SITES_MANAGED_LINUX_CONTAINER=1`; otherwise it selects portable. It saves the selection only in ignored `.sites-runtime/execution-profile.json`. Both profiles copy/configure first, then use the plugin's separate `install-dependencies.mjs` step to measure installation independently. Edit source under `app/` and follow the Sites skill for installation, preview, builds, and publishing.

Run `node <plugin-root>/scripts/configure-execution-profile.mjs` only when the profile is unknown for the current checkout and environment. Profile changes do not alter tracked source or require reinstalling otherwise-valid dependencies; restart an existing preview to use the new selection. Do not commit or upload `.sites-runtime/`.

This starter does not use `wrangler.jsonc`.

Publish archives outside the source checkout or under its ignored `outputs/` directory. Local `.env*`, `.dev.vars*`, TypeScript build state, and tool runtime directories are ignored; keep the hosting manifest, migrations, and authored scripts in source control.

`install:ci` runs `npm ci` once against the shared lockfile, disables parent-workspace discovery, and includes required dev/optional dependencies despite production/omit settings. Sharp defaults to prebuilt binaries unless explicitly configured otherwise. Do not overlap installers.

- **Portable:** Preserve host HOME, npm cache, registry, proxy, temporary paths, retry/concurrency settings, and lifecycle-script policy. Use `--prefer-offline --no-audit --no-fund`.
- **Managed Linux:** Use the existing project-local HOME/cache/tmp setup and Linux install lock, tarball preflight, and timeout. Restore the image-seeded npm cache only when its lockfile hash matches; retain network fallback. Builds keep their existing timeout. These helpers are not invoked by the portable profile.

`scripts/sites-env.mjs` preserves the caller's HOME, npm cache, proxy, XDG, and temporary-directory configuration while defaulting Wrangler and Miniflare state to the checkout. If npm reports an unwritable cache, select a writable path with `npm_config_cache` for that install. The `dev` and `start` scripts also keep Wrangler logs inside the checkout. Generated `.sites-runtime/` and `.wrangler/` directories are disposable and ignored by Git.

On portable, `npm run dev` uses `vinext dev` with HMR, starting at port 5173. Vinext records the running server in ignored `.vinext/` state, rejects an ordinary duplicate launch, and recovers stale state after a stopped process; exactly simultaneous starts can race. Pass `--port <port>` or `--hostname <host>` after `npm run dev --` when needed; keep portable previews on loopback.

For managed Linux browser QA, follow the Sites skill's managed preview reference. The daemon runs the project's Vite dev script with `--host 0.0.0.0 --port 4173 --strictPort`; use the CLI's returned URL. The ignored local profile survives the daemon's cleared environment.

The portable profile simulates ChatGPT sign-in only for loopback development requests. Visit `/signin-with-chatgpt?return_to=/` to sign in as `local_seedy` (`seedy@sites.test`, display name `Seedy`) and `/signout-with-chatgpt?return_to=/` to sign out. The development cookie preserves that identity across server restarts. Mock auth is disabled in the managed-linux profile and is not included in production builds; hosted authentication remains dispatch-owned.

The Worker uses `vinext/server/fetch-handler`, including Vinext's config-aware image handling. After building, `npm start` runs that Worker locally through Wrangler on `127.0.0.1`, sharing `.wrangler/state` with dev preview and local D1 migrations; it does not deploy the site or simulate sign-in. Use the URL printed by the server. Pass `npm start -- --port <port>` to select a different built-preview port.

Local previews use Miniflare's placeholder `Request.cf` metadata without a network lookup. Set `CLOUDFLARE_CF_FETCH_ENABLED=true` to opt into fetching preview metadata; this setting does not change hosted request metadata.

Local tool usage metrics are disabled by default. Set `WRANGLER_SEND_METRICS=true` to opt in.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `worker/index.ts` is the production Worker entrypoint and preserves request-scoped connector bindings
- `scripts/vite/` contains the maintained Vite integrations and the vendored Sites plugin license
- `scripts/connector-preview/` contains the local connector preview Worker and session helpers
- the remaining `scripts/` files select execution profiles and run installation, development, and builds; the plugin's helpers orchestrate the Sites lifecycle
- `dist/` contains generated deployment output; `.vinext/`, `.wrangler/`, and `.sites-runtime/` contain ignored local tool state
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` starts intentionally empty
- `@cloudflare/workers-types` provides Worker types; `cloudflare-env.d.ts` declares optional `DB`/`BUCKET` bindings—update these declarations if binding names change
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Use it as the durable user key; use email and name for display or contact purposes.

SIWC-authenticated workspace sites may also receive `oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty `name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by `oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use the returned `userId` as the stable user key for user-owned records; do not use email as a durable identifier.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send anonymous visitors through Sign in with ChatGPT.
- In a Server Component, start sign-in with `<a href={chatGPTSignInPath(returnTo)} target="_top">`. The auth helper module is server-only; do not import it into a Client Component.
- Do not use `fetch`, XHR, a client-side router, or a framework link that can prefetch the sign-in route. SIWC must start as a top-level navigation.
- Never request the AuthAPI authorization endpoint directly. The dispatch-owned `/signin-with-chatgpt` route must start the SIWC flow.
- Use `chatGPTSignOutPath(returnTo)` for browser sign-out links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the OAuth cookies, and identity header injection. Do not implement app routes for those reserved paths. Routes that do not import and call the helper remain anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the Sites hosting platform's access policy controls for workspace-wide restrictions, or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write actions tied to the current ChatGPT user. Leave public content anonymous.

## Local D1 migrations

For a D1-backed local preview, generate SQL with `npm run db:generate`. Build once through the Sites skill's build entrypoint (or `npm run build` for standalone use) to generate `dist/server/wrangler.json`, rebuilding if bindings change. From the project root, apply each pending migration in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_example.sql
```

Replace the filename with the pending migration and `DB` with your D1 binding name if different. Use `.wrangler/state`, not `.wrangler/state/v3`; Wrangler adds the versioned directories. Do not replay migrations already applied locally. This updates only the preview database; publishing applies production migrations separately.

## Diagnostic Commands

- `npm run install:ci`: perform the one locked dependency install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build the deployable Sites artifact
- `npm run start`: preview the built Worker locally with D1/R2 support
- `npm run db:generate`: generate Drizzle migrations after schema changes

When using the Sites plugin, follow its skill instructions for installation, builds, and publishing. These npm commands remain available for standalone use.

The portable build runs Vinext directly without a host `timeout` command. The managed-linux build uses `scripts/build-verified.sh` and its existing `SITES_BUILD_TIMEOUT` setting.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)

### Agent chat engineering
`/api/ask` supports JSON clients and `Accept: text/event-stream` for the conversational UI. Events are `status`, `done`, and `error`; HTTP errors before streaming retain their appropriate status. Progress is real execution state, not token streaming or a completion percentage.

Only user/assistant text from at most 12 prior messages (16,000 characters total; 6,000 per message) is accepted. Each request re-retrieves evidence; conversation history is not evidence. Browser history uses sessionStorage, current tab only, last 40 messages, with no cross-device sync.

Requests have a 180-second overall model budget, provider SSE consumption (reasoning text is not retained), and no arbitrary 60-second per-round cutoff, cancellation propagation, 12-tool / 60,000-character evidence budgets, per-request tool-result caching, and a final synthesis round. Isolate-local concurrency protection is best effort, not a durable distributed quota. Logs contain only allowlisted error codes, never questions, article contents or credentials. No paid endpoint fallback exists.

Regression: `node tests/ask-runtime.mjs && node tests/ask-route.mjs && node tests/library-ui.mjs && node tests/sync-limits.mjs` plus TypeScript/build. Runtime tests use explicit synthetic stubs, not live model calls.

Provider latency correction: official GLM-5.3 documentation defaults reasoning effort to `max`. This adapter explicitly uses `high`, reads provider SSE/tool deltas, and avoids a separate planning round for first-turn “latest technology” requests by retrieving recent articles first. This does not imply a measured production speedup; stage timings (`ask_stage`) now distinguish provider rounds and total timeout from client cancellation. Reference: https://docs.bigmodel.cn/api-reference/模型-api/对话补全 .

### RAG + Pi pipeline
`/api/ask` now runs local recall → deterministic reranking → `@earendil-works/pi-agent-core@1.5.0` → fixed domestic GLM transport. Pi is actually installed and bundled, not a CLI subprocess. Its custom adapter never loads a different provider or exposes the key to the client.

Default candidate budget is 12 passages / 3 evidence passages; comparison/deeper questions use 20 / 5. Evidence is at most 6,500 characters. Pi normally synthesizes once; at most one supplemental read round (two executed tools) precedes final synthesis. No-result queries stop before calling the model. Stage timings report retrieval and model latency separately.

Retrieval is local BM25-style lexical scoring plus Chinese bigrams, a small bilingual technology vocabulary, title/coverage/date reranking and article diversity. It is **not vector search or a neural reranker**. Latest-tech queries prioritize verified publication dates after topical screening, never collection dates; unknown dates remain unknown. Recognized related-news footer headings are omitted from retrieval, not deleted from saved articles. Exact passage offsets, title, original URL or private Site link, publication date and translation status accompany evidence.

Bounded scan: latest 200 rows, first 30,000 characters per original/translation, 2,000,000 total indexed characters. Limits and omissions are exposed in the answer. No third-party embedding/rerank service, extra model, full-library upload, permission change or new billing path was introduced. The evidence and conversation use the already authorized GLM destination.

Validation includes actual Pi/workerd bundle tests, lexical relevance/no-result/follow-up tests, fixture end-to-end route tests, and offline checks against 79 local articles. These do not substitute for signed-in production GLM latency/quality verification.

The fixed “latest technology key points summary” request takes a fast-brief path: three evidence passages, one synthesis call, no supplemental tool round, GLM `low` reasoning and 1,200 output tokens. Complex research remains `high`. This is an optimization toward a one-minute target, not a measured production SLA; actual latency must be verified in an authenticated session.

### Saved analysis brief fast path
The exact broad, context-free request “给我最新的科技相关的要点总结” can use existing analyzed key points. After retrieval, every displayed point must have nonempty source quotations found in that article's stored original text, with analyzed status. All selected articles must pass; otherwise the request falls back to the real model. It states explicitly that no model was called in this request and includes source/date/quotation/record update time. Scoped, dated, comparative or follow-up questions do not use this path. This is pre-analysis presentation, not faster on-demand inference. A sub-10-second production target remains unverified without a signed-in end-to-end test; local timings exclude authentication/network/D1.
