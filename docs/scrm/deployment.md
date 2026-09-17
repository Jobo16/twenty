# 部署拓扑与发布流程

## 已确定的第一阶段

第一阶段保持模块化单体：Node.js 24、Yarn 4 / Nx、NestJS / TypeORM、React / Vite、PostgreSQL 16、Redis 7 和 BullMQ。代码仍是一个单体仓库，运行时拆分为不同职责的进程。

| 环境 | 应用运行方式 | 数据与中间件 |
| --- | --- | --- |
| 本地 | 源码直接运行 Server、Worker、Front；Docker 只运行 PostgreSQL 与 Redis | 本机 Docker PostgreSQL 16、Redis 7 |
| 测试 | 单台主机 Docker Compose 分别运行 Server 与 Worker | 受管 PostgreSQL、Redis、对象存储 |
| 生产 | 单台主机 Docker Compose 分别运行 Server 与 Worker | 受管 PostgreSQL、Redis、对象存储 |

测试与生产使用彼此独立的主机、凭据、数据库、Redis 命名空间和对象存储前缀。应用部署不携带数据库、Redis 或对象存储容器，也不把持久化数据放在应用主机卷中。

## 生产 Compose 的目标形态

生产部署目录将只包含以下职责：

```text
Internet
  ↓ HTTPS
reverse proxy
  ├── Front / Server
  └── Worker（不暴露公网端口）
        ↓
managed PostgreSQL 16 · managed Redis 7 · managed object storage
```

- 反向代理在同一主机处理 TLS、静态前端和到 Server 的转发；Worker 不暴露公网端口。
- Server、Worker 和迁移使用同一个不可变应用镜像，通过不同命令启动，避免运行时代码漂移。
- Compose 必须通过 `SCRM_APP_IMAGE` 接收完整镜像引用（优先 digest）；镜像由受控构建流程推送至企业私有仓库或批准的缓存，仓库中不写具体镜像服务商地址或凭据。
- 连接串、对象存储端点、访问凭据和企业微信密钥由部署环境注入。入库文件只能提供变量名和无密钥示例。
- 所有服务使用健康检查、重启策略和结构化日志；应用实例不保存唯一业务状态。

## 迁移与发布顺序

每次发布以同一镜像版本执行以下顺序：

1. 拉取目标镜像并验证必需环境变量、受管服务网络连通性和备份状态。
2. 以 Compose 的一次性 `migrate` 服务执行数据库迁移。迁移成功前不得启动新版本 Server 或 Worker。
3. 启动或滚动重建 Server、Worker 和反向代理，等待健康检查通过。
4. 验证登录、基础 API、队列消费和关键日志；保留镜像版本、迁移结果和部署时间。

迁移是发布前一次性步骤，不由每个 Server 或 Worker 启动时自动执行。发生失败时停止后续启动，根据迁移的可逆性和发布记录决定回退；不得通过删除数据库或 Redis 数据恢复。

## 配置与职责边界

- `DATABASE_URL` 指向受管 PostgreSQL；版本要求 PostgreSQL 16。
- Redis / BullMQ 配置指向受管 Redis 7，键和队列名必须保留租户隔离前缀。
- 对象存储用于附件、会话媒体和导出文件，路径以租户或 Workspace 为首段，下载时重新鉴权。
- 测试与生产的配置文件、秘密和正式发布操作不保存在源码仓库。仓库提供 Compose 模板、变量示例、迁移命令和验证步骤。

实现生产 Compose 时以此文档为验收口径；具体目录与任务状态见[任务看板](task-management.md)。
