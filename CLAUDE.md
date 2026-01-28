# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

| Task | Command |
|------|---------|
| Install deps | `pnpm install` |
| Build | `pnpm build` |
| Dev mode | `pnpm dev` or `pnpm moltbot <cmd>` |
| Watch mode | `pnpm gateway:watch` |
| Lint | `pnpm lint` |
| Format | `pnpm format:fix` |
| Test | `pnpm test` |
| Test coverage | `pnpm test:coverage` |

## Project Overview

Moltbot is a personal AI assistant platform that bridges multiple messaging channels (WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Google Chat, Microsoft Teams, Matrix, Zalo, etc.) to AI agents. It includes native apps for macOS, iOS, and Android.

**Repository:** https://github.com/moltbot/moltbot
**Documentation:** https://docs.molt.bot
**Version format:** CalVer (YYYY.M.D)
**Runtime:** Node.js ≥22 required

## Build & Development Commands

```bash
# Install dependencies
pnpm install

# Run CLI in dev mode
pnpm dev
# or: pnpm moltbot <command>

# Build (TypeScript → dist/)
pnpm build

# Lint and format
pnpm lint          # oxlint
pnpm format:fix    # oxfmt

# Tests
pnpm test                    # unit tests (vitest)
pnpm test:coverage           # with coverage report
pnpm test:e2e                # end-to-end tests
pnpm test:live               # live tests (requires CLAWDBOT_LIVE_TEST=1)

# Gateway dev loop
pnpm gateway:watch

# Web UI
pnpm ui:build
```

**Runtime requirement:** Node ≥22
**Preferred package manager:** pnpm (Bun also supported for TypeScript execution)

## Architecture

### Source Layout
- `src/` — Main TypeScript source
  - `cli/` — CLI infrastructure (Commander.js), `program.ts` builds command tree
  - `commands/` — Individual CLI commands
  - `channels/` — Channel abstraction and routing
  - `gateway/` — Hono HTTP/WS server (control plane)
  - `agents/` — Pi framework agent integration
  - `providers/` — Model providers (Anthropic, OpenAI, Bedrock, Gemini, Ollama)
  - `infra/` — Core infrastructure (env, errors, ports)
  - `media/` — Media processing pipeline
  - `plugin-sdk/` — Plugin system API
- `extensions/` — Plugin workspace packages (27+ channel/feature plugins)
- `apps/` — Native applications
  - `ios/`, `android/`, `macos/` — Swift/Kotlin apps
  - `shared/` — Shared Swift code (MoltbotKit)
- `ui/` — Web UI (Lit + Vite)
- `docs/` — Mintlify documentation (hosted at docs.molt.bot)

### Key Patterns
- **Dependency injection:** Use `createDefaultDeps()` for channel senders
- **CLI options:** Follow existing patterns in `src/cli/`
- **Progress/spinners:** Use `src/cli/progress.ts` (osc-progress + @clack/prompts)
- **Status tables:** Use `src/terminal/table.ts` for ANSI-safe output
- **Colors:** Use shared palette from `src/terminal/palette.ts`

### Plugin System
- Extensions live in `extensions/` as workspace packages
- Each plugin has `clawdbot.plugin.json` manifest
- Plugin-only deps go in extension `package.json`, not root
- Runtime deps must be in `dependencies`; put `moltbot` in `devDependencies` or `peerDependencies`
- Avoid `workspace:*` in `dependencies` (npm install breaks)

## Testing

- **Framework:** Vitest with V8 coverage (70% thresholds)
- **Naming:** `*.test.ts` colocated with source; `*.e2e.test.ts` for E2E
- **Config files:** `vitest.config.ts`, `vitest.unit.config.ts`, `vitest.e2e.config.ts`, `vitest.live.config.ts`
- **Mobile testing:** Prefer connected real devices over simulators when available
- **Max workers:** Do not set above 16
- **Test timeout:** 120s default; configured in vitest.config.ts

## Coding Standards

- **Language:** TypeScript (ESM), strict typing, avoid `any`
- **File size:** Keep under ~500-700 LOC; split when it improves clarity
- **Comments:** Brief comments for tricky/non-obvious logic only
- **Naming:** "Moltbot" for product/docs headings; `moltbot` for CLI/package/paths
- **Imports:** ESM requires `.js` extension in imports (even for .ts files)

## Commit Workflow

- Create commits with `scripts/committer "<msg>" <file...>` (avoids manual staging)
- Concise, action-oriented messages (e.g., `CLI: add verbose flag to send`)
- Changelog: latest released version at top; add PR # and thanks for contributor PRs
- PR merge preference: rebase for clean commits, squash for messy history
- Add contributor to README "clawtributors" list when merging external PRs

## Multi-Agent Safety

