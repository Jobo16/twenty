# SCRM 重建项目

本仓库从 Twenty 代码库分化为独立的多租户企微 SCRM。Twenty 是初始技术与产品底座，不是必须兼容的宿主平台。

项目保留值得复用的工作空间、元数据、视图、权限、工作流、API 和通用 UI，并围绕中国企业使用企微的方式重新设计客户身份、销售关系、来源归因、任务、SOP、漏斗和管理视图。

本地使用 Node.js 24。首次初始化运行 `./scripts/scrm/setup-local.sh`，之后运行 `node .yarn/releases/yarn-4.13.0.cjs scrm:dev` 启动 PostgreSQL、Redis、Server、Worker 和 Front；运行同一 Yarn 入口的 `scrm:stop` 停止基础设施。

## 已建立的基础

- `packages/scrm-domain`：不依赖 NestJS、React、数据库和企微 SDK 的领域内核。
- 客户身份键：区分客户主体与企微、手机号、邮箱、业务系统身份。
- 销售归属变更：一次调用产生旧关系结束、新关系生效和历史事件，供服务层在同一事务持久化。
- 销售任务状态机：集中约束领取、执行、完成和取消。
- 租户资源键：为缓存、队列、对象存储和幂等记录提供统一命名输入。
- 生命周期报表事实：事件保存负责人、团队、渠道和活码的稳定 ID 与名称快照，历史报表不读取当前字段。
- SCRM CI：领域内核变更独立执行类型检查、单元测试和代码检查。

## 文档

- [架构决策：从 Twenty 分化](adr/0001-diverge-from-twenty.md)
- [目标架构](architecture.md)
- [开发待办](backlog.md)
- [上游代码使用策略](upstream-policy.md)
- [Agent 分发任务 Prompt](agent-prompts.md)
- [开发规范](development-standards.md)
