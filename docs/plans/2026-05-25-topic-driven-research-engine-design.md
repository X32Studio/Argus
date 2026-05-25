# Topic-Driven Research Engine — Design

**Date:** 2026-05-25
**Status:** Approved, ready for implementation plan

## Goal

把当前为 HF/MF 金融基础模型硬编码的 researcher / synthesis 双循环框架,改造成 **topic-driven** 引擎:任意用户在本地定义任意 topic,Claude 自主跑同等(或更好)的研究循环,前端按 topic.yaml schema 自适应渲染。

不做:多用户云平台、auth、跨 topic 视图、训练代码。

## 核心拆分

| 层 | 跨 topic 复用 | 位置 |
|---|---|---|
| Methodology(迭代规则、depth 标志、citation、矛盾处理、trust order、evidence-completion 边界) | ✅ | `.claude/loop.md`、`.claude/loop-summary.md` |
| Ontology + Scope(concept_layers、execution_routes、scope、recency、record schema、graph edge types、report sections) | ❌ | `topics/<slug>/topic.yaml` |
| 散文 framing(为什么是这 4 层、本领域 nuance、矛盾通常来源) | ❌ | `topics/<slug>/proposal.md` |
| Records / Report 产出物 | ❌ | `topics/<slug>/{records,indexes,sources,logs,summaries,report}/` |
| Dispatch stub(粘合 universal + per-topic) | ❌(生成) | `.claude/loops/<slug>.md`、`.claude/loops/<slug>-summary.md` |
| Frontend(React + Vite) | ✅ schema-driven | `app/`,路由 `/t/<slug>/...` |

## 目录(迁移后)

```
.claude/
├── commands/topic.md           # /topic init|accept|list
├── loop.md                     # universal researcher methodology
├── loop-summary.md             # universal synthesis methodology
└── loops/
    ├── <slug>.md               # stub
    └── <slug>-summary.md       # stub
topics/<slug>/
├── topic.yaml                  # canonical config
├── proposal.md                 # prose framing
├── records/{works_md,works_json}/
├── indexes/{master_index.jsonl,route_index.json,knowledge_graph.json}
├── sources/                    # gitignored
├── logs/{search_log.jsonl,research_state.md}
├── summaries/
└── report/{main.md,reference_index.md,iteration_log.md}
app/                            # React+Vite,通用
docs/plans/
log.md                          # engine-level,不进 topic
```

## topic.yaml schema(rich,顶层字段)

`meta`(slug/name/description/status/created_at/accepted_at)
`concept_layers[]`(每个 `{key, name, description}`)
`execution_routes[]`(每个 `{key, name, description, anchor_examples[]}`)
`scope_in[]` / `scope_out[]` / `recency_floor`
`record_fields[]` / `graph_edge_types[]` / `report_sections[]`
`iteration_mix: {new_min, deepen_min, challenge_min}`

Claude 生成时,不确定的字段标 `# UNCERTAIN: <reason>` 注释。

## 用户流程

```
/topic init "蛋白质结构预测中的几何深度学习"
  → Claude 用 AskUserQuestion 问 3-5 个关键问题(范围 / 必含 / 必排 / recency / 已知方法家族)
  → 生成 topics/<slug>/{topic.yaml, proposal.md} + .claude/loops/<slug>{,-summary}.md;status: draft
  → (可选)用户编辑
/topic accept <slug>      # status → accepted;stub 启动时 check 这个
/loop 2m loops/<slug>             # 研究员
/loop 15m loops/<slug>-summary    # 合成器
```

Stub 模板(~5 行):
```
TOPIC_SLUG=<slug>
Read .claude/loop.md (universal methodology).
Read topics/<slug>/topic.yaml + proposal.md (this topic's config and framing).
If topic.yaml status != accepted, stop with a message.
Execute one iteration scoped to this topic.
```

## 前端

