# 参与 SCRM 开发

本仓库以清晰的 SCRM 边界和可审查交付为目标。开始前先阅读根目录
[README](../README.md)、[本地开发说明](../docs/scrm/local-development.md)和
[开发规范](../docs/scrm/development-standards.md)。

## 领取工作

只领取带有 `scrm` 和 `agent:ready` 标签的 Issue。将
[统一 Agent 提示词](../docs/scrm/agent-issue-prompt.md)中的 Issue 编号替换后发送给
Agent；提示词规定了认领、分支、验证和 Draft PR 的全部步骤。

认领成功的标志是 Issue 上最早的有效认领留言与 `agent:claimed` 标签。若 Issue 已被
认领、基线不是最新 `main`，或范围依赖未合入的 PR，停止实施并交回 SCRM 负责人处理。

## 开发与提交

- 从 Issue 指定的 `origin/main` 提交创建独立 worktree 和分支。
- 只改动 Issue 允许的目录；公共出口、根配置、迁移和共享测试夹具只能由专门的集成
  Issue 修改。
- 遵循租户隔离、历史事实、企微回调和隐私规则；不要将密钥、客户数据或生产数据写入
  仓库。
- 运行 Issue 指定的验证命令以及 `git diff --check <base>...HEAD`。
- 提交 Draft PR，正文写明关联 Issue、行为变化、修改文件、验证、数据库与配置影响、
  未覆盖风险。不要自行合入或关闭 Issue。

## 审查

SCRM 负责人审查范围、验证结果和与其他任务的边界，并负责将合格 PR 合入 `main`。
已合入的基线才可以成为下一批并行任务的依赖。

## 安全与许可

安全漏洞不要公开提交 Issue，按[安全策略](SECURITY.md)报告。提交代码即表示你确认有权
提交该内容，并同意其按仓库适用许可提供；更多说明见[贡献条款](CLA.md)。
