# Public-site synchronization protocol

Public browsing is independent of write access. `/api/sync` accepts only a dedicated server-side `SYNC_WRITE_TOKEN` (at least 32 characters), sent as `Authorization: Bearer …`. An absent configuration rejects all writes (503); absent/wrong credentials return 401. No secret is provided by this repository. Never put it in URLs, logs, browser code, committed files, or chat messages. Configure via the official server secret facility and an approved updater secret store.

Each request contains exactly one article and `expected_sha256`. New IDs require null. Updates require SHA-256 of the currently stored compact JSON payload, UTF-8. Read the current article first, retain property ordering when serializing, and refresh after conflicts. A 409 returns the current hash when known. The server compares that hash, then atomically updates only if the exact previous payload remains unchanged; racing creates use INSERT ON CONFLICT DO NOTHING. Concurrent changes return 409 rather than overwrite. No global lock or multi-request transaction is claimed.

Run-state updates and batches are rejected. Only article writes are enabled after secret setup. Read back the article and verify the returned payload hash after each success before advancing any external checkpoint. An uncertain write outcome must be reconciled by reading; do not blind-retry stale input. Authentication is not authorization to publish previously rejected material: existing data-sharing restrictions still apply.

Until secure credentials are configured, production synchronization remains paused. This change does not upload articles, configure a credential, or alter public visibility.
