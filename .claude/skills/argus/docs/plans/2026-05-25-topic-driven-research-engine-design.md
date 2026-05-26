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

---

## Amendment — 2026-05-25 (G):cron + subagent 两层正交

**Decision:** cron 调度跟 subagent 并行**不是二选一,是分工**:
- **Cron(`/loop` 底层)** 管"何时触发 iteration":跨 session 存活,跨周持续,survives Claude Code 重启
- **Subagent(`Agent` 工具)** 管"一次 iteration 内如何加速":N 个候选并行读论文,parent collate 共享文件

加进 `.claude/loop.md`(universal researcher methodology)新一节 **"Parallel Deep-Read via Subagents"**。

**触发条件:** 本次 iteration 计划深读 ≥ 2 篇候选。1 篇直接 inline。

**核心安全规则——per-work isolation:** subagent 只写 `${TOPIC_DIR}/records/works_json/<slug>.json` 和 `works_md/<slug>.md`。**绝不**碰 `knowledge_graph.json` / `master_index.jsonl` / `route_index.json` / `research_state.md` / `search_log.jsonl` 等共享文件——否则并发写入 → race condition → 静默丢数据。共享文件由 parent 在 collation phase **单写者** 处理。

**Subagent 返回 schema:**
```json
{
  "slug", "title", "year", "analysis_depth",
  "proposed_graph_edges": [{src, dst, rel}, ...],
  "proposed_route_index_updates": { <route_key>: { ... } },
  "proposed_search_log_entry": { ... }
}
```
Parent 在 collation phase 把这些 proposed-* 合并写入共享文件。

**Synthesis loop 未变:** 合成器是 read-many-write-one 模式,并行化没意义。保持单线程。

**为什么这个设计是 skill 本质的延伸而不是替代:**
- Skill 整体保持自包含(templates + bootstrap)
- 调度仍然交给 Claude Code `/loop` 原语(`/argus loop` wrapper 已收口)
- Subagent 是"iteration 内的实现细节",写在 methodology prompt 里,跟 cron 完全解耦
- 任何 topic 自动受益,无需 per-topic 配置

**Trade-off:** subagent dispatch 增加单 iteration 的复杂度——parent prompt 必须处理并发失败、collation merge、潜在 slug 冲突 dedupe。文档里 failure handling 节明示了"一个失败不污染整批"。

---

## Amendment — 2026-05-25 (H):dedup gate + time budget(自限 + 观察)

**两件加进 `.claude/loop.md`(researcher methodology):**

### 1. 跨 iteration dedup gate

之前的设计假设 parent 在 plan 阶段隐式去重,但没强制。现在明文写在 Iteration Protocol step 8 / step 10:

- **Step 8 — Build the dedup ledger**:每次 iteration 必读 `master_index.jsonl` + list `records/works_json/`,建立"已覆盖 slug + 当前 depth"的快照
- **Step 10 dedup gate(三档)**:
  - 已 `deep` 的 slug:**SKIP**,绝不再派 subagent
  - 已 `shallow` 或 `medium`:eligible 走 depth-upgrade pass,parent 在 subagent prompt 里塞 `existing_depth: <X>`,subagent 知道是扩展不是从零写
  - 标题相似但 slug 不同:用**已存在的 slug**,不引入孤儿 slug-with-different-name 把 graph 分裂

**为什么 dedup 必须在 parent 做,subagent 不做:**
subagent 受 per-work isolation 规则约束——**只**碰自己的 `works_json/<slug>.json`,**不**读共享 index。如果 subagent 自己去查 dedup,要么破坏 isolation(读 index),要么 N 个 subagent 并发查同一份文件、各做各的判断、判断不一致。Parent 单点查询是唯一对的位置。

### 2. Time budget(两层)

**Subagent 层(self-enforced,硬):** prompt step 6 明示:>6 min 或 >20 turns → 必须降 depth 写 partial record 返回。**永远不要**为一篇 paper 烧无界 turn——其他并发 subagent 和下一次 cron tick 等着你返回。Partial record 永远比 hung subagent 强。

**Parent 层(observation,不杀):**
- 典型 iteration:2-4 min(N=2-3 subagent 并发,各 ~2 min)
- 上限:~10 min,超了就在 `research_state.md` 加 `## iteration_ran_long` heading 记一笔
- **不主动 kill subagent**——理由:杀 subagent 会留 half-written record 文件(虽然 per-work isolation 保证只有自己那份,但仍可能 partial JSON 不合法)。靠 subagent 自限是 primary defense,parent 只观察。
- Cron 节奏自然处理 overrun:`/loop 2m` 下次 tick 如果上一次没跑完,Claude Code 自然 queue/skip,无需手动干预

