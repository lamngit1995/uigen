# GitHub Actions Workflows

This directory contains automated workflows for the UIGen project.

## Workflows

### 1. `test.yml` - Test CI
**Triggers:**
- Push to `master` or `main` branches
- Pull requests to `master` or `main` branches
- Manual trigger via workflow_dispatch

**What it does:**
- Runs on Node.js 18.x and 20.x
- Installs dependencies
- Generates Prisma client
- Runs ESLint
- Runs all tests (206 tests)
- Builds the production bundle
- Verifies build artifacts

**Purpose:** Ensures code quality and prevents breaking changes.

### 2. `claude-code-test.yml` - Claude Code Integration Test
**Triggers:**
- Push to `master` or `main` branches
- Pull requests to `master` or `main` branches
- Manual trigger via workflow_dispatch

**What it does:**
- Checks repository accessibility
- Verifies CLAUDE.md exists
- Validates project structure
- Confirms GitHub Actions integration

**Purpose:** Verifies GitHub Actions is properly configured and working with the repository.

## Manual Trigger

You can manually run any workflow:
1. Go to: https://github.com/lamngit1995/uigen/actions
2. Select the workflow you want to run
3. Click "Run workflow"
4. Choose the branch and click "Run workflow"

## Monitoring

View workflow runs at: https://github.com/lamngit1995/uigen/actions

## Status Badge

Add this badge to your README.md to show build status:

```markdown
![Test CI](https://github.com/lamngit1995/uigen/workflows/Test%20CI/badge.svg)
```
