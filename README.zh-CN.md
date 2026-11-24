<div align="center">

<img src="asserts/logo/logo.png" alt="Argus mascot" width="200" />

# Argus 2.0

### 通用深度探索与 JEV 决策情报引擎——从稀缺资源针尖猎寻，到大规模竞品分析与不确定性下的决策裁决。

<p>
  <b>中文</b> · <a href="README.md">English</a> · <a href="https://x32studio.com">X32 Studio</a> · <a href="https://github.com/X32Studio/self-loop">self-loop</a>
</p>

<sub>作者：<a href="https://github.com/k-r33">Ruiyuan Kang (k-r33)</a> @ <a href="https://x32studio.com">X32 Studio</a>（Kang 和他的 Agent 团队） · MIT 协议</sub>

</div>

---

> **一切深度搜索的底层第一性需求只有两件事：在不确定性下拿到能改变决策的关键证据，并为下游 Agent 组织沉淀可检索的活上下文——同时保护人最稀缺的 Attention。**

市面上的一次性 Deep Research 工具只擅长生成 30 页看似工整的长文，却天然倾向于把矛盾信息“圆滑写平”。在真实世界里，无论你是**寻找一个极度稀缺的一手资源**、**整合几十个竞品做全景分析**，还是**拍板一项高风险技术/战略决策**，Argus 2.0 都能持续生长一棵**保留冲突、带置信度与翻转条件的证据决策树**，并通过 **`gather` / `search`** 双入口直接喂给 [`self-loop`](https://github.com/X32Studio/self-loop) 或任何编码/战略 Agent。

**百眼常睁，永不沉睡。**

---

## 四大通用深度探索模式（Archetypes）

| 模式 | 适用场景 | 核心交付物 |
| --- | --- | --- |
| **`hunt`（稀缺猎寻）** | 找极其稀缺的一手资料、冷门仓库、精确 Benchmark、监管条文或隐蔽根因 | 经验证的一手命中 + 溯源链 |
| **`intel`（竞品与全景情报）** | 批量扫荡几十个竞品、定价、架构、更新日志与一线反馈，做系统整合 | 结构化竞品档案 + 全景关系图 |
| **`decision`（决策推演）** | 在不确定性下做技术选型、产品立项或投资判断 | 校准后的选项概率条 + **翻转条件（Flip Triggers）** |
| **`research`（持久研究树）** | 跨周持续追踪前沿论文、技术演进与长周期领域知识 | 不断复利的知识树 + 演化简报 |

---

## JEV 决策模型模式（`jev-hybrid` + 零依赖离线基线）

基于两层 **JEV（Judgment & Evidence Verification，判断与证据验证）** 协议（`/v1/jev`），Argus 2.0 把「**低成本疏导与裁决**」从「**重型 LLM 精读**」里彻底拆开：

1. **Layer 1 · JEV 快速路由与粗筛（`type: "noul"`, `output_tokens == 0`）**：在重型 LLM 精读前先毫秒级打分。只剔除明确无关噪音（`< 0.35`），**所有模糊/边缘信号（`0.35–0.70`）全部保留**，绝不静默误杀稀缺线索或潜在反例。
2. **Layer 2 · 概率聚合与冲突保留（`type: "choice"`, `PASS_FLOOR = 0.70`）**：在 `{support, refute, unknown}` 上输出归一化概率。只要权威信源存在直接矛盾，Argus **严禁伪造共识**——强制标记为 `contested`，并自动为下一轮探索生成高优先级消歧探针。
3. **Layer 3 · `gather` / `search` 双入口上下文协议**：同一套持久 Topic 资产，对外提供 `search`（精准猎寻）与 `gather`（面向下游 Agent 任务的紧凑上下文组装，附带精确路径、SHA-256 与冲突告警）。

> **开箱即用：** 默认自带确定性**离线基线（Offline Baseline）**，无需 GPU 或 API Key 即可 5 秒跑通 Demo 与全套测试；如本机部署了兼容 `/v1/jev` 协议的推理服务，只需配置 `ARGUS_JEV_ENDPOINT`、`ARGUS_JEV_MODEL_ID` 与 `ARGUS_JEV_KEY_FILE` 即可无缝切换实时 JEV 推理。

---

## 5 秒快速体验（无需 API Key）

```bash
git clone https://github.com/X32Studio/Argus.git
cd Argus
npm run demo
```

体验内置的「AI Coding Agent 竞品分析与架构决策」双入口上下文查询：

```bash
# 为下游 Agent（如 self-loop）组装任务上下文（gather 模式）
node engine/cli.mjs query --topic ai-coding-harness-selection \
  --task "cross-vendor coding agent verification gates" --mode gather --format md

# 精准检索稀缺线索（search 模式）
node engine/cli.mjs query --topic ai-coding-harness-selection \
  --task "L-0002 state machine false verdicts" --mode search
```

启动交互式控制台（知识图谱 + **Decision Board 决策面板** + 演化简报）：

```bash
cd app && npm install && npm run dev
# 打开 http://localhost:5173/t/ai-coding-harness-selection/decisions
```

---

## X32 Agentic 工程栈成员

由 **[Ruiyuan Kang (`k-r33`)](https://github.com/k-r33)** @ **[X32 Studio](https://x32studio.com)**（Kang 和他的 Agent 团队）公开构建：

- **L1 · [`self-loop`](https://github.com/X32Studio/self-loop)** — 把混乱的 Agent 乌合之众整编为可信赖、能直接交付的 Agent 组织
- **L2 · [`best-practice-for-skills-system`](https://github.com/X32Studio/best-practice-for-skills-system)** — 多 Skill 系统工程架构规范
- **L3 · `Argus`（本仓库）** — 通用深度探索、JEV 决策情报与 `gather`/`search` 上下文引擎
- **L4 · [`agent-dao-public`](https://github.com/X32Studio/agent-dao-public)** — 第一性原理专题长文《Agent 的过去、未来与宿命》