### 3. 失败 backoff

Subagent 失败 → log `result_status: subagent_failed` + `failure_count: N+1`。**同 slug 连续失败 3+ 次** → 后续 iteration 把它降级为 historical-anchor / low-priority,不再 retry。避免一个永远 fetch 不到的 source 无限拖累 iteration mix。

**为什么不上更重的 Monitor 工具:**
Claude Code 的 Agent 工具 background 模式用 notification model(任务完成自动 notify parent)——没有原生 "kill if stuck" API。要硬上 Monitor + ScheduleWakeup + 主动 kill 是真重的活,目前用 self-limit + observation 已经 cover 99% 的场景。真有 1% 的边界 case(subagent 完全 hung 不返回)出现频率高了再加 Monitor。

---

## Amendment — 2026-05-26 (I):parent Bash sleep watchdog —— 把"自然 backoff"升级为"硬上限"

**问题:** Amendment H 里说"parent 不杀,信任 cron 自然 backoff"。这在**完全 hung subagent 占着当前 cron tick session 不返回**的边界 case 失效——cron 下次 tick 进 queue 但本次 session 永远不结束,整条 research 链路卡死。Self-limit 是 subagent 自我约束,parent 没有硬强制。

**Decision:** 把 dispatch + collation 之间插入 **`Bash sleep 420`(7 min)** 作为 parent 端 wall-clock 硬上限。

### 具体改动

1. **Dispatch 改 background**:每个 Agent 工具 call 加 `run_in_background: true`,返回 task_id。Parent 不被任何单个 subagent 阻塞。

2. **新增 "Parent watchdog (Bash sleep)" 子节** 在 dispatch 和 collation 之间:
   ```
   Bash(command="sleep 420", run_in_background=false, timeout=450000)
   ```
   Bash 工具 foreground sleep 7 min,期间 Agent completion notifications 持续 queue 进 parent context。Sleep 结束 → parent 拿到的就是已返回的全部 results,**无条件**进 collation。

3. **Collation 阶段加 step 5 "Unnotified subagents"**:
   - 比对 N 个 dispatched task_id 跟实际拿到的 return values
   - 缺失的 → 写 `research_state.md` 的 `## subagent_unnotified` heading + timestamp + slug + task_id + `presumed_hung_or_slow`
   - Slug roll forward 进下次 iteration 的 candidate pool
   - **不杀** runaway subagent(没 kill primitive)——它会自己跑完(parent 已经 move on,return value 被丢弃)或被 Claude Code session 回收

### 三层 wall-clock guarantee

| 层 | 机制 | 触发 | 强度 |
|---|---|---|---|
| Subagent self-limit | prompt step 6,>6 min/>20 turns 必降 depth 返回 | LLM 自律 | soft(99% 场景生效) |
| **Parent Bash sleep watchdog** | `sleep 420` 强阻塞 7 min 后必进 collation | OS 级硬指令 | **hard** |
| Cron natural backoff | `/loop 2m` 下次 tick queue/skip | Claude Code 调度器 | hard,但只在当前 session 结束之后才生效 |

第二层是这次新加的关键。Self-limit 不可靠(subagent 可能 ignore 自己 prompt),cron backoff 只在当前 session 已结束后才有意义。**Bash sleep 是当前 session 内的唯一硬保障**。

### 代价

每个多-subagent iteration **至少**烧 7 min 钟表时间(即使所有 subagent 30 秒返回,sleep 一定要等满)。可接受,因为:
- Cron 触发的 iteration 非延迟敏感
- 多用的几分钟换来"parent 永远不被绑死"的硬保证
- 单 candidate iteration 不走 subagent 路径(inline 处理),不付这个成本

### 不解决的 case

Subagent 真的 hung → 还是 hung。Watchdog 只让 **parent 解套**,不能让 subagent 退出。Per-work isolation 保证 hung subagent 即使最终写文件,也只动 `works_json/<slug>.json`,不污染共享 index。下次 iteration 的 dedup gate 会注意到 stale write 然后或接受、或升级。

### 跟 Amendment H 的关系

