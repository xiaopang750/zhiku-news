# Design audit
Brief: private Chinese research reader, blue technical aesthetic with depth, readable filters and evidence-led article/attachment reading.
This is a dense product UI, outside taste skill marketing layout scope. Apply its audit, consistency, accessibility and anti-slop principles; use an honest custom product aesthetic rather than claim Fluent/Carbon implementation.
Dials: visual variance 3, motion 1, density 7. Light theme throughout; cobalt accent; pale blue canvas; raised white panels, inset borders and restrained shadows. No ornamental images needed for evidence reading.
Old issues: green editorial palette, low-contrast field cues, no collection timestamps, modal only summaries, no full text/translation/files. Preserve data, source links, evidence and owner-only privacy.

## 2026-11-08: restrained product polish
Reading this as: a professional article-reading product, with a blue technical language, retaining Radix/shadcn rather than adding a second system.
Design variance 4 / motion intensity 3 / density 5. Taste skill is not a dense-product specification; applied its preserve-first, consistency and accessibility principles only.
- Preserved source identity, copy, routes, filters, date semantics, private audience and data.
- More legible layered surfaces and edge treatment, compact library icons, consistent radii.
- Finite 160–210ms dialog/tab state transitions; tactile click and pointer-only card hover. No looping decorative effects or scroll hijacking.
- Static skeleton loading state avoids misleading fake progress. Reduced-motion removes *all* animation/transition including pseudo-elements; reduced-transparency fallback.
- Mobile layout retained, >=44px filter targets. Restores focus to article button after modal close.
- Browser visual QA unavailable: managed environment has no cua_repl.js. No alternate browser or preview installed. TypeScript, SSR semantics and production build are verifiable; actual rendered screenshots/click testing remain unverified.

## Agent conversation upgrade
- Product redesign, not a landing page. Preserve Radix/shadcn controls, light blue surfaces, cobalt accent, restrained depth; variance 3 / motion 2 / density 5.
- /ask is now a two-pane research workspace, with large readable messages, a pinned composer, citations and honest backend phase feedback. No fake token streaming.
- Multi-turn context is bounded to the last 12 messages / 16,000 characters. Session history is current-tab only, with an explicit disclosure; no new cloud persistence or sharing.
- Real browser preview verified initial layout, prompt selection, 401 error without losing user text, refresh recovery and new-conversation reset. Actual GLM and signed-in production flow remain separate tests requiring login.
- Worker tests verify history validation, cancellation, cache reuse, redirects, tool budgets, auth/origin checks, SSE result/progress and JSON compatibility. No test authentication code is part of production.
