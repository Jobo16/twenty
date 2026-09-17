# 本地开发说明

这篇文档面向第一次接触本仓库的开发者：它说明这个项目是什么、与 Twenty 的关系、模块如何划分、当前优先级，以及怎样在本机启动、验证和测试。这是开发者入口文档，技术规范细节见
[开发规范](development-standards.md)，目标架构见 [架构](architecture.md)。

## 这个项目是什么

`twenty-scrm` 是一个从 Twenty 代码库分化而来的独立、多租户、以企业微信（企微）为主入口的 SCRM 产品，
服务中国企业。Twenty 是这个仓库的初始技术与代码底座，**不是必须兼容的宿主平台**：我们不承诺无冲突合并上游
新版本，上游更新按价值、风险和许可逐项评估。详见 [ADR 0001](adr/0001-diverge-from-twenty.md)
和 [上游代码使用策略](upstream-policy.md)。

一句话定位：**面向中国企业、以企微为主入口的多租户 SCRM，在 Twenty 的工程能力之上按 SCRM 的真实边界演进。**

## 与 Twenty 的关系

- 复用其值得保留的工程能力：Nx 单体仓库、Yarn 4、元数据、视图、权限、工作流、API 和通用 UI。
- 不复用其领域模型：客户身份、销售归属、来源归因、任务、SOP、漏斗围绕中国企业 + 企微重新设计。
- 上游处理不是自动合并，而是人工评估；详见 [上游代码使用策略](upstream-policy.md)。

## 模块边界

责任划分坚持“领域内核 + 应用服务 + 基础设施适配 + 读模型 / 界面”。依赖只能由外层指向内层。

| 层 / 模块 | 位置 | 职责 | 不可以依赖 |
| --- | --- | --- | --- |
| 领域内核 | `packages/scrm-domain` | 状态机、历史事实、领域不变量、租户 / 身份 / 归属 / 任务规则 | NestJS、React、数据库、HTTP、企微 SDK |
| 应用服务 | `packages/twenty-server/src/modules/scrm` | 事务、权限、存储、outbox、任务编排 | 前端状态、企微 SDK 业务细节 |
| 企微接入 | `packages/twenty-server/src/modules/scrm/infrastructure` | 授权、验签、回调、同步、限流、幂等 | 绕过领域规则直接实现业务决定 |
| 读模型 / 界面 | `packages/twenty-server/src/modules/scrm/read-models`、`packages/twenty-front/src/modules/scrm` | 面向用例的读模型和 API、销售 / 管理 / 运营界面 | 直接改写业务聚合、依赖数据库内部结构 |

第一阶段保持模块化单体，不需要拆成五个独立部署服务。领域内核的当前入口与导出见 `packages/scrm-domain/src/index.ts`，
子域代码位置见[架构的模块边界](architecture.md#模块边界模块地图)。

## 当前优先级

按业务闭环排序的完整清单见 [待办](backlog.md)。

- **P0（本 Milestone）**：独立产品基建 —— fork、领域内核、本地启动入口、SCRM 域包 CI。产品壳 + 开发者入口是这里的首个可审查交付。
- **P1**：租户、组织与权限。
- **P2**：企微连接与回调边界。
- **P3**：客户主档与归属变更。
- **P4**：企微侧边栏、任务与 SOP。
- **P5**：管理看板、漏斗与稳定报表事实。
- **P6**：会话存档、隐私与 AI 证据边界。

每项都已有对应的父 Issue 和 [可分发任务 Prompt](agent-prompts.md)。

## 本地开发前提条件

| 依赖 | 要求 | 失败时会怎样 |
| --- | --- | --- |
| Docker | 已安装并在运行 | `scripts/scrm/setup-local.sh` 立即报错 "Docker is required." |
| Node.js | **24**（精确主版本） | 脚本报错 "Node.js 24 is required; found …" |
| Yarn 4 | 仓库自带的 `.yarn/releases/yarn-4.13.0.cjs` | 不需要全局安装 |
| 网络 | 能访问 npm registry 与 `registry.npmjs.org` | `yarn install` 失败时需检查代理 / 镜像 |

> 不依赖任何真实企业微信凭据或 sandbox 配置。企微接入是后续 P2/P4 的内容，
> 本里程碑本地启动只用 PostgreSQL + Redis + Server + Worker + Front。

## 一次启动

```bash
# 首次初始化：安装依赖、准备 .env、拉起 PostgreSQL/Redis 并初始化数据库
node .yarn/releases/yarn-4.13.0.cjs ./scripts/scrm/setup-local.sh
# 或等价入口
node .yarn/releases/yarn-4.13.0.cjs scrm:setup

# 启动基础设施（PostgreSQL/Redis）+ Server + Worker + Front
node .yarn/releases/yarn-4.13.0.cjs scrm:dev

# 停止本地基础设施
node .yarn/releases/yarn-4.13.0.cjs scrm:stop
```

`scrm:dev` 等价于：先 `docker compose -f packages/twenty-docker/docker-compose.dev.yml up -d --wait`
来保证数据库就绪，再 `yarn start` 启动前后端与 Worker。

### 常见启动失败排查

- **`setup-local.sh` 报 Node 版本错误**：当前 Node 不是 24。用 nvm 切换到 node 24 后再跑：
  `nvm install 24 && nvm use 24`，然后重新执行 setup。
- **`docker compose up` 失败**：确认 Docker 已启动；检查 `docker` 命令可用和当前用户有 Docker 权限。
- **数据库未初始化**：重新跑 `scripts/scrm/setup-local.sh`（会执行 `nx run twenty-server:database:init`）。
- **`yarn install --immutable`失败**：多为网络/镜像问题；修复网络后，其后再执行 setup。

## 验证本地是“真的可用”

启动完成后，能同时满足以下几点即认为本地入口可验证（不依赖真实企微凭证）：

1. `twenty-front` 页面可打开，Server 与 Worker 进程无报错。
2. 能登录本地账号（"Continue with Email" + 预填凭据）。
3. 领域包测试通过：`yarn nx run scrm-domain:test`、`:typecheck`、`:lint` 均通过。
4. 数据库里能创建 Workspace，且两个不同 Workspace 的数据可隔离（多租户验收项，属后续阶段逐步加固）。

## 测试入口

- 单个测试文件：`npx jest path/to/file.spec.ts --config=packages/scrm-domain/jest.config.mjs`
- 领域包全部测试：`yarn nx run scrm-domain:test`
- 类型检查 / Lint：`yarn nx run scrm-domain:typecheck`、`yarn nx run scrm-domain:lint`

> 注意：改变或编辑 `packages/twenty-shared` 后需先 `yarn nx build twenty-shared --skip-nx-cache`，
> 再在依赖它的包上做验证，否则可能看到陈旧结果。

## 复现耗时

- 首次：约 5–10 分钟（安装依赖 + 初始化数据库）。
- 二次：几十秒（服务已就绪则直接启动）。