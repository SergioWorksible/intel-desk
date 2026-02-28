# GitHub Workflow – Intel Desk

This guide explains how to contribute to **Intel Desk** using Git and GitHub. It is aimed at external contributors who want to submit changes via Pull Requests.

---

## 1. Key Concepts

| Term | Description |
|------|-------------|
| **Repository (repo)** | The full project on GitHub, including code and history. |
| **main** | The primary branch. All contributions are merged here. |
| **Fork** | Your personal copy of the repo on your GitHub account. You push changes to your fork. |
| **Branch** | A parallel line of development. Create one per feature or fix. |
| **Commit** | A snapshot of the code with a descriptive message. |
| **Pull Request (PR)** | A proposal to merge your branch into the upstream `main` branch. |

---

## 2. Contribution Flow (Fork & Pull Request)

External contributors do not push directly to the main repo. You work on a **fork** and open a **Pull Request**.

### Step 1: Fork the repository

1. Go to [github.com/sergiconejo/intel-desk](https://github.com/sergiconejo/intel-desk)
2. Click **Fork** (top right)
3. You now have `https://github.com/YOUR_USERNAME/intel-desk`

### Step 2: Clone your fork and add upstream

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/intel-desk.git
cd intel-desk

# Add upstream (the original repo) to fetch updates
git remote add upstream https://github.com/sergiconejo/intel-desk.git

# Verify remotes
git remote -v
# origin    https://github.com/YOUR_USERNAME/intel-desk.git (your fork)
# upstream  https://github.com/sergiconejo/intel-desk.git (original)
```

### Step 3: Create a branch from main

```bash
# Fetch latest from upstream
git fetch upstream

# Ensure you're on main and up to date
git checkout main
git merge upstream/main

# Create your feature branch
git checkout -b feat/your-feature-name
```

### Step 4: Make changes and commit

```bash
# Edit files, then:
git add .
git commit -m "feat: add your feature description"
# Use conventional commits (see section 6)
```

### Step 5: Push to your fork

```bash
git push origin feat/your-feature-name
```

### Step 6: Open a Pull Request

1. Go to your fork on GitHub
2. Click **Compare & pull request** (or **Pull requests** → **New pull request**)
3. Set:
   - **Base:** `sergiconejo/intel-desk` → `main`
   - **Compare:** `YOUR_USERNAME/intel-desk` → `feat/your-feature-name`
4. Fill in the title and description
5. Submit the PR

### Step 7: After your PR is merged

```bash
# Switch back to main
git checkout main

# Pull the merged changes from upstream
git pull upstream main

# (Optional) Update your fork
git push origin main

# Delete the feature branch locally
git branch -d feat/your-feature-name
```

---

## 3. Keeping Your Fork Up to Date

Before starting new work, sync with the upstream repo:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

---

## 4. Branch Naming Convention

Use a prefix and a short description in kebab-case:

| Prefix | Use |
|--------|-----|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `docs/` | Documentation only |
| `refactor/` | Code refactoring |
| `chore/` | Maintenance, dependencies |
| `test/` | Tests |

**Examples:** `feat/hypothesis-export-pdf`, `fix/clustering-threshold`, `docs/api-endpoints`.

---

## 5. How Many Branches to Create?

One branch per **logical unit of work**. You do not need a new branch for every tiny change.

| Create a branch | Small change (same branch or quick fix) |
|-----------------|-----------------------------------------|
| New feature | Typo in docs |
| Non-trivial bug fix | Formatting (spaces, quotes) |
| Refactor | 1–2 line change with low risk |
| Several related files | |

---

## 6. Commit Messages (Conventional Commits)

Follow [Conventional Commits](https://www.conventionalcommits.org/) as described in [CONTRIBUTING.md](../CONTRIBUTING.md):

```
feat: add hypothesis export to PDF
fix: correct clustering threshold validation
docs: update API endpoints table
refactor: simplify embedding service initialization
chore: update dependencies
```

---

## 7. Essential Git Commands Reference

| Action | Command |
|--------|---------|
| Check current branch | `git branch` |
| Create branch | `git checkout -b branch-name` |
| Switch branch | `git checkout branch-name` |
| Check status | `git status` |
| View history | `git log --oneline` |
| View remotes | `git remote -v` |
| Fetch from upstream | `git fetch upstream` |
| Pull latest main | `git pull upstream main` |
| Push to your fork | `git push origin branch-name` |

---

## 8. Things to Avoid

- **Do not** commit `.env`, `.env.local`, or any files with secrets (they are in `.gitignore`).
- **Do not** force push (`git push --force`) to shared branches.
- **Do not** open PRs from your `main` branch; always use a feature/fix branch.
- **Do not** ignore merge conflicts; resolve them before the PR can be merged.

---

## 9. Releases and Versioning

Versioning is **automated** with [release-it](https://github.com/release-it/release-it) and conventional commits:

1. **Mantén el CHANGELOG:** Añade cambios bajo `## [Unreleased]` en `CHANGELOG.md`.
2. **Usa conventional commits:** `feat:` = minor, `fix:` = patch, `BREAKING CHANGE:` = major.
3. **Publicar:** Ejecuta `npm run release` — sugiere versión según commits, actualiza CHANGELOG y package.json, crea tag.
4. **Subir:** `git push && git push --tags`

Scripts disponibles: `release` (interactivo), `release:patch`, `release:minor`, `release:major`.

---

## 10. Related Documentation

- [CHANGELOG.md](../CHANGELOG.md) – Version history
- [CONTRIBUTING.md](../CONTRIBUTING.md) – Contribution guidelines and setup
- [README.md](../README.md) – Project overview and quick start
- [GitHub Docs](https://docs.github.com/) – General GitHub help
- [Git documentation](https://git-scm.com/doc) – Git reference

---

*Intel Desk – GitHub Workflow – Last updated Feb 2026*
