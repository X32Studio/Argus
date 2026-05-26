<div align="center">

<img src="asserts/logo/logo.png" alt="Argus 吉祥物" width="220" />

# Argus

### 让庞杂领域长出一棵研究树

<p>
  <b>中文</b> · <a href="README.md">English</a>
</p>

<sub>by X32 Studio</sub>

</div>

---

有些问题不是问一次就能结束，也不是读几篇材料就能看清。

你可能在写综述、看一个开源生态、判断一个行业方向、跟踪政策变化，或者想弄清楚某家公司 / 某类技术到底发生了什么。越往下挖，分支越多：论文、项目、产品、人物、公司、法规、观点、反例，全都缠在一起。最麻烦的不是“再搜一次”，而是：

- 之前看过什么？
- 哪些结论比较可靠？
- 哪些线索互相矛盾？
- 哪些地方还没查清楚？
- 下一轮应该沿着哪条分支继续挖？

Argus 做的事很简单：你给它一个庞杂主题，它会一轮一轮往下挖，把找到的资料、线索、判断和疑问不断接到同一棵研究树上。

下次回来时，你不用重新开一个聊天、重新解释背景、重新找资料。你会看到这棵树已经长出了哪些分支、每个分支下面有哪些资料、现在能得出什么判断、还有哪些枝杈值得继续深入。

这一整套流程都被封装成**一个 Claude Code skill**。只要你有 Claude Code，就可以在一个窗口里让 Argus 带你完成设置、启动网页看板、开始研究循环，并持续更新报告。

**Many eyes. Never asleep.**

## 认识 Argus

<div align="center">
  <img src="asserts/comic/comic.png" alt="Argus 吉祥物漫画，展示长期研究循环" />
</div>

## 你会看到什么

Argus 不只是一个提示词。它会真正跑起来，也会给你一个能反复查看的研究工作台。

<table>
  <tr>
    <td width="33%" align="center">
      <img src="asserts/showcase/start.png" alt="Argus 在 Claude Code 中启动 topic 的流程" />
      <br />
      <sub><b>从一句话开始。</b><br />告诉 Argus 你想研究哪个复杂领域。它会问几个问题，然后建好第一棵研究树。</sub>
    </td>
    <td width="33%" align="center">
      <img src="asserts/showcase/dashborad.png" alt="Argus dashboard 知识图谱界面" />
      <br />
      <sub><b>看着研究树慢慢长出来。</b><br />资料不再是一堆链接，而是逐渐分出主题、路线、来源和关系。</sub>
    </td>
    <td width="33%" align="center">
      <img src="asserts/showcase/report.png" alt="Argus 生成的深度研究报告" />
      <br />
      <sub><b>阅读持续更新的深度报告。</b><br />每轮深入之后，报告会继续变厚、变准，并保留可以回查的引用。</sub>
    </td>
  </tr>
</table>

当你面对的不是一个小问题，而是一片需要反复进入、反复下钻的复杂领域时，用 Argus。

## 用大白话说

- Argus 会持续帮你找这个领域下有用的资料。
- 它会把发现留下来，而不是让信息消失在聊天记录里。
- 它会把重要想法、项目、来源和关系接到同一棵研究树上。
- 它会写一份解释当前情况的报告，并告诉你每个判断来自哪里。
- 它会发现报告里还不够扎实的地方，并把这些地方变成下一轮深入的方向。

## 快速开始

你不需要自己拼爬虫、数据库、向量库、定时任务和前端页面。安装一次 Argus 之后，它会在 Claude Code 里带你跑完整个流程。

### 你需要准备什么

- 已安装并登录的 **Claude Code**。
- **Git**，用来下载这个仓库。
- **Node.js / npm**，用来打开本地网页看板。需要时 Argus 会帮你执行 `npm install`。

### 第 1 步：只安装一次 Argus

在普通系统终端里运行：

```bash
git clone https://github.com/X32Studio/Argus.git argus
mkdir -p ~/.claude/skills
cp -r argus/.claude/skills/argus ~/.claude/skills/argus
```

安装后，你机器上的任何 Claude Code 窗口都能识别 Argus。

### 第 2 步：给一个研究主题建文件夹

建议每个长期研究主题都放在一个独立文件夹里。先创建文件夹，再在里面打开 Claude Code：

```bash
mkdir my-watch
cd my-watch
claude
```

### 第 3 步：启动一个研究主题

下面这条命令是在 **Claude Code 聊天窗口**里输入，不是在系统终端里输入：

```text
/argus init "open-source agent frameworks"
```

你也可以用自然语言启动：

```text
I want to long-term track open-source agent frameworks
```

Argus 会问几个简单问题，创建主题文件，启动网页看板，然后问你要怎么运行研究循环。

如果你不知道选哪个，就在 Claude Code 里选择这个选项：

```text
Run it here in this session
```

这是 Claude Code 里的选项，不是系统终端命令。它是新手路径。保持这个 Claude Code 窗口开着，Argus 就会持续跑研究迭代。你可以在浏览器里打开网页看板：

```text
http://localhost:5173/t/<slug>
```

`<slug>` 是 Argus 自动生成的主题短名，比如 `open-source-agent-frameworks`。

例如：

```text
http://localhost:5173/t/open-source-agent-frameworks
```

### 可选：另开一个终端跑循环

只有当你想让循环单独待在另一个 Claude Code 窗口里，比如过夜运行时，才需要这个方式。

在第一个 Claude Code 窗口里，选择下面其中一个选项：

```text
Hand off to cron via /argus loop
```

或者：

```text
Just finish topic creation
```

然后在同一个研究文件夹里另开一个终端：

```bash
cd my-watch
claude
```

在第二个 Claude Code 聊天窗口里输入：

```text
/argus loop <slug>
```

如果这个文件夹里只有一个已接受的主题，也可以直接输入：

```text
/argus loop
```

停止循环：

```text
/argus loop stop
```

## 工作原理（看不懂也没关系）

```text
Skill orchestrator
  -> Iteration Runner subagent
    -> Paper Reader sub-subagents
  -> validator
  -> dashboard refresh
```

每一轮结束后，Argus 都会检查自己写出的文件格式。能自动修的就自动修；不能自动修的问题会写进日志，留给下一轮继续处理。

每个研究主题的输出都在普通文件夹里：

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

如果你想改 Argus 引擎本身，优先修改 `.claude/skills/argus/templates/`，然后运行 `bash .claude/skills/argus/scripts/bootstrap.sh` 同步到运行目录。

## 状态

目前适合个人长期研究和信息跟踪使用。Argus 不绑定具体领域；仓库里的示例只是展示，不是重点。

维护者：**k-x32**。Fork 之后运行 `/argus init "<your topic>"` 就可以开始。

<div align="center">
  <sub>A hundred eyes. Never asleep.</sub>
</div>
