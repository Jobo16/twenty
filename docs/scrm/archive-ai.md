# 会话存档与 AI 证据边界

会话存档是租户数据里最敏感的一类：它包含客户与销售的真实对话、可能包含第三方内容，并且一旦被模型消费，就会扩散到会话参与者之外。因此本领域不把“会话内容”和“客户字段”放在同一个信任级别上，而是先定义一层可审查的证据契约。

本文只描述领域层契约。模型、向量库、对象存储、消息归档供应商、真实隐私数据和摘要界面不在范围内。

## 领域契约

| 类型 | 拥有的知识 |
| --- | --- |
| `ConversationArchiveMetadata` | 会话归属哪个 Workspace、连接和客户，参与成员、归档状态、脱敏状态、已归档消息游标与保留期限 |
| `conversationRetentionStatus` | 保留状态如何随评估时间变化：`RETAINED` / `EXPIRED` / `DELETED` |
| `ConversationAccessGrant` | 会话访问授权：谁授权、何时到期、对方是否已被告知 |
| `ConversationReviewContext` | 一次审查的全部前提：审查者、客户投影、授权集合和评估时刻 |
| `decideConversationAccess` | 会话内容能否被读取，以及依据是参与还是授权 |
| `ConversationEvidenceReference` | 结论指向哪段消息：会话 ID 与闭区间的消息序号 |
| `evaluateConversationEvidence` | 一条证据是否可用、能否引用、能否逐字引用，以及不可用的原因 |
| `AiInsightClaim` / `AiInsightResult` | 结论本身与三种结果：支持、拒绝、待处理 |
| `supportAiInsight` | 结论是否能被其引用的证据支撑 |

全部位于 `packages/scrm-domain/src/archive`。本文档与 `src/archive` 是任务 P6 的独占范围，包的全局导出由后续集成任务统一添加。

## 两个硬边界

### 结论只携带引用，不携带内容

`AiInsightResult` 的 `SUPPORTED` 分支只有 `claim`、`citations` 和 `excerptPolicy`，没有任何字段可以承载会话原文。结论“为什么成立”在领域里就是一个可重放的指针：

```text
conversationId + [fromSequence, toSequence]
```

审查者据此回到原始消息核对，而不需要领域层保存或转发正文。引用必然带 `workspaceId` 与 `accessBasis`，所以“结论属于哪个租户、当时凭什么被允许读取”可以独立复核。

`excerptPolicy` 决定下游能否把原文贴给读者：`QUOTABLE` 仅当归档未被脱敏（`RAW`）。归档为 `REDACTED` 时结论仍然成立，但只能以 `REDACT_ONLY` 呈现，不允许逐字引用；`WITHHELD` 则连结论都不成立。

### 无证据即拒绝

`evidenceReferences` 为空时返回 `REFUSED` 且原因为 `NO_EVIDENCE`，而不是降级成一条“弱结论”。同理，只要有一条引用永久不可用，整个结论被拒绝——引用了一条过期、已清除或跨租户证据的结论，不会被其余可用证据“救回”。

无法立即判定时返回 `PENDING`，语义是“稍后重试同一引用可能成立”，而不是任何一种拒绝。

## 访问前提

会话内容比客户字段多一道门槛。`decideConversationAccess` 依次要求：

1. 审查者不是 `PLATFORM_OPERATOR`。平台运维不因角色或组织重叠获得业务会话。
2. 审查者与归档属于同一 Workspace。这是第一层隔离，先于其他任何判断。
3. 会话已归属到客户。没有被解析到客户的会话（群聊、内部会话）不能承载客户级结论。
4. 客户投影已解析，且属于该会话的客户。投影带错客户是调用缺陷并直接抛错，避免用错误的归属关系判定访问。
5. 客户数据范围判定通过（复用 `decideCustomerAccess`）。销售本人、组长小组、部门负责人部门、租户管理员全企业。
6. 审查者是会话参与成员，或持有仍有效的授权。

授权必须同时满足：主体、Workspace 与会话一致，未过期，并且对方已被告知。未被告知的授权不开放内容——会话会被参与者以外的人读到，告知是授权的一部分而不是事后形式。

需要注意第 5 条与第 6 条的关系：**参与不等于范围**。一个参与过会话但已不负责该客户、或所属团队与该客户无关的成员，仍然会被拒绝。

## 不可用原因与可重试性

| 原因 | 含义 | 可重试 |
| --- | --- | --- |
| `INVALID_SEQUENCE_RANGE` | 引用不是从 1 开始的有序区间 | 否 |
| `CONVERSATION_NOT_FOUND` | 归档中没有该会话 | 否 |
| `CROSS_TENANT` | 会话属于其他 Workspace | 否 |
| `ACCESS_DENIED` | 访问前提不满足，`detail` 保留客户范围或授权层面的原因 | 否 |
| `CONTENT_DELETED` | 内容已清除 | 否 |
| `RETENTION_EXPIRED` | 已过保留期限 | 否 |
| `CONTENT_WITHHELD` | 内容被整体禁止读取 | 否 |
| `ARCHIVE_SUSPENDED` | 归档被显式停止，不会自行恢复 | 否 |
| `ARCHIVE_NOT_READY` | 归档仍在拉取该会话 | 是 |
| `SEQUENCE_NOT_ARCHIVED` | 引用的消息序号超过已归档游标 | 是 |

保留状态由 `conversationRetentionStatus` 在评估时刻推导，而不是存储字段：删除优先于保留窗口，窗口边界为闭区间。这样“已清除”不会因为期限未到而被重新读出来。

## 判定顺序

`evaluateConversationEvidence` 的顺序是契约的一部分：

```text
引用格式 → 归档存在 → 同租户 → 访问 → 清除 → 保留 → 脱敏 → 归档状态 → 消息游标 → 可用
```

“同租户”和“访问”排在其后所有判断之前是刻意的：没有访问权的审查者只能得到“拒绝”，不会从原因里推断出内容是否存在、是否过期、是否仍在入库。

## 后续接入点

以下工作仍需在应用层实现，本契约只固定它们的输入输出：

- 会话存档游标拉取、解密、消息幂等与补偿，负责把 `archivedThroughSequence` 推进到可信值。
- 媒体存储、语音转写与保留期限的执行（清除后写入 `deletedAt`）。
- 脱敏的执行，以及把归档状态置为 `RAW` / `REDACTED` / `WITHHELD` 的判定流程。
- 授权的申请、告知记录与审计。
- 模型调用、配额与成本控制，以及人工修正流程。
- 把 `src/archive` 的类型加入 `packages/scrm-domain/src/index.ts` 全局导出（本任务未修改该文件）。