- 单 React app,React Router
- 路由:`/`(topic picker)、`/t/<slug>`、`/t/<slug>/graph`、`/t/<slug>/works/<work-slug>`、`/t/<slug>/report`、`/t/<slug>/routes`
- Vite 把 `topics/<slug>/` 需要的内容(yaml + JSON + report)复制到 `app/public/topics/<slug>/`(沿用现 `app/public/research_scout/` 模式)
- 同一套组件:图例 / 分桶 / 字段标签全部读 `topic.yaml`

## 迁移

现金融内容全部 `git mv` 到 `topics/hf_mf_foundation/`。不保留旧路径兼容。

## 命令

MVP:`/topic init` / `/topic accept` / `/topic list`(一个 slash command 内部分发)
Deferred:`pause` / `resume` / `archive` / `delete` / `regen-proposal`

## 并行

多个 topic 可同时跑各自的 `/loop`(stub 自带 topic slug,无 hidden state)。

## 风险 & 已知 trade-off

- yaml 字段较多(~10 个顶层 key),Claude 生成时偶尔会把 nuance 塞错字段——靠 `proposal.md` 散文兜底
- `.claude/loops/` 目录文件随 topic 增长。原计划是 N×2 个 stub;**经 2026-05-25 amendment 改为 N×1**(见下)
- 当前金融 loop.md 里的 methodology 部分需要从域绑定文本里抽出来重写,这是 implementation 的主要工作量

---

## Amendment — 2026-05-25(post-initial-implementation):合并 stub

**Decision:** 把原计划"每个 topic 两个 stub(`.claude/loops/<slug>.md` + `.claude/loops/<slug>-summary.md`),用户跑两条 `/loop`"改成"每个 topic 一个 merged stub,用户跑一条 `/loop`"。

**为什么:** 一条命令开始一个 topic 比两条更 dummy-proof,且消除了 researcher 和 synthesis 两个 cron 在同一文件系统并发写入的潜在 race(records 写入和 report 写入可能同时发生 → 同时 `git push`)。

**怎么不会上下文错乱:** 合并 stub 在开头读 `topics/<slug>/logs/cycle.txt`(单整数),按 `next_cycle % topic.yaml.iteration_mix.synthesis_every_n_cycles == 0` 决定本次 iteration 的 mode(研究 OR 合成,二选一)。**只读对应 mode 的 methodology**(`.claude/loop.md` 或 `.claude/loop-summary.md`),不同时读两份。Mode 切换发生在 iteration 之间(每次 cron tick 是一个干净 session),不在 iteration 内部。心智隔离与原先两个 `/loop` 完全等价。

**新增字段:** `topic.yaml.iteration_mix.synthesis_every_n_cycles`(默认 7,对应原 2 min vs 15 min 节奏比)。

**新增 state:** `topics/<slug>/logs/cycle.txt`(单整数),每次 iteration 末写回。

**`/topic init` 行为更新:** 只生成一个 stub,初始化 `cycle.txt`,在 yaml 里写 `synthesis_every_n_cycles: 7`。

**`/topic accept` 行为更新:** 只校验单个 stub 存在;legacy `-summary.md` 若存在则一并删除。引导命令从两行变一行。

**遗留 trade-off:** 第 7 次循环单次时间会变长(合成器本身慢);如果合成器写报告时间超过 cron tick(2 min),下一次 tick 顺延而非堆积——Claude Code `/loop` 默认行为符合需要。紧急想强制跑合成器的场景未做(可后续加 `/topic synth <slug>`)。

---

## Amendment — 2026-05-25 (D):品牌对齐,`/topic` → `/argus`

**Decision:** 把 slash 命令文件 `commands/topic.md` 重命名为 `commands/argus.md`,所有内部 + 用户面文档里 `/topic init|accept|list` 改为 `/argus init|accept|list`。

**为什么:** 项目品牌已定为 Argus(2026-05-25 amendment C),命令名继续叫 `/topic` 跟 brand 脱节。改成 `/argus` 让用户视角"我用 Argus 这套工具"成立,natural-language skill 触发是主路径,`/argus` 显式命令是辅助路径,两条路径都说同一个名字。

