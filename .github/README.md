# GitHub Actions CI/CD

This directory contains GitHub Actions workflows and automation configurations for the Bale Frontend project.

## Workflows

### 🔍 CI Pipeline (`workflows/ci.yml`)

Runs on every push and pull request to `main` and `staging` branches.

**Jobs:**

1. **Code Quality & Build**
   - ESLint linting
   - Prettier formatting check
   - TypeScript type checking
   - Next.js production build
   - Detects uncommitted changes after build

2. **Security Vulnerability Scan**
   - npm audit for known vulnerabilities
   - Fails on moderate+ severity issues
   - Reports outdated dependencies

**Runtime:** ~2-3 minutes with caching

### 🤖 Dependabot (`dependabot.yml`)

Automated dependency updates running every Monday at 9:00 AM IST.

**Features:**

- ✅ Groups minor/patch updates to reduce PR noise
- ✅ Separate handling for dev vs production dependencies
- ✅ Auto-assigns to @mohnishsalian0
- ✅ Labels PRs as `dependencies` and `automated`
- ✅ Max 5 open PRs at a time
- ✅ Also updates GitHub Actions versions monthly

**PR Format:**

```
deps(scope): bump package-name from 1.0.0 to 1.1.0
```

## GitHub Secrets Required

Add these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

| Secret Name                     | Description            | Required   |
| ------------------------------- | ---------------------- | ---------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL   | Optional\* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Optional\* |

\*Optional because the workflow uses placeholder values if secrets are missing. For full build validation, add real values.

## How to Add Secrets

1. Go to `https://github.com/mohnishsalian0/bale-frontend/settings/secrets/actions`
2. Click **New repository secret**
3. Add name and value
4. Click **Add secret**

## Testing the Workflow

The workflows will automatically run when you:

- Create a PR to `main` or `staging`
- Push commits to `main` or `staging`
- Merge a PR to those branches

## Monitoring

View workflow runs at:
`https://github.com/mohnishsalian0/bale-frontend/actions`

## Badges (Optional)

Add this to your main README.md to show CI status:

```markdown
[![CI](https://github.com/mohnishsalian0/bale-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/mohnishsalian0/bale-frontend/actions/workflows/ci.yml)
```

## Troubleshooting

**Build fails with "Module not found":**

- Check if dependencies are in `package.json`
- Ensure `npm ci` runs successfully locally

**npm audit fails:**

- Review the security report in the workflow logs
- Run `npm audit fix` locally to auto-fix
- For breaking changes, manually update packages

**Prettier formatting errors:**

- Run `npm run format` locally to auto-fix formatting
- Or use `npm run format:check` to see which files need formatting
- Configure your editor to format on save

**TypeScript errors:**

- Run `npx tsc --noEmit` locally to see all errors
- Fix type issues before pushing

**Workflow doesn't trigger:**

- Ensure you're pushing to `main` or `staging` branches
- Check branch protection rules aren't blocking workflows
