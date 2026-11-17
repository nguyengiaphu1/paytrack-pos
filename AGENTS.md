# Agent Instructions — PayTrack POS

1. **Read [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) first** before scanning or searching files. It contains the full architecture, live Vercel/Supabase setup, DB schema/RPCs, codebase map, and conventions — do not waste tokens re-reading the whole repository.
2. **Design & Data Rules**: Follow [`DESIGN.md`](./DESIGN.md) (no AI slop, daylight-first Jade `#0E6B4E`, Vietnamese retail copy, `>= 16px` inputs, integer VND `bigint`, strict `user_id = auth.uid()` RLS).
3. **Workflows**:
   - Bug fixes: `/speckit-bug-assess` -> `/speckit-bug-fix` -> `/speckit-bug-test`
   - New features/changes: `/speckit-specify` -> `/speckit-plan` -> `/speckit-tasks` -> `/speckit-implement`
4. **Verification Gate**: Run `npm run typecheck && npm run lint && npm test && npm run build` before committing.
5. **Update Rule**: Update [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) (affected sections + `Recent Changelog`) after completing any bug fix, new feature, schema/API/config change, or version milestone. Never put secrets/tokens in git.
