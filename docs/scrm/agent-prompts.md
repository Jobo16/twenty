# SCRM 分发任务 Prompt 包

> **后续分发请使用 [任务看板](task-management.md)。** 它只保留当前可并行分发的任务；本文件保留为首批任务的历史设计记录。

这是一组可直接分发的首批任务。每个 Agent 只完成一个可审查的小交付，使用对应父 Issue 的 `Refs #编号`，不要在父 Issue 未完整完成时写 `Closes`。

项目从 Twenty 分叉后独立演进；可复用其工程能力，但不为持续合并上游牺牲 SCRM 的架构。目标是面向中国企业、以企业微信为主入口的多租户 SCRM。

## 每个任务附带的通用要求

```text
你正在为 twenty-scrm 完成一个可独立审查的子交付。

开始前：
1. 阅读仓库根目录的 AGENTS.md / CLAUDE.md，以及 docs/scrm/ 下相关文档。
2. 不要在共享的脏工作区修改。基于最新 origin/main 建立独立 worktree 和分支：
   git fetch origin main
   git worktree add ../twenty-scrm-issue-<编号>-<短名> -b scrm/issue-<编号>-<短名> origin/main
3. 只处理本任务范围。不要删除或重写他人的改动；不要合并、rebase 或推送 main；不要改动真实企微配置、密钥或生产环境。

实现原则：
- 建立明确的 SCRM 领域边界，不照搬 Twenty 的 CRM 术语或结构。
- 数据和操作必须有明确 tenant/workspace 边界，权限结论不能来自前端输入。
- 报表、归属、来源和阶段等历史事实必须保留发生时快照，不能被后来主数据变更回写。
- 改动保持小而完整，并为关键规则写测试。

交付要求：
1. 在自己的分支完成一个清晰的 Conventional Commit，例如 feat(scrm): add tenant permission domain rules。
2. 运行相称的检查并如实记录结果。
3. 有 GitHub 写入权限时：推送分支并创建指向 main 的 Draft PR，描述中写 Refs #<父Issue编号>；并在父 Issue 留评论，包含分支、commit SHA、PR、范围、验证、未覆盖项和风险。
4. 没有 GitHub 写入权限时：仍须保留提交，并新增 docs/scrm/delivery/issue-<编号>-<短名>.md，按上条格式记录交付信息；该文件随实现提交。

最终回复只包含：交付链接或 commit SHA、修改文件列表、验证结果、未完成项/风险。不得声称完成父 Issue，除非其所有验收项都完成。
```

## 可直接复制的任务

每个代码块都是一份完整 Prompt。P0 是基础包的独立交付，不能和后续任务并发。P0 合入后，P1 至 P6 从同一个新 `main` 并行开始；它们不依赖彼此的输出。

并行任务的文件所有权如下。Agent 不得修改其他任务的目录，也不得修改 `packages/scrm-domain/src/index.ts`、根 `package.json`、共享测试配置或迁移；这些公共改动由单独集成任务完成。

| 任务 | 独占目录 | 可读取的已合入基础 |
| --- | --- | --- |
| P1 | `packages/scrm-domain/src/tenant/**`、`packages/scrm-domain/src/permissions/**` | 基础类型与测试配置 |
| P2 | `packages/scrm-domain/src/wecom/**` | 基础类型与测试配置 |
| P3 | `packages/scrm-domain/src/customer/**` | 既有 identity、assignment、lifecycle 类型 |
| P4 | `packages/scrm-domain/src/sidebar/**` | 既有 identity、sales-task 类型 |
| P5 | `packages/scrm-domain/src/analytics/funnel/**`、`docs/scrm/reporting.md` | 既有 lifecycle fact 类型 |
| P6 | `packages/scrm-domain/src/archive/**`、`docs/scrm/archive-ai.md` | 基础类型与测试配置 |

### 任务 1：P0 产品底座与本地启动