H 说"parent 只观察不杀"——这是给 typical 场景定的策略。I 是 H 的**硬升级**:**显式 wall-clock 强制**,让 parent 有 unconditional exit。两个 amendment 不矛盾,I 把 H 的"观察"具体化为"sleep 420s 后必走"。

---

## Amendment — 2026-05-26 (J):Skill 本身成为 orchestrator,一终端一条龙

**触发用户反馈:** "我们直接在同一个 terminal 中把所有的事情全做完就行了"——之前 SKILL.md Flow A 末段仍然让用户手敲 `/argus loop <slug>` 才启动 research,这跟"skill 自动化一切"的预期不符。

**Decision:** Skill 本身成为 orchestrator,在用户的 Claude Code session 内**直接驱动 research loop**——不再让用户敲第二条命令。`/argus loop` cron 路径保留为"想跨 Claude Code 重启存活"的备选。

### 三层 subagent 隔离架构

```
Skill (orchestrator, 用户 session 内长期持有)
  └─ Iteration Runner subagent (per cycle, fresh context, run_in_background: true)
      └─ Paper Reader sub-subagent × N (parallel deep-read 内部,if N≥2 candidates)
```

- **Skill** context 只持有:用户原 topic 描述 + 每次 iteration 的 brief return summary(数百 token)+ cycle 计数
- **Iteration Runner** 在自己 isolated context 内跑完整一次 iteration,return schema 化 summary
- **Paper Reader sub-subagent** 是 runner 内部触发 Parallel Deep-Read 时派的(amendment G/H/I 设计复用)

### 用户面 UX 变化

之前:`说 topic → 答问题 → 敲 /argus loop <slug>`(两条命令)
现在:`说 topic → 答问题 → 单次 AskUserQuestion 选 in-session / cron / 不启动 → skill 自己跑`(一条命令)

### Orchestrator loop body(SKILL.md step 8 完整规范)

1. 读 `cycle.txt`,决定 mode(research / synthesis)
2. dispatch ONE iteration runner subagent(`run_in_background: true`,prompt 自包含)
3. `Bash sleep 420` watchdog
4. Parse 返回 summary;未返回写 `## iteration_runner_unnotified`
5. **Parent 单写者更新 cycle.txt**(runner 严禁碰)
6. Append `logs/orchestrator.jsonl` 一行
7. saturation counter:3 次连续 SYNTHESIS saturation_signal → STOP_SATURATED
8. `Bash sleep 30` 缓冲
9. Context self-check:>80% → STOP_CONTEXT,写 resume hint

### cycle.txt 单写者原则

跟 amendment G/H/I 的 per-work isolation 同结构:
- **Skill (orchestrator)** = in-session 模式下 `cycle.txt` 唯一写者
- **Stub `.claude/loops/<slug>.md`** = cron 模式下 `cycle.txt` 唯一写者
- **两种模式不能并存**——在 in-session loop 跑的时候不能再开 cron(双写者会打架);反之亦然。Skill 进 loop 前应当 lsof / `/schedule list` 检查(暂未强制,future improvement)。
- **Iteration Runner subagent** 任何模式下都禁止碰 cycle.txt

### 停止条件

- **STOP_USER**:用户 Ctrl+C / 关 session(state 全在 disk)
- **STOP_SATURATED**:连续 3 次 SYNTHESIS 报"无新方向"
- **STOP_CONTEXT**:parent 自检 context ~80%,写 resume hint 后停
- **STOP_BLOCKER**:无法 recover 的失败 → log + 报告

### 跟 Amendment F 的关系

F 把 `/argus loop` 包装 `/loop`——cron 路径的命令收口。J 不动那个;J 把"in-session orchestrate"作为**默认路径**,`/argus loop` 退为备路。用户的选择窗口在 Flow A step 5 的 AskUserQuestion 里。

### 代价(诚实记录)

- **Session 关 = loop 停**:跟 cron 路径的"OS 级跨重启"对比,in-session loop 是 session-bound。State 在 disk,resume 可行,但要用户主动重新触发 skill。
- **Parent context 上限**:即使三层隔离让 parent 只持轻量 summaries,每个 summary ~几百 token,跑 100+ iterations 仍可能撞 context limit。STOP_CONTEXT 是 graceful exit,不是 silent fail。
- **不解决"我电脑要关一晚"**:想让 research 整夜跑,选 `/argus loop` cron 路径;在 session 路径下 Claude Code 关电脑/锁屏可能也会暂停 session。
