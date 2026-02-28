# Contributing to Intel Desk

Thank you for your interest in contributing to Intel Desk! This guide will help you get started.

## How to Contribute

### Reporting Bugs

1. Check existing [GitHub Issues](https://github.com/sergiconejo/intel-desk/issues) to avoid duplicates
2. Open a new issue with:
   - Clear, descriptive title
   - Steps to reproduce the bug
   - Expected vs. actual behavior
   - Browser/OS/Node.js version
   - Screenshots if applicable

### Suggesting Features

Open a [feature request](https://github.com/sergiconejo/intel-desk/issues/new) with:
- Problem statement: what you're trying to accomplish
- Proposed solution
- Alternatives you've considered

### Development Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/intel-desk.git
cd intel-desk

# 2. Install frontend dependencies
npm install

# 3. Configure environment
cp .env.example .env
cp ml-cluster/.env.example ml-cluster/.env
# Edit both .env files with your API keys

# 4. Start Supabase (local)
npx supabase start
npx supabase db push

# 5. Start the Next.js dev server
npm run dev

# 6. Start the ML service (separate terminal)
cd ml-cluster
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

### Pull Request Process

1. **Fork** the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. **Write your code** following the coding standards below
3. **Test** your changes thoroughly
4. **Commit** using conventional commit messages
5. **Push** to your fork and open a Pull Request
6. Fill in the PR template with a description of your changes

### Coding Standards

**TypeScript (Frontend)**
- Follow existing patterns in the codebase
- Use TypeScript strictly — avoid `any` types
- Run `npm run lint` before committing
- Use shadcn/ui components where applicable
- Keep API route handlers in `app/api/`

**Python (ML Service)**
- Follow PEP 8 conventions
- Add docstrings to public functions
- Keep services modular (one responsibility per file)
- Handle errors gracefully with logging

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add hypothesis export to PDF
fix: correct clustering threshold validation
docs: update API endpoints table
refactor: simplify embedding service initialization
chore: update dependencies
```

## Code of Conduct

Be respectful and constructive. We are committed to providing a welcoming and inclusive experience for everyone.

## License

By contributing to Intel Desk, you agree that your contributions will be licensed under the [AGPL-3.0 License](LICENSE).