**父 Issue：** [#1](https://github.com/Jobo16/twenty/issues/1)

```text
你正在为 twenty-scrm 完成一个可独立审查的子交付。

开始前：
1. 阅读仓库根目录的 AGENTS.md / CLAUDE.md，以及 docs/scrm/ 下相关文档。
2. 不要在共享的脏工作区修改。基于最新 origin/main 建立独立 worktree 和分支：
   git fetch origin main
   git worktree add ../twenty-scrm-issue-<编号>-<短名> -b scrm/issue-<编号>-<短名> origin/main
3. 只处理本任务范围。不要删除或重写他人的改动；不要合并、rebase 或推送 main；不要改动真实企微配置、密钥或生产环境。

实现原则：建立明确的 SCRM 领域边界；所有数据和操作需要明确 tenant/workspace 边界；报表、归属、来源和阶段等历史事实保留发生时快照；改动小而完整，并为关键规则写测试。

任务：完成 P0 的“产品壳与开发者入口”最小交付，Refs #1。

目标：让新开发者知道这是独立演进的多租户企业微信 SCRM，并能找到本地启动、测试和模块边界入口。

范围：
- 完善 docs/scrm/：产品定位、架构原则、模块地图、当前优先级和本地开发说明。
- 审查并补齐最低限度的本地启动脚本和面向 SCRM 域包的 CI；脚本需要明确前置条件和失败信息。
- 如需调整用户可见名称或文案，只动确定属于产品壳的少量位置，并保留 Twenty 的开源归属。

不在范围：全仓库品牌替换、删除 Twenty 模块、业务数据表、企业微信接入、依赖缓存和本机配置。

验收：文档能说明项目、与 Twenty 的关系、模块划分和本地验证；脚本通过语法检查；CI YAML 可解析；不依赖真实企微凭证。


交付：完成一个清晰的 Conventional Commit；运行相称检查并如实记录。推送分支并创建指向 main 的 Draft PR，描述写 Refs #<父Issue编号>；同时在父 Issue 留评论，包含分支、commit SHA、PR、范围、验证、未覆盖项和风险。没有 GitHub 写入权限时，仍保留提交，并新增 docs/scrm/delivery/issue-<编号>-<短名>.md 记录以上信息后提交。最终回复只包含交付链接或 commit SHA、修改文件、验证、未完成项/风险。
```

### 任务 2：P1 租户、组织与权限领域规则

**父 Issue：** [#2](https://github.com/Jobo16/twenty/issues/2)

**前置条件：** P0 的 `packages/scrm-domain` 基础包已合入 `main`。任务 2 至 7 都应从这一基线创建分支，不能与 P0 同时从尚未包含该包的基线开始。

```text
你正在为 twenty-scrm 完成一个可独立审查的子交付。

开始前：
1. 阅读仓库根目录的 AGENTS.md / CLAUDE.md，以及 docs/scrm/ 下相关文档。
2. 不要在共享的脏工作区修改。基于最新 origin/main 建立独立 worktree 和分支：
   git fetch origin main
   git worktree add ../twenty-scrm-issue-<编号>-<短名> -b scrm/issue-<编号>-<短名> origin/main
3. 只处理本任务范围。不要删除或重写他人的改动；不要合并、rebase 或推送 main；不要改动真实企微配置、密钥或生产环境。

实现原则：建立明确的 SCRM 领域边界；所有数据和操作需要明确 tenant/workspace 边界；报表、归属、来源和阶段等历史事实保留发生时快照；改动小而完整，并为关键规则写测试。

任务：完成 P1 的“租户与权限领域模型”最小交付，Refs #2。

目标：在 packages/scrm-domain 建立不依赖 HTTP、数据库和前端的租户、成员和权限判定规则。只修改 `src/tenant/**` 和 `src/permissions/**` 及其同目录测试；不要修改全局导出。

范围：
- 新增 tenant、organization/member、permission 模块及公开 API。
- 权限表达租户隔离、角色能力和本人/团队/全租户的数据范围；判定必须显式传入资源 tenant、归属人与团队上下文。
- 测试覆盖跨租户拒绝、三种数据范围和角色能力不足；只建立各自模块的本地导出。

不在范围：接入 Twenty 鉴权中间件、数据库迁移、界面、成员同步、通用 ABAC 条件语言。

验收：没有 tenant 上下文无法得到“允许”；测试清楚表达每种范围的判定依据。

交付：完成一个清晰的 Conventional Commit；运行相称检查并如实记录。推送分支并创建指向 main 的 Draft PR，描述写 Refs #<父Issue编号>；同时在父 Issue 留评论，包含分支、commit SHA、PR、范围、验证、未覆盖项和风险。没有 GitHub 写入权限时，仍保留提交，并新增 docs/scrm/delivery/issue-<编号>-<短名>.md 记录以上信息后提交。最终回复只包含交付链接或 commit SHA、修改文件、验证、未完成项/风险。
```

### 任务 3：P2 企业微信连接与回调边界

**父 Issue：** [#3](https://github.com/Jobo16/twenty/issues/3)

```text
你正在为 twenty-scrm 完成一个可独立审查的子交付。

开始前：
1. 阅读仓库根目录的 AGENTS.md / CLAUDE.md，以及 docs/scrm/ 下相关文档。
2. 不要在共享的脏工作区修改。基于最新 origin/main 建立独立 worktree 和分支：
   git fetch origin main
   git worktree add ../twenty-scrm-issue-<编号>-<短名> -b scrm/issue-<编号>-<短名> origin/main
3. 只处理本任务范围。不要删除或重写他人的改动；不要合并、rebase 或推送 main；不要改动真实企微配置、密钥或生产环境。

实现原则：建立明确的 SCRM 领域边界；所有数据和操作需要明确 tenant/workspace 边界；报表、归属、来源和阶段等历史事实保留发生时快照；改动小而完整，并为关键规则写测试。

任务：完成 P2 的“企业微信连接状态与回调入口规则”最小交付，Refs #3。

目标：定义企微集成的受控领域边界，覆盖凭据状态、回调幂等、租户映射和追溯性；不调用真实企微 API。只修改 `src/wecom/**` 及其同目录测试；不要修改全局导出。

范围：
- 在 packages/scrm-domain 定义 WeCom connection、授权状态、外部企业标识映射和 callback envelope 的类型与校验。
- 定义去重键和幂等结果：事件在映射到唯一 tenant 前不能进入业务处理。
- 为签名/解密等基础设施定义端口与错误边界；测试未知企业、跨租户、重复事件、无效状态转换。

不在范围：真实 token、企业 ID、回调 URL、密钥、应用注册、HTTP controller、消息队列。

验收：未验证的外部企业映射不能生成业务事件；重复 delivery 的处理结果稳定可测。


交付：完成一个清晰的 Conventional Commit；运行相称检查并如实记录。推送分支并创建指向 main 的 Draft PR，描述写 Refs #<父Issue编号>；同时在父 Issue 留评论，包含分支、commit SHA、PR、范围、验证、未覆盖项和风险。没有 GitHub 写入权限时，仍保留提交，并新增 docs/scrm/delivery/issue-<编号>-<短名>.md 记录以上信息后提交。最终回复只包含交付链接或 commit SHA、修改文件、验证、未完成项/风险。
```

### 任务 4：P3 客户、归属与销售工作域

**父 Issue：** [#4](https://github.com/Jobo16/twenty/issues/4)

```text
你正在为 twenty-scrm 完成一个可独立审查的子交付。

开始前：
1. 阅读仓库根目录的 AGENTS.md / CLAUDE.md，以及 docs/scrm/ 下相关文档。
2. 不要在共享的脏工作区修改。基于最新 origin/main 建立独立 worktree 和分支：
   git fetch origin main
   git worktree add ../twenty-scrm-issue-<编号>-<短名> -b scrm/issue-<编号>-<短名> origin/main
3. 只处理本任务范围。不要删除或重写他人的改动；不要合并、rebase 或推送 main；不要改动真实企微配置、密钥或生产环境。

实现原则：建立明确的 SCRM 领域边界；所有数据和操作需要明确 tenant/workspace 边界；报表、归属、来源和阶段等历史事实保留发生时快照；改动小而完整，并为关键规则写测试。

任务：完成 P3 的“客户主档与归属变更领域规则”最小交付，Refs #4。

目标：补足 packages/scrm-domain 的客户主档、客户身份合并和归属变更语义，使应用层一次业务动作能持久化当前状态与不可变历史。只修改 `src/customer/**` 及其同目录测试；可以读取既有领域类型，但不要修改它们或全局导出。

范围：
- 定义客户主档最小模型、跨企微身份关联约束和可审计的合并/冲突结果。
- 基于 assignment、identity、lifecycle，提供归属变更领域操作，产出当前归属更新信息和归属/来源/话码快照历史事件。
- 测试跨租户客户、同外部身份冲突、归属变更以及历史快照不随当前名称或归属改变。

不在范围：数据库事务、HTTP API、线索导入、派单策略和复杂去重算法。

验收：历史事件保留发生时的归属、团队、来源、话码；合并不能跨 tenant 或静默丢失冲突。

交付：完成一个清晰的 Conventional Commit；运行相称检查并如实记录。推送分支并创建指向 main 的 Draft PR，描述写 Refs #<父Issue编号>；同时在父 Issue 留评论，包含分支、commit SHA、PR、范围、验证、未覆盖项和风险。没有 GitHub 写入权限时，仍保留提交，并新增 docs/scrm/delivery/issue-<编号>-<短名>.md 记录以上信息后提交。最终回复只包含交付链接或 commit SHA、修改文件、验证、未完成项/风险。
```

### 任务 5：P4 企业微信侧边栏、任务与 SOP 会话状态

**父 Issue：** [#5](https://github.com/Jobo16/twenty/issues/5)

```text
你正在为 twenty-scrm 完成一个可独立审查的子交付。

开始前：
1. 阅读仓库根目录的 AGENTS.md / CLAUDE.md，以及 docs/scrm/ 下相关文档。
2. 不要在共享的脏工作区修改。基于最新 origin/main 建立独立 worktree 和分支：
   git fetch origin main
   git worktree add ../twenty-scrm-issue-<编号>-<短名> -b scrm/issue-<编号>-<短名> origin/main
3. 只处理本任务范围。不要删除或重写他人的改动；不要合并、rebase 或推送 main；不要改动真实企微配置、密钥或生产环境。

实现原则：建立明确的 SCRM 领域边界；所有数据和操作需要明确 tenant/workspace 边界；报表、归属、来源和阶段等历史事实保留发生时快照；改动小而完整，并为关键规则写测试。

任务：完成 P4 的“侧边栏会话上下文与任务触发规则”最小交付，Refs #5。

目标：建模侧边栏打开客户时的上下文和任务触发，避免人员切换、重复打开或客户不存在时写入错误客户。只修改 `src/sidebar/**` 及其同目录测试；可以读取既有领域类型，但不要修改它们或全局导出。

范围：
- 在 packages/scrm-domain 定义 sidebar session/context、客户解析结果、任务触发请求和幂等键。
- session 必须绑定 tenant、操作者、企微外部身份和客户解析结果；不完整或冲突上下文不能写入。
- 定义同一触发条件只创建一次任务的规则，并与现有 sales task 状态协调；覆盖重复打开、操作者切换、未解析客户、跨租户和重复触发。

不在范围：企微 H5、JS-SDK、消息发送、真实 SOP 编排和数据库持久化。

验收：任务决定可追溯至确定的 tenant、操作者和客户上下文；重复操作不产生重复任务决定。


交付：完成一个清晰的 Conventional Commit；运行相称检查并如实记录。推送分支并创建指向 main 的 Draft PR，描述写 Refs #<父Issue编号>；同时在父 Issue 留评论，包含分支、commit SHA、PR、范围、验证、未覆盖项和风险。没有 GitHub 写入权限时，仍保留提交，并新增 docs/scrm/delivery/issue-<编号>-<短名>.md 记录以上信息后提交。最终回复只包含交付链接或 commit SHA、修改文件、验证、未完成项/风险。
```

### 任务 6：P5 管理看板、漏斗和稳定报表事实

**父 Issue：** [#6](https://github.com/Jobo16/twenty/issues/6)

```text
你正在为 twenty-scrm 完成一个可独立审查的子交付。

开始前：
1. 阅读仓库根目录的 AGENTS.md / CLAUDE.md，以及 docs/scrm/ 下相关文档。
2. 不要在共享的脏工作区修改。基于最新 origin/main 建立独立 worktree 和分支：
   git fetch origin main
   git worktree add ../twenty-scrm-issue-<编号>-<短名> -b scrm/issue-<编号>-<短名> origin/main
3. 只处理本任务范围。不要删除或重写他人的改动；不要合并、rebase 或推送 main；不要改动真实企微配置、密钥或生产环境。

实现原则：建立明确的 SCRM 领域边界；所有数据和操作需要明确 tenant/workspace 边界；报表、归属、来源和阶段等历史事实保留发生时快照；改动小而完整，并为关键规则写测试。

任务：完成 P5 的“漏斗与稳定报表事实”最小交付，Refs #6。

目标：在 packages/scrm-domain 定义能抵抗渠道、销售、话码和团队名称变更的漏斗事实与聚合规则。只修改 `src/analytics/funnel/**`、同目录测试和 `docs/scrm/reporting.md`；不要修改现有 lifecycle fact 或全局导出。

范围：
- 基于 customer lifecycle fact，定义阶段转换事实、周期归属和来源/话码/归属人/团队快照。
- 提供纯函数聚合：按周期、阶段、归属和来源统计；明确新增或停用维度的历史口径。
- 测试来源/销售/话码变更后历史数字不变、新增来源或成员可出现、同一客户重复事件不重复计数。
- 补充报表口径文档，说明事实与当前主数据的职责。

不在范围：BI 页面、图表、实时数仓、权限接口、数据库迁移。

验收：统计只依赖事件快照与周期规则，不用当前客户字段重算历史；新增维度不破坏已有报表行。

交付：完成一个清晰的 Conventional Commit；运行相称检查并如实记录。推送分支并创建指向 main 的 Draft PR，描述写 Refs #<父Issue编号>；同时在父 Issue 留评论，包含分支、commit SHA、PR、范围、验证、未覆盖项和风险。没有 GitHub 写入权限时，仍保留提交，并新增 docs/scrm/delivery/issue-<编号>-<短名>.md 记录以上信息后提交。最终回复只包含交付链接或 commit SHA、修改文件、验证、未完成项/风险。
```

### 任务 7：P6 会话存档、隐私与 AI 证据边界

**父 Issue：** [#7](https://github.com/Jobo16/twenty/issues/7)

```text
你正在为 twenty-scrm 完成一个可独立审查的子交付。

开始前：
1. 阅读仓库根目录的 AGENTS.md / CLAUDE.md，以及 docs/scrm/ 下相关文档。
2. 不要在共享的脏工作区修改。基于最新 origin/main 建立独立 worktree 和分支：
   git fetch origin main
   git worktree add ../twenty-scrm-issue-<编号>-<短名> -b scrm/issue-<编号>-<短名> origin/main
3. 只处理本任务范围。不要删除或重写他人的改动；不要合并、rebase 或推送 main；不要改动真实企微配置、密钥或生产环境。

实现原则：建立明确的 SCRM 领域边界；所有数据和操作需要明确 tenant/workspace 边界；报表、归属、来源和阶段等历史事实保留发生时快照；改动小而完整，并为关键规则写测试。

任务：完成 P6 的“会话证据与 AI 输出边界”最小交付，Refs #7。

目标：建立会话存档、访问范围和 AI 结论证据的领域契约，使后续接入存档服务或模型时不会暴露未授权会话或无证据结论。只修改 `src/archive/**`、同目录测试和 `docs/scrm/archive-ai.md`；不要修改全局导出。

范围：
- 在 packages/scrm-domain 定义 conversation archive metadata、访问范围、脱敏状态、保留状态与 evidence reference。
- 定义最小 AI insight：结论必须引用同 tenant 且允许访问的会话证据；无法验证时返回可解释的拒绝或待处理结果。
- 测试跨 tenant 证据、过期/删除证据、脱敏要求和无引用结论；补充领域层边界文档。

不在范围：模型、向量库、对象存储、消息归档供应商、真实隐私数据和摘要 UI。

验收：AI 结论不能引用其他 tenant 或不可访问会话；审查者可以找到结论的最小证据引用与访问前提。


交付：完成一个清晰的 Conventional Commit；运行相称检查并如实记录。推送分支并创建指向 main 的 Draft PR，描述写 Refs #<父Issue编号>；同时在父 Issue 留评论，包含分支、commit SHA、PR、范围、验证、未覆盖项和风险。没有 GitHub 写入权限时，仍保留提交，并新增 docs/scrm/delivery/issue-<编号>-<短名>.md 记录以上信息后提交。最终回复只包含交付链接或 commit SHA、修改文件、验证、未完成项/风险。
```

## 审查顺序

先合入并审查 P0；随后 P1 至 P6 可以并行。每个交付独立分支和独立 Draft PR，主负责人评审后再决定挑选、合并或重做，避免共享工作区互相覆盖。
