# SCRM 任务看板

这是 Issue 编排和 PR 验收的入口。我会只为**当前可以同时开工、且只依赖已合入 `main` 的任务**创建 GitHub Issue。不满足前置条件的工作只保留在 [开发待办](backlog.md)，不会提前创建可领取 Issue。

分发时，你只需要把 [统一 Agent 提示词](agent-issue-prompt.md) 原样发给 Agent，并把其中的 `ISSUE_NUMBER` 替换为对应编号。Agent 会自行领取、建立认领锁、开发并提交 Draft PR；我负责 Issue 范围、认领冲突、PR 审查、验收和下一批任务。

## 当前分发队列

| 编号 | 状态 | 负责人 | 交付 |
| --- | --- | --- | --- |
| T01 | 验证中 | Codex | [P0 PR #11](https://github.com/Jobo16/twenty/pull/11)，最新 SCRM CI 运行中 |

当前没有可再分配给 Agent 的任务。P0 进入 `main` 后，我会基于新的稳定基线创建下一批互不影响的 GitHub Issue。

## T01：建立 P0 产品基线与仓库运行入口

**负责人：Codex。状态：验证中。** 已更新现有 `scrm/issue-1-product-shell` 分支和 PR #11，不新建重复 P0 PR。

范围：补齐 `scrm-domain` 的 Yarn workspace 锁文件、领域包 lint 配置、原生 Jest/Nx 验证、类型检查兼容性与格式；建立项目根 README、贡献与安全入口、代码所有者、Issue/PR 模板、
仓库运行文档；移除会调用上游 Twenty 基础设施的继承自动化，避免本项目的 PR 和 main CI 产生无效失败。

验收命令：

```bash
yarn install --immutable
yarn nx run scrm-domain:typecheck
yarn nx run scrm-domain:test
yarn nx run scrm-domain:lint
git diff --check origin/main...HEAD
```

此前 GitHub [CI SCRM Domain](https://github.com/Jobo16/twenty/actions/runs/35185886381) 已通过依赖安装、类型检查、测试和 lint；本次扩展后以 PR #11 最新 CI 为准。

## 分发规则

- 每项新任务从已合入的 `main` 创建独立分支和 worktree，不引用其他未合入 PR、携带基线提交或共享工作区的未提交文件。
- 同一批任务拥有不重叠的目录；公共出口、根配置、迁移和共享测试配置由单独集成任务处理。
- Agent 交付 Draft PR，描述中必须包含关联 Issue、提交 SHA、修改文件、实际验证、配置/数据库影响和未覆盖风险。
- Agent 通过 `agent:ready` → `agent:claimed` 领取任务；认领留言的先后决定任务归属。具体操作见 [统一 Agent 提示词](agent-issue-prompt.md)。
- 我审查并更新 Issue、标签与本看板后，才会创建下一批可领取 Issue。

## 当前 PR 验收队列

这些 PR 暂不合入，等待 T01 的稳定基线：

| PR | 内容 | 合入前动作 |
| --- | --- | --- |
| [#9](https://github.com/Jobo16/twenty/pull/9) | P1 租户与权限 | 以新 main rebase，删除携带 P0 基线和共享出口改动 |
| [#10](https://github.com/Jobo16/twenty/pull/10) | P6 会话存档与 AI 证据 | 以新 main rebase，复核对外拒绝原因是否泄露跨租户信息 |
| [#12](https://github.com/Jobo16/twenty/pull/12) | P4 侧边栏与任务触发 | 以新 main rebase，移除共享 `src/index.ts` 改动 |

[P0 PR #8](https://github.com/Jobo16/twenty/pull/8) 是已关闭的较早快照；保留 PR #11 作为 P0 验收入口。