**`/topic synth` 那条未来 backlog 也相应改为 `/argus synth`。**

**未触及:**
- `topics/<slug>/` 目录名(数据约定,不是命令名)
- `topic.yaml` 文件名(同上)
- React 组件命名(`TopicPicker`/`TopicContext`/`TopicNav` 是前端概念,跟 slash 命令解耦)
- 本设计文档主体内容(历史快照,保留 `/topic` 旧名作为记录;只在 amendment 节描述这次改动)

---

## Amendment — 2026-05-25 (E):skill 自动启动 dashboard

**Decision:** Argus skill 在 `/argus init` 成功后,**自动**(在 background)启动前端 dev server,只让用户敲一条 `/loop` 命令。原来 skill 明文禁止"don't start dev server",改成默认启动。

**为什么:** 之前禁止的理由是"session 关了进程会死"。但实际工作模式是 Claude Code session 一直开着(用户挂着工作),dev server 跟着活,完全 OK。强制让用户手动 `cd app && npm install && npm run dev` 多了一步且容易忘。

**新的 flow A 步骤 3(skill 自动做):**
1. `lsof -iTCP:5173 -sTCP:LISTEN -t` 查端口
2. 端口占用 → skip start,只打印 URL(从不 kill 别人的进程)
3. 端口空闲且 `app/node_modules` 缺失 → 同步跑 `npm install`(告知用户"~30s")
4. `cd app && npm run dev` 后台启动(`run_in_background: true`)
5. 等 3s,`curl -sf http://localhost:5173/topics/_index.json` 验证
6. 200 → 打印 URL;失败 → fallback 到手动命令

**安全边界(SKILL.md 显式列):**
- 永远不 kill 5173 上别人的进程
- npm install 失败不重试,fallback 到手动指引
- `/loop` 仍然永远要求用户显式触发(recurring cron 不自动起)

**User mental model 现在是:** "我说要追踪 X → 答几个问题 → 敲一条 /loop" —— 三步。dashboard / 安装 / 校验全部隐藏在 skill 内部。

---

## Amendment — 2026-05-25 (F):`/argus loop` 包装 `/loop`

**Decision:** 在 `/argus` 命令里新增 `loop` 子命令。用户面命令统一为 `/argus *`(init / accept / list / loop),不再让用户跨"argus 概念"和"Claude Code 通用 /loop 原语"两套 namespace。

**实现:** `/argus loop <slug>` 在 prompt body 里用 `Skill` 工具调用现有的 `loop` skill,参数透传为 `2m loops/<slug>`。等价于用户手敲 `/loop 2m loops/<slug>`,只是多了三段 validation(topic.yaml 存在 / status=accepted / stub 存在)和 auto-pick(单个 accepted topic 时不用打 slug)。

**为什么是 wrapper 不是 reimplement:** `/loop` 的调度机制(cron 注册 / self-paced 模式 / stop 语义)是 Claude Code 自己提供的,reimplement 会跟它的 future evolution 失同步。Wrapper 只负责:
- brand-aligned 名字
- topic 维度的 validation(loop 本身不知道 topic 概念)
- auto-pick(loop 本身不知道哪个是用户最近的 topic)

**Fallback 必须有:** 万一 `Skill` 工具调不动 nested skill,降级为"告诉用户手敲 `/loop 2m loops/<slug>`"——绝不让 `/argus loop` 失败时把用户卡死。

**保留:** 用户仍然可以直接 `/loop 2m loops/<slug>`,wrapper 不强制。raw 命令对熟 Claude Code 的人更直接,新手走 `/argus loop` 更友好。

**未触及:**
- `.claude/loop.md` 和 `.claude/loop-summary.md`(methodology files)里讨论"the `/loop` cron framework"的字眼——它们指的是 Claude Code 底层机制,不是用户面命令,改了反而混淆。
- `/argus init` 之后 skill 引导用户敲哪条命令(answer:`/argus loop`)。