When working alongside other agents:
- Do NOT create/apply/drop `git stash` entries unless explicitly requested
- Do NOT switch branches unless explicitly requested
- Do NOT modify git worktrees unless explicitly requested
- Do NOT use `git pull --rebase --autostash` (autostash is problematic)
- Scope commits to your changes only; use "commit all" for everything
- Keep unrelated WIP untouched; continue if safe when multiple agents touch same file
- When you see unrecognized files, keep going; focus on your changes

## Channel Development

When modifying shared channel logic (routing, allowlists, pairing, onboarding):
- Consider ALL built-in + extension channels
- Core channels: `src/telegram`, `src/discord`, `src/slack`, `src/signal`, `src/imessage`, `src/web`, `src/channels`, `src/routing`
- Extension channels: `extensions/*` (msteams, matrix, zalo, etc.)
- Update `.github/labeler.yml` when adding channels/extensions
- Update all UI surfaces and docs when adding connection providers

## Tool Schema Guardrails

- Avoid `Type.Union` in tool input schemas (no `anyOf`/`oneOf`/`allOf`)
- Use `stringEnum`/`optionalStringEnum` for string lists
- Use `Type.Optional(...)` instead of `... | null`
- Avoid raw `format` property names (reserved keyword in some validators)
- Keep top-level tool schema as `type: "object"` with `properties`

## Docs (Mintlify)

- Internal links: root-relative, no `.md`/`.mdx` (e.g., `[Config](/configuration)`)
- Anchors: root-relative paths (e.g., `[Hooks](/configuration#hooks)`)
- Avoid em dashes and apostrophes in headings (breaks anchor links)
- README links: use full `https://docs.molt.bot/...` URLs
- Keep content generic: no personal device names/hostnames/paths

## Release Channels

- **stable:** tagged releases (`vYYYY.M.D`), npm dist-tag `latest`
- **beta:** prerelease tags (`vYYYY.M.D-beta.N`), npm dist-tag `beta`
- **dev:** moving head of `main`

## Version Locations

When updating versions, check all these files:
- `package.json` (CLI)
- `apps/android/app/build.gradle.kts` (versionName/versionCode)
- `apps/ios/Sources/Info.plist` + `apps/ios/Tests/Info.plist`
- `apps/macos/Sources/Moltbot/Resources/Info.plist`
- `docs/install/updating.md` (pinned npm version)

## Important Notes

- Never edit `node_modules` (global/Homebrew/npm/git installs too)
- Never update the Carbon dependency
- Patched dependencies (`pnpm.patchedDependencies`) must use exact versions (no `^`/`~`)
- Patching dependencies requires explicit approval
- macOS Gateway runs via menubar app; restart via app or `scripts/restart-mac.sh`
- SwiftUI: prefer `Observation` framework (`@Observable`, `@Bindable`) over `ObservableObject`
- Never send streaming/partial replies to external messaging surfaces; only final replies
- Release version changes require explicit operator consent
- Do not rebuild macOS app over SSH; must run directly on Mac

## Troubleshooting

- Run `moltbot doctor` for diagnostics and migration issues
- macOS logs: use `./scripts/clawlog.sh` for unified log queries
- Pi session logs: `~/.clawdbot/agents/<agentId>/sessions/*.jsonl`

## Working with This Codebase

### Before Making Changes

1. **Explore first**: Use grep/glob to understand existing patterns before modifying
2. **Read related files**: Check how similar features are implemented
3. **Check AGENTS.md**: Contains detailed repository guidelines and workflows

### Key Entry Points

| Purpose | File |
|---------|------|
| CLI entry | `src/entry.ts` |
| CLI commands | `src/cli/program.ts` |
| Gateway server | `src/gateway/server.ts` |
| Channel routing | `src/channels/index.ts` |
| Config loading | `src/config/index.ts` |

### Common Tasks

**Adding a CLI command:**
1. Create command in `src/commands/<name>.ts`
2. Register in `src/cli/program.ts`
3. Add tests in `src/commands/<name>.test.ts`

**Adding a channel:**
1. Create directory `src/<channel>/` or `extensions/<channel>/`
2. Implement channel interface
3. Update channel router
4. Add documentation in `docs/channels/`
5. Update `.github/labeler.yml`

**Running a single test:**
```bash
pnpm test src/path/to/file.test.ts
```

### Verification Commands

Always run before committing:
```bash
pnpm lint && pnpm build && pnpm test
```

## Related Documentation

- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) - Comprehensive developer onboarding
- [USER_GUIDE.md](USER_GUIDE.md) - End-user documentation
- [QUICK_START.md](QUICK_START.md) - Quick start with use cases
- [AGENTS.md](AGENTS.md) - Full repository guidelines
