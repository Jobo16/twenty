# SCRM 重建项目

这是一个面向中国企业、以企业微信为主要工作入口的多租户 SCRM。项目从
[Twenty](https://github.com/twentyhq/twenty) 代码库分化而来，保留其可用的工程能力，
并围绕客户身份、销售关系、来源归因、任务、SOP、漏斗和管理视图重新设计产品边界。

Twenty 是初始技术底座，不是兼容目标。本仓库不例行合并上游；每一项上游改动都必须按
价值、风险和许可单独评估。

## 当前状态

项目处于基础能力建设阶段，尚未提供可投入生产使用的企微接入、销售工作台或报表界面。
当前已建立独立的 SCRM 领域内核、本地开发入口、基础校验，以及面向 Agent 的 Issue 与
PR 协作方式。

## 本地开始

要求 Node.js 24 和正在运行的 Docker。首次运行：

```bash
node .yarn/releases/yarn-4.13.0.cjs scrm:setup
node .yarn/releases/yarn-4.13.0.cjs scrm:dev
```

停止本地基础设施：

```bash
node .yarn/releases/yarn-4.13.0.cjs scrm:stop
```

完整的前置条件、运行方式和排查路径见[本地开发说明](docs/scrm/local-development.md)。

## 文档入口

- [项目定位与上游策略](docs/scrm/adr/0001-diverge-from-twenty.md)
- [目标架构与模块地图](docs/scrm/architecture.md)
- [开发规范](docs/scrm/development-standards.md)
- [仓库运行方式](docs/scrm/repository-operations.md)
- [开发待办与优先级](docs/scrm/backlog.md)
- [任务看板](docs/scrm/task-management.md)
- [Agent 领取 Issue 的统一提示词](docs/scrm/agent-issue-prompt.md)

## 协作与交付

工作从可领取的 GitHub Issue 开始。Agent 必须先认领 Issue、建立认领锁，再在独立
worktree 中实现并提交 Draft PR。SCRM 负责人负责任务拆分、冲突处理、审查和合入。
详细流程见[贡献说明](.github/CONTRIBUTING.md)和[开发规范](docs/scrm/development-standards.md)。

不要在 Issue、PR、测试夹具或日志中提交企业微信密钥、客户正文、手机号或生产数据。
安全问题请遵循[安全策略](.github/SECURITY.md)。

## 来源与许可

本仓库保留原始 [LICENSE](LICENSE) 及其中适用的 AGPLv3、额外许可和第三方组件许可。
它与 Twenty 没有隶属或支持关系；Twenty 名称和商标的使用受上游
[商标政策](.github/TRADEMARK.md)约束。
