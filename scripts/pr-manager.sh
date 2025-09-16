#!/bin/bash

# CourierX PR Management CLI
# Usage: ./scripts/pr-manager.sh [command] [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if gh CLI is installed
check_gh_cli() {
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is not installed. Please install it first:"
        log_info "brew install gh"
        exit 1
    fi

    # Check if authenticated
    if ! gh auth status &> /dev/null; then
        log_error "GitHub CLI is not authenticated. Please run:"
        log_info "gh auth login"
        exit 1
    fi
}

# List all dependabot PRs
list_dependabot_prs() {
    log_info "Fetching dependabot PRs..."
    gh pr list --author "dependabot[bot]" --json number,title,url,headRefName,mergeable,statusCheckRollup
}

# Auto-merge safe dependabot PRs
auto_merge_dependabot() {
    log_info "Processing dependabot PRs for auto-merge..."

    # Get all dependabot PRs
    prs=$(gh pr list --author "dependabot[bot]" --json number,title,headRefName,mergeable,statusCheckRollup --jq '.[] | select(.mergeable == "MERGEABLE" and (.statusCheckRollup | length == 0 or all(.conclusion == "SUCCESS")))')

    if [ -z "$prs" ]; then
        log_warning "No mergeable dependabot PRs found"
        return
    fi

    echo "$prs" | jq -r '.number' | while read -r pr_number; do
        pr_title=$(echo "$prs" | jq -r "select(.number == $pr_number) | .title")

        # Only auto-merge patch and minor updates
        if echo "$pr_title" | grep -qE "(patch|minor|chore\(deps\))"; then
            log_info "Auto-merging PR #$pr_number: $pr_title"

            # Approve and merge
            gh pr review "$pr_number" --approve --body "Auto-approved by PR manager script"
            gh pr merge "$pr_number" --squash --delete-branch

            log_success "Merged PR #$pr_number"
        else
            log_warning "Skipping PR #$pr_number (requires manual review): $pr_title"
        fi
    done
}

# Clean up old workflow runs
cleanup_workflows() {
    local days=${1:-30}
    log_info "Cleaning up workflow runs older than $days days..."

    # Trigger the cleanup workflow
    gh workflow run cleanup-workflows.yml -f days="$days"
    log_success "Cleanup workflow triggered"
}

# Bulk close stale dependabot PRs
close_stale_dependabot() {
    local days=${1:-60}
    log_info "Closing dependabot PRs older than $days days..."

    # Get old dependabot PRs
    old_prs=$(gh pr list --author "dependabot[bot]" --json number,title,createdAt --jq --arg days "$days" '.[] | select((now - (.createdAt | fromdateiso8601)) > ($days | tonumber * 86400))')

    if [ -z "$old_prs" ]; then
        log_warning "No stale dependabot PRs found"
        return
    fi

    echo "$old_prs" | jq -r '.number' | while read -r pr_number; do
        pr_title=$(echo "$old_prs" | jq -r "select(.number == $pr_number) | .title")
        log_info "Closing stale PR #$pr_number: $pr_title"

        gh pr close "$pr_number" --comment "Closing stale dependabot PR. A new one will be created if needed."
        log_success "Closed PR #$pr_number"
    done
}

# Show help
show_help() {
    cat << EOF
CourierX PR Management CLI

Usage: $0 [command] [options]

Commands:
    list                    List all dependabot PRs
    auto-merge             Auto-merge safe dependabot PRs (patch/minor updates)
    cleanup [days]         Clean up workflow runs (default: 30 days)
    close-stale [days]     Close stale dependabot PRs (default: 60 days)
    status                 Show repository status
    help                   Show this help message

Examples:
    $0 list                     # List all dependabot PRs
    $0 auto-merge              # Auto-merge safe dependabot PRs
    $0 cleanup 14              # Clean up workflow runs older than 14 days
    $0 close-stale 30          # Close dependabot PRs older than 30 days

EOF
}

# Show repository status
show_status() {
    log_info "Repository Status"
    echo

    log_info "Open PRs:"
    gh pr list --json number,title,author --jq '.[] | "  #\(.number) - \(.title) (@\(.author.login))"'
    echo

    log_info "Recent workflow runs:"
    gh run list --limit 5 --json displayTitle,status,conclusion,createdAt --jq '.[] | "  \(.displayTitle) - \(.status) (\(.conclusion // "running")) - \(.createdAt)"'
    echo

    log_info "Dependabot PRs:"
    dependabot_count=$(gh pr list --author "dependabot[bot]" --json number | jq length)
    echo "  Total: $dependabot_count"
}

# Main script
main() {
    check_gh_cli

    case "${1:-help}" in
        "list")
            list_dependabot_prs
            ;;
        "auto-merge")
            auto_merge_dependabot
            ;;
        "cleanup")
            cleanup_workflows "${2:-30}"
            ;;
        "close-stale")
            close_stale_dependabot "${2:-60}"
            ;;
        "status")
            show_status
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

main "$@"
