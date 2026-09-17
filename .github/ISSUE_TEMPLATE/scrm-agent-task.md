---
name: SCRM Agent task
about: A bounded, independently deliverable SCRM task for one Agent
title: '[SCRM] '
labels: ['scrm', 'agent:ready']
assignees: ''
---

## Goal

Describe the observable product or engineering result.

## Stable baseline

- Base branch: `main`
- Base commit: `<full origin/main SHA>`
- Dependencies already merged into this baseline: `<list or none>`

## Allowed file ownership

The Agent may add or modify only these paths:

- `<path>`

## Explicit exclusions

- Do not modify `<shared entry point, root config, migration location, or another module>`.
- Do not depend on an unmerged PR.

## Acceptance criteria

- [ ] `<observable behavior>`
- [ ] `<tenant / permission / historical fact / WeCom constraint as applicable>`
- [ ] `<test behavior>`

## Required validation

```bash
<exact command 1>
<exact command 2>
git diff --check <base commit>...HEAD
```

## Database and configuration impact

- Database: none / `<specific migration and local verification requirement>`
- Configuration: none / `<specific non-secret setting>`

## Delivery protocol

Use [`docs/scrm/agent-issue-prompt.md`](../../docs/scrm/agent-issue-prompt.md) to claim this Issue, create a Draft PR, and report the validation result. Do not merge or close this Issue.
