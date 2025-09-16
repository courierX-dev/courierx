# PR Automation Guide

This document explains the automated PR management system for CourierX.

## Overview

The PR automation system handles:
- Auto-merging safe dependabot PRs
- Cleaning up old workflow runs
- Managing stale PRs
- Providing CLI tools for manual management

## Automated Workflows

### 1. Dependabot Auto-Merge (`dependabot-auto-merge.yml`)
- **Trigger**: When dependabot opens/updates a PR
- **Action**: Auto-approves and merges patch/minor updates after CI passes
- **Safety**: Only merges if CI is successful and update is non-breaking

### 2. PR Automation (`pr-automation.yml`)
- **Trigger**: Twice daily (9 AM & 5 PM UTC) or manual dispatch
- **Actions**:
  - Auto-merge safe dependabot PRs
  - Close stale PRs (45+ days old)
  - Clean up old workflow runs (21+ days)

### 3. Workflow Cleanup (`cleanup-workflows.yml`)
- **Trigger**: Weekly on Sundays or manual dispatch
- **Action**: Removes old workflow runs to keep the Actions tab clean
- **Retention**: Keeps last 10 runs and runs from last 30 days

## CLI Usage

The `scripts/pr-manager.sh` script provides manual control:

```bash
# List all dependabot PRs
pnpm pr:list

# Auto-merge safe dependabot PRs
pnpm pr:auto-merge

# Show repository status
pnpm pr:status

# Clean up old workflow runs (default: 30 days)
pnpm pr:cleanup

# Close stale dependabot PRs (default: 60 days)
pnpm pr:close-stale
```

### Direct script usage:
```bash
# Make executable (first time only)
chmod +x scripts/pr-manager.sh

# List dependabot PRs
./scripts/pr-manager.sh list

# Auto-merge with custom settings
./scripts/pr-manager.sh auto-merge

# Cleanup with custom retention
./scripts/pr-manager.sh cleanup 14

# Close stale PRs older than 30 days
./scripts/pr-manager.sh close-stale 30
```

## Manual Workflow Triggers

You can manually trigger workflows from the GitHub Actions tab:

1. **PR Automation**: Choose action (auto-merge, close-stale, cleanup, status)
2. **Cleanup Workflows**: Specify retention days
3. **Dependabot Auto-Merge**: Runs automatically on PR events

## Safety Features

### Auto-Merge Criteria
- ✅ PR author is `dependabot[bot]`
- ✅ Update type is patch or minor (not major)
- ✅ All CI checks pass
- ✅ PR is mergeable

### What Gets Auto-Merged
- Patch updates (1.0.0 → 1.0.1)
- Minor updates (1.0.0 → 1.1.0)
- Dependency maintenance PRs

### What Requires Manual Review
- Major version updates (1.0.0 → 2.0.0)
- Security updates (flagged for review)
- Failed CI checks
- Conflicted PRs

## Configuration

### Dependabot Settings (`.github/dependabot.yml`)
- Weekly updates on Mondays at 9 AM
- Limited PR count per package
- Auto-merge enabled for safe updates

### Workflow Permissions
All workflows have minimal required permissions:
- `contents: write` - For merging PRs
- `pull-requests: write` - For PR management
- `actions: write` - For workflow cleanup

## Monitoring

### GitHub Actions Tab
- View automation runs and results
- Check for failed auto-merges
- Monitor cleanup activities

### PR Status
Use `pnpm pr:status` to get a quick overview:
- Open PRs count
- Recent workflow runs
- Dependabot PR summary

## Troubleshooting

### Common Issues

1. **Auto-merge not working**
   - Check if CI is passing
   - Verify PR is from dependabot
   - Ensure it's a patch/minor update

2. **Script permission denied**
   ```bash
   chmod +x scripts/pr-manager.sh
   ```

3. **GitHub CLI not authenticated**
   ```bash
   gh auth login
   ```

### Manual Intervention

If automation fails, you can always:
- Manually review and merge PRs
- Run cleanup scripts locally
- Adjust workflow schedules
- Modify auto-merge criteria

## Best Practices

1. **Regular Monitoring**: Check automation results weekly
2. **Security Updates**: Always review security-related PRs manually
3. **Major Updates**: Test major version updates in a separate branch
4. **Cleanup**: Run cleanup workflows if Actions tab gets cluttered
5. **Customization**: Adjust schedules and retention periods as needed

## Future Enhancements

Potential improvements:
- Slack/Discord notifications for merged PRs
- More granular auto-merge rules
- Integration with security scanning
- Custom PR templates for dependabot
- Automated changelog generation
