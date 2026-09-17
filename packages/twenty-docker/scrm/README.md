# SCRM 单机 Compose 部署

此目录只部署应用层：反向代理、Server、Worker 和一次性 `migrate`。PostgreSQL 16、Redis 7 与对象存储由外部受管服务提供；这里绝不能新增 `db`、`redis` 或对象存储容器。

## 准备

在测试或生产主机的仓库检出中复制环境模板：

```bash
cd packages/twenty-docker/scrm
cp .env.example .env
```

由环境负责人通过受管密钥服务填充 `.env`。至少确认：

- `SCRM_APP_IMAGE` 是当前发布的应用镜像完整引用，生产优先使用 digest；
- `SCRM_PROXY_IMAGE` 是批准的反向代理镜像完整引用；
- 公网 DNS 已指向当前主机，`SCRM_PUBLIC_HOST`、`SCRM_TLS_EMAIL` 与 `SERVER_URL` 一致；
- `PG_DATABASE_URL`、`REDIS_URL` 与对象存储变量连接的是本环境受管服务；
- 加密密钥来自密钥服务，且轮换时保留有效的回退密钥。

测试和生产使用不同的主机、`.env`、数据库、Redis 命名空间和对象存储前缀。

## 发布

从仓库根目录运行：

```bash
./scripts/scrm/deploy config
./scripts/scrm/deploy migrate
./scripts/scrm/deploy up
```

`migrate` 是发布前唯一允许执行迁移和注册计划任务的步骤。只有它成功后才执行 `up`；Server 和 Worker 的自动迁移已被显式关闭。一次完整发布可使用 `./scripts/scrm/deploy deploy`，它会拉取镜像、运行迁移并启动应用服务。

检查状态与日志：

```bash
./scripts/scrm/deploy ps
./scripts/scrm/deploy logs server worker proxy
```

停止应用而保留 Caddy 证书状态：

```bash
./scripts/scrm/deploy down
```

部署由环境负责人执行。不要在此目录、Git 提交、任务记录或日志中保存真实 `.env` 内容。
