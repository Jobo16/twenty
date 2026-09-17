# SCRM 重建项目

本仓库从 Twenty 代码库分化为**独立的多租户企微 SCRM**。Twenty 是初始技术与产品底座，不是必须兼容的宿主平台。

项目保留值得复用的工作空间、元数据、视图、权限、工作流、API 和通用 UI，并围绕中国企业使用企微的方式重新设计客户身份、销售关系、来源归因、任务、SOP、漏斗和管理视图。

> 新开发者请从[本地开发说明](local-development.md)开始：那里讲清项目定位、与 Twenty 的关系、模块划分、当前优先级，以及一次命令启动与验证。

## 开发者入口

- **产品定位与关系**：为什么从 Twenty 分化，见[本地开发说明](local-development.md#这个项目是什么)。
- **模块地图**：[架构的模块边界](architecture.md#模块边界模块地图)。
- **当前优先级**：[开发待办](backlog.md)。
- **本机运行**：`./scripts/scrm/setup-local.sh` → `./scripts/scrm/yarn scrm:dev` → `./scripts/scrm/yarn scrm:stop`。

本地使用 Node.js **24**。首次运行 `./scripts/scrm/setup-local.sh`（即 `scrm:setup`）安装依赖、准备 `.env` 并初始化数据库；之后运行同一 Yarn 入口的 `scrm:dev` 启动 PostgreSQL、Redis、Server、Worker 和 Front；`scrm:stop` 停止基础设施。全部入口、前置条件与失败排查见[本地开发说明](local-development.md#一次启动)。

## 已建立的基础

- `packages/scrm-domain`：不依赖 NestJS、React、数据库和企微 SDK 的领域内核（模块地图见上）。
- 客户身份键：区分客户主体与企微、手机号、邮箱、业务系统身份。
- 销售归属变更：一次调用产生旧关系结束、新关系生效和历史事件，供服务层在同一事务持久化。
- 销售任务状态机：集中约束领取、执行、完成和取消。
- 租户资源键：为缓存、队列、对象存储和幂等记录提供统一命名输入。
- 生命周期报表事实：事件保存负责人、团队、渠道和活码的稳定 ID 与名称快照，历史报表不读取当前字段。
- 租户与权限判定：显式携带资源租户、成员状态与归属投影；没有可信租户上下文不会得到允许。
- SCRM CI：领域内核变化独立执行类型检查、单元测试和代码检查。

## 文档

- **本地开发**：[本地开发说明](local-development.md)（开发者入口）
- [产品定位：为什么从 Twenty 分化](adr/0001-diverge-from-twenty.md)
- [目标架构与模块地图](architecture.md)
- [租户、成员与权限领域规则](permissions.md)
- [开发待办与优先级](backlog.md)
- [上游代码使用策略](upstream-policy.md)
- [开发规范](development-standards.md)
- [任务看板](task-management.md)
- [仓库运行方式](repository-operations.md)
- [部署拓扑与发布流程](deployment.md)

日常开发统一在共享的 `test` 分支进行。任务看板中的状态文字是唯一认领记录；内部协作不使用
Issue、PR、功能分支或 worktree。
