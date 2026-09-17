# SCRM Agent 统一领取提示词

每次只替换下方的 `ISSUE_NUMBER`，然后将全文发送给一个 Agent。多个 Agent 可同时领取不同的 Issue；同一 Issue 只允许一个 Agent 持有认领锁。

```text
你负责 GitHub 仓库 Jobo16/twenty 的 SCRM Issue #ISSUE_NUMBER。

先打开并完整阅读该 Issue、仓库根目录 CLAUDE.md 和 docs/scrm/development-standards.md。只以 Issue 中明确给出的基线、目录边界、排除项和验收标准为范围；不要自行扩展需求，不要修改未获授权的公共入口、根配置、迁移、共享测试夹具或其他模块。

开始前必须领取任务：
1. 确认 Issue 仍为 Open，且没有更早的有效“认领”留言，也没有 agent:claimed 标签。
2. 从 Issue 指定的 origin/main 基线创建独立 worktree 与分支，分支名使用 scrm/issue-ISSUE_NUMBER-<short-topic>。
3. 在 Issue 留言：`认领：<你的标识>；分支：<branch>；基线：<commit SHA>；worktree：<absolute path>`。
4. 将标签从 agent:ready 改为 agent:claimed。这个标签是认领锁；不要使用 GitHub 的“锁定会话”功能。
5. 如果上述任何一步失败、Issue 已被认领，或发现基线/范围不满足实施条件，立即停止，不写代码、不建 PR。在 Issue 留下简短原因（被占用时无需重复留言）。

实现时：
- 严格遵守 SCRM 的多租户隔离、历史事实、企微安全边界和测试要求。
- 只提交本 Issue 的改动；不要夹带格式化、依赖升级、翻译目录、生成文件或无关重构。
- 不使用真实企业微信凭据，不发布、不合并、不关闭 Issue。
- 需求越出目录边界或需要依赖未合入 PR 时，停止扩展，在 Issue 说明所需的后续集成工作。

完成后：
1. 运行 Issue 指定的验收命令和 git diff --check <base>...HEAD；如有无法运行的检查，说明原因和未覆盖范围。
2. 提交清晰的 commit，并推送分支。
3. 创建 Draft PR，标题格式：`feat(scrm): <具体行为> (#ISSUE_NUMBER)`；正文必须包含：关联 Issue、行为变化、修改文件、实际验证、数据库影响、配置影响、未覆盖风险。正文以 `Closes #ISSUE_NUMBER` 关联 Issue，但不要自行合入。
4. 在 Issue 留言 PR 链接和验证摘要；标签保持 agent:claimed，等待 SCRM 负责人审查。

最终只汇报：Issue 链接、认领状态、PR 链接、commit SHA、验证结果，以及阻塞项（如有）。
```

## 负责人发布 Issue 的最小内容

- 业务目标与完成后的可观察行为
- 基线：`origin/main` 的完整 commit SHA
- 文件所有权：允许新增或修改的目录
- 明确排除项和禁止修改的公共位置
- 验收命令、测试数据边界、数据库/配置影响
- 标签：`scrm`、`agent:ready`，以及必要的业务标签
