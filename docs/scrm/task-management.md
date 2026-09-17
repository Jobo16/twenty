# SCRM 任务看板

这是 Agent 分发和 PR 验收的唯一入口。我会只在这里放入**当前可以同时开工、且只依赖已合入 `main` 的任务**。不满足前置条件的工作只保留在 [开发待办](backlog.md)，不会提前生成可分发 Prompt。

## 当前分发队列

| 编号 | 状态 | 负责人 | 交付 |
| --- | --- | --- | --- |
| T01 | 进行中 | Codex | 更新 [P0 PR #11](https://github.com/Jobo16/twenty/pull/11) |

当前没有可再分配给 Agent 的任务。P0 进入 `main` 后，我会基于新的稳定基线生成下一批互不影响的任务和 Prompt。

## T01：修复 P0 基建并让 CI 成为可信门槛

**负责人：Codex。** 更新现有 `scrm/issue-1-product-shell` 分支和 PR #11，不新建重复 P0 PR。

范围：补齐 `scrm-domain` 的 Yarn workspace 锁文件、领域包 lint 配置、原生 Jest/Nx 验证、类型检查兼容性、Markdown 格式，以及本任务看板入口。

验收命令：

```bash
yarn install --immutable
yarn nx run scrm-domain:typecheck
yarn nx run scrm-domain:test
yarn nx run scrm-domain:lint
git diff --check origin/main...HEAD
```

## 分发规则

- 每项新任务从已合入的 `main` 创建独立分支和 worktree，不引用其他未合入 PR、携带基线提交或共享工作区的未提交文件。
- 同一批任务拥有不重叠的目录；公共出口、根配置、迁移和共享测试配置由单独集成任务处理。
- Agent 交付 Draft PR，描述中必须包含关联 Issue、提交 SHA、修改文件、实际验证、配置/数据库影响和未覆盖风险。
- 我审查并更新本看板后，才会把下一批 Prompt 写入这里供分发。

## 当前 PR 验收队列

这些 PR 暂不合入，等待 T01 的稳定基线：

| PR | 内容 | 合入前动作 |
| --- | --- | --- |
| [#9](https://github.com/Jobo16/twenty/pull/9) | P1 租户与权限 | 以新 main rebase，删除携带 P0 基线和共享出口改动 |
| [#10](https://github.com/Jobo16/twenty/pull/10) | P6 会话存档与 AI 证据 | 以新 main rebase，复核对外拒绝原因是否泄露跨租户信息 |
| [#12](https://github.com/Jobo16/twenty/pull/12) | P4 侧边栏与任务触发 | 以新 main rebase，移除共享 `src/index.ts` 改动 |

[P0 PR #8](https://github.com/Jobo16/twenty/pull/8) 是较早快照，不作为交付目标；T01 验收后由我关闭，保留 PR #11。
