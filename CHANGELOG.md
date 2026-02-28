# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Versioning:** `MAJOR.MINOR.PATCH` — MAJOR = breaking changes, MINOR = new features (backwards-compatible), PATCH = bug fixes and small improvements.

**Release workflow:** Keep `[Unreleased]` with pending changes. When releasing, run `npm run release` (or `release:patch`/`release:minor`/`release:major`). Automatically: bumps version from conventional commits, updates CHANGELOG, creates commit and tag.

## [Unreleased]

## [1.1.0] - 2026-03-01

### Added
- OSS landing page at `/` with Hero, nav, CTAs, capabilities grid (briefings, ML clustering, map, markets, hypotheses, alerts), pricing (self-host vs hosted), footer with scroll support
- Briefing export to Markdown and PDF (dropdown in briefing page, jspdf)
- Supabase Realtime for clusters, articles, briefings (postgres_changes, replaces polling)

### Fixed
- Migration version conflicts for `db push` (duplicate prefixes 004/005)

---

## [1.0.1] - 2026-03-01

### Added
- Version number and GitHub link in header, sidebar (expanded) and auth pages (login, signup)
- `lib/constants.ts` with `APP_VERSION` and `GITHUB_REPO_URL`
- `CHANGELOG.md` for versioning workflow

---

## [1.0.0] - 2026-02-28

### Added
- Initial open-source release
- Daily intelligence briefings, ML clustering (HDBSCAN), hypothesis tracker
- Strategic playbooks, causal graphs, research mode
- Market dashboard, world map, country cards
- Alert system, source management, role-based access (Admin, Analyst, Reader)

[Unreleased]: https://github.com/SergioWorksible/intel-desk/compare/v1.1.0...HEAD
[1.0.1]: https://github.com/SergioWorksible/intel-desk/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/SergioWorksible/intel-desk/releases/tag/v1.0.0

[1.1.0]: https://github.com/SergioWorksible/intel-desk/releases/tag/v1.1.0
