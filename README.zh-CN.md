<div align="center">

<img src="asserts/logo/logo.png" alt="Argus 吉祥物" width="220" />

# Argus

### 不是回答一次，而是一直挖下去

<p>
  <b>中文</b> · <a href="README.md">English</a>
</p>

<sub>by X32 Studio</sub>

</div>

---

一次性 deep research 很适合演示，却不适合真正做研究。它会给你一份漂亮 brief，然后把线索都丢掉：哪些来源最关键，哪里互相矛盾，哪些判断还很浅，下一步应该继续查什么。

Argus 面向的是会复利的研究：文献综述、开源情报、行业地图、监管追踪、竞品研究、技术生态观察。你给它一个 topic，它会持续循环：寻找来源、写结构化记录、扩展类型化知识图谱、发布带引用的深度报告，再把报告里的薄弱点变成下一轮搜索计划。

这一切被封装成**一个 Claude Code skill**。只要你有 Claude Code，就可以打开一个窗口，让 Argus 带你完成 bootstrap、topic 设计、dashboard 启动、研究循环、校验和报告。

底层架构刻意保持简单：**data as backend**。每个 source record、graph edge、search log、synthesis brief 都是普通 Markdown / JSON / JSONL / YAML 文件。前端读取这些文件，把它们变成可探索的知识图谱和持续更新的深度报告。没有数据库，没有黑盒记忆，也没有云绑定。

**Many eyes. Never asleep.**

<div align="center">
  <video src="asserts/demo.mp4" controls muted width="100%"></video>
  <br />
  <sub>如果当前平台不渲染视频，可以 <a href="asserts/demo.mp4">直接打开 demo 视频</a>。</sub>
</div>

## 认识 Argus

<div align="center">
  <img src="asserts/comic/comic.png" alt="Argus 吉祥物漫画，展示长期研究循环" />
</div>

## 你会看到什么

Argus 不只是一个 prompt。它会给你一个真正跑起来的循环，也会给这套持续积累的知识一个可视化界面。

<table>
  <tr>
    <td width="33%" align="center">
      <img src="asserts/showcase/start.png" alt="Argus 在 Claude Code 中启动 topic 的流程" />
      <br />
      <sub><b>从一句话开始。</b><br />Argus 会收敛 topic，问关键问题，并带你选择运行方式。</sub>
    </td>
    <td width="33%" align="center">
      <img src="asserts/showcase/dashborad.png" alt="Argus dashboard 知识图谱界面" />
      <br />
      <sub><b>看着知识图谱长出来。</b><br />Records、routes、来源关系和薄弱点都会变成可导航结构。</sub>
    </td>
    <td width="33%" align="center">
      <img src="asserts/showcase/report.png" alt="Argus 生成的深度研究报告" />
      <br />
      <sub><b>阅读持续更新的深度报告。</b><br />新证据进来后，Argus 会持续改写 synthesis，并引用回 records。</sub>
    </td>
  </tr>
</table>

Argus 做得可爱，是为了让长期研究这件事没那么沉重。但底层循环很执着：一百只小眼睛会持续盯住论文、仓库、政策文件、博客、新闻、帖子，以及网络上所有值得追踪的线索。

当你要的不是一段回答，而是一套会在几天到几周里不断累积证据、关系和判断的研究资产时，用 Argus。

## 它会做什么

- **Scout** 新来源，并为每个来源写结构化记录。
- **构建知识图谱**，边类型包括 `contradicts`、`transferable_to`、`risky_for`、`suggests_experiment`、`belongs_to_route`。
- **生成综合报告**，每个关键判断都引用到具体 record 路径。
- **读取自己的薄弱点**，把“哪里还不够扎实”变成下一轮搜索计划。
- **所有状态都是普通文件**：Markdown、JSON、JSONL、YAML。没有数据库，没有云绑定，也没有黑盒向量库。

## 快速开始

你不需要自己拼 crawler、数据库、向量库、调度器和前端。安装一次 skill 之后，Argus 就能在一个 Claude Code 窗口里带你完成整个流程。

### 1. 只安装一次

```bash
git clone <this-repo> argus
mkdir -p ~/.claude/skills
cp -r argus/.claude/skills/argus ~/.claude/skills/argus
```

安装后，任何 Claude Code session 都能识别 Argus。

### 2. 创建一个 watch 目录

```bash
mkdir my-watch && cd my-watch
claude
```

### 3. 两种运行方式

#### 方式 A：一行启动 Argus，全程在当前 session 里跑

这是最省心的方式，适合第一次使用：一个 Claude Code 窗口，一句话，Argus 带你完成后面的所有步骤。

在 Claude Code 里直接说一句：

> “I want to long-term track open-source agent frameworks”

Argus 会自动：

1. 把引擎文件 bootstrap 到当前目录。
2. 问 3-5 个澄清问题。
3. 创建并接受 topic 配置。
4. 启动 `http://localhost:5173` dashboard。
5. 询问你要怎么运行循环。

选择 **Run in this session**。

保持这个 Claude Code session 开着，Argus 会直接在当前 session 里跑研究迭代，并把状态写入 `topics/<slug>/`。如果你关掉 session，循环会停，但文件都还在，之后可以继续恢复。

#### 方式 B：先创建 topic，再另开 terminal 跑 `/argus loop`

如果你希望循环由另一个 terminal 接管，或者想让它过夜、周末持续跑，用这个方式。

第一个 Claude Code session 里还是先说：

> “I want to long-term track open-source agent frameworks”

当 Argus 问你怎么运行时，选择 **Hand off to cron via `/argus loop`** 或 **Just finish topic creation**。

然后在同一个 watch 目录里另开一个 terminal：

```bash
cd path/to/my-watch
claude
```

在第二个 Claude Code session 里运行：

```text
/argus loop <slug>
```

如果当前目录里只有一个 accepted topic，也可以直接：

```text
/argus loop
```

停止循环：

```text
/argus loop stop
```

循环运行时打开 dashboard：

```text
http://localhost:5173/t/<slug>
```

## 工作原理

```text
Skill orchestrator
  -> Iteration Runner subagent
    -> Paper Reader sub-subagents
  -> validator
  -> dashboard refresh
```

每一轮迭代结束都会跑 `validate-contract.sh --fix`。能确定修复的 schema drift 会自动修复，不能自动修复的问题会写进日志，留给下一轮处理。

每个 topic 的输出都在普通文件夹里：

```text
topics/<slug>/
├── topic.yaml
├── proposal.md
├── records/{works_json, works_md}/
├── indexes/knowledge_graph.json
├── logs/{search_log.jsonl, research_state.md, cycle.txt, orchestrator.jsonl}
└── report/{main.md, reference_index.md, iteration_log.md}
```

## 仓库结构

```text
.claude/skills/argus/          # canonical engine source
├── SKILL.md                   # front door + orchestration loop
├── docs/                      # schema contract and plans
├── scripts/                   # bootstrap, refresh, validation
└── templates/                 # source templates copied into a watch directory

app/                           # dashboard source
asserts/                       # README images, prompt notes, demo video
```

修改引擎逻辑时，优先改 `.claude/skills/argus/templates/`，然后运行 `bash .claude/skills/argus/scripts/bootstrap.sh` 同步到运行目录。

## 状态

目前适合个人长期研究和情报跟踪使用。引擎本身不绑定领域；仓库里的示例只是展示，不是重点。

维护者：**k-x32**。Fork 之后运行 `/argus init "<your topic>"` 就可以开始。

<div align="center">
  <sub>A hundred eyes. Never asleep.</sub>
</div>
