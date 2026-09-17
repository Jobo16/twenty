# scrm-domain

SCRM 的领域内核包：**不依赖** NestJS、React、TypeORM、数据库、HTTP 或企微 SDK。

它只承载纯业务规则——状态机、历史事实、领域不变量，以及租户、身份、归属、来源、任务、权限等概念的类型与纯函数。持久化、权限、事务、outbox 与企微协议由外层应用服务（`packages/twenty-server/src/modules/scrm`）负责。

## 规则

- 只能依赖 TypeScript 标准能力与极少量无运行时工具；禁止依赖框架、数据库、HTTP 和企微 SDK。
- 只通过 `src/index.ts` 对外导出稳定、小而全的操作和类型。
- 每个子域以同名 `.ts` 暴露纯函数与类型，测试放在同目录 `*.spec.ts`。
- 依赖只允许外层指向本包，禁止本包读取外层 ORM Entity 或私有表。

## 子域地图

| 子域 | 目录 | 内容 |
| --- | --- | --- |
| 租户 | `tenant/` | `TenantContext`、租户资源键 |
| 客户 | `customer/` | 客户身份键、阶段 |
| 归属 | `assignment/` | 客户归属与归属变更（`transition-customer-owner`） |
| 生命周期 | `lifecycle/` | 生命周期事件与归属/来源快照 |
| 来源 | `source/` | 来源触点 |
| 任务 | `task/` | 销售任务状态机（`transition-sales-task`） |
| 权限 | `permissions/` | 客户访问策略 |
| 分析 | `analytics/` | 生命周期报表事实 |
| 企微 | `wecom/` | 企微连接与时间校验 |

## 测试与类型

```bash
yarn nx run scrm-domain:test
yarn nx run scrm-domain:typecheck
yarn nx run scrm-domain:lint
```

每次改动至少运行以上检查。新增子域请同时补同目录 `*.spec.ts`，覆盖允许与拒绝路径、跨租户、重复事件与历史快照。