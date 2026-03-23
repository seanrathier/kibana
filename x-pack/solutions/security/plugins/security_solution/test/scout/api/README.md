# Security Solution — Scout API tests

## Entity store / `communicates_with` specs

- **Elasticsearch:** Use a **disposable** cluster (local or CI). Helpers call `cleanupEntityIndices`, which runs `delete_by_query` with `match_all` on the default-space entity store **updates** and **latest** indices (`constants.ts`).
- **Parallel Playwright tests:** Each `apiTest` that asserts maintainer output calls `triggerMaintainerRun` so tests do not depend on execution order within a file.
- **Cross-file parallelism:** Specs under `tests/communicates_with_*.spec.ts` still share the same entity index names. If you run multiple of these files in parallel against one cluster, they can interfere. Prefer a single worker for that suite, or isolate by space/index naming in a future iteration.
