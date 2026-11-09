> 历史协议，仅保留作迁移参考。当前公开站点的写入鉴权以 `SYNC_SECURITY.md` 为准；以下旧批量同步和 owner-only 描述不再适用。

# 私有查询站点同步

Site ID: appgprj_6aeeeada9de8819181747d5edde66f05
URL: https://zhiku-article-intelligence.fwei7981.chatgpt.site
Audience: owner-only custom access. Do not widen permissions.

SQLite on the cloud computer is authoritative. D1 is a query projection; syncing does not replace local ingestion/analysis or its audit records.

1. Complete local analysis and export at most 20 changed `core.get_article` objects into JSON: `{ "articles": [...], "run": { "completed_at": "ISO time", "total": n, "analyzed": n, "pending": n, "status": "completed" } }`.
2. Call Sites `get_site` for the exact ID above on each run. Verify owner-only access remains, and obtain its current `siwc_bypass_bearer_token` in memory. Do not persist/print this token or include it in schedule prompts.
3. Start `python /workspace/shared/zhiku-intel-site/sync_site.py <export JSON absolute path>` with a TTY. Wait for `Ready for service token on stdin`, then pass the token via stdin and newline. The script disables echo. It sends the token only to the matching Site in the `OAI-Sites-Authorization` header. Never put tokens in shell arguments.
4. The script POSTs `/api/sync`, then reads `/api/stats`, `/api/articles`, and `/`. Confirm success before marking sync complete. Record failures for retry without re-analyzing already processed content.
5. Use `/api/articles/{id}` to verify a changed article and compare exact source quotes. Each sync upserts stable IDs. No delete API exists. Sync batches may be retried idempotently, but reconcile uncertain outcomes first.

The receiver normalizes core field names, excludes local path fields before upload, retains original URLs, publication null values, evidence, limitations, and source metadata. The API and UI are protected by Sites' owner-only access. Anonymous requests are refused (verified 403).

No API credentials are embedded in the site, browser assets, SQLite exports, repository, or schedule instructions. Browser data comes from same-origin Site endpoints; cloud computer localhost is not exposed.
