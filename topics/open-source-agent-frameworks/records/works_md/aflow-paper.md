# AFlow (paper: Automating Agentic Workflow Generation via Search)

- Paper: arXiv:2410.10762 — "AFlow: Automating Agentic Workflow Generation"
- Venue: ICLR 2025 (oral); arXiv v4 dated 2025-04-15
- Code: https://github.com/FoundationAgents/AFlow
- Authors (14, 2 co-first, 2 co-corresponding): Jiayi Zhang*, Jinyu Xiang*, Zhaoyang Yu, Fengwei Teng, Xiong-Hui Chen, Jiaqi Chen, Mingchen Zhuge, Xin Cheng, Sirui Hong, Jinlin Wang, Bingnan Zheng, Bang Liu, Yuyu Luo†, Chenglin Wu†
- Affiliations: DeepWisdom; HKUST (Guangzhou) & HKUST; Renmin University of China; Nanjing University; Fudan University; KAUST; Universite de Montreal & Mila
- Corresponding: Yuyu Luo (yuyuluo@hkust-gz.edu.cn), Chenglin Wu (alexanderwu@deepwisdom.ai)

## 1. What this work actually does

AFlow is a meta-framework that **automatically discovers agentic workflows** rather than executing them. It reformulates "design an agentic workflow" as a search problem: the space is the set of all programs that connect LLM-invoking Nodes via code-represented Edges, and the objective is to maximize a task-specific evaluation function G (e.g., pass@1 on HumanEval, F1 on HotpotQA). AFlow navigates this space with a Monte Carlo Tree Search variant in which an LLM (Claude-3.5-Sonnet) acts as the mutation operator that rewrites workflow code. Across six reasoning benchmarks (HumanEval, MBPP, GSM8K, MATH lv5*, HotpotQA, DROP) the discovered workflows beat six manually-designed prompting baselines by 5.7% on average and the only other automated-workflow peer (ADAS) by 19.5%. The economic punchline: a workflow AFlow finds with GPT-4o-mini, when later executed on DeepSeek-V2.5, matches GPT-4o IO on HumanEval at **4.55% of the dollar cost**.

This is the same team that authored MetaGPT (ICLR 2024 oral), and AFlow is best read as the team's research answer to the critique that MetaGPT's Standard Operating Procedures are rigid and hand-coded — AFlow is the path toward **self-discovered SOPs**.

## 2. Technical mechanism (deep, paper-verified)

### 2.1 Problem formulation

An agentic workflow W is a series of LLM-invoking nodes N = {N_1, ..., N_i, ...} connected by edges E. Each node is parameterized by:
- **Model M** — which LLM to invoke
- **Prompt P** — task description / instruction
- **Temperature tau** in [0, 1]
- **Output format F** in {xml, json, markdown, raw} (paper cites Tam et al. 2024 for the importance of format)

Edges are evaluated through three representational options — Graph (e.g., GPTSwarm), Neural Network (e.g., DyLAN-style learned transitions), or Code. The paper argues code is the most expressive ("linear sequences, conditional logic, loops, and incorporate graph or network structures") and adopts code as the primary edge representation.

The search space S is then `{(N, E) | N = N(M, tau, P, F), E ∈ E}`. To make the search tractable, AFlow **fixes M, tau, and F** at search time and only searches over **prompts P_i and code edges E**, plus **Operator selection O_i**:

`S_AFlow = {(P_1, ..., P_n, E, O_1, ..., O_n) | P_i ∈ P, E ∈ E, O_i ∈ O}`

### 2.2 Operators — the reusable agentic primitives

To compress the search space further, AFlow defines a set O of reusable Operators that encapsulate common agentic patterns (predefined combinations of Nodes + edges with a unified interface). The paper's seven operators:

1. **Generate** — basic LLM call
2. **Format** — enforce structured output
3. **Review** & **Revise** — self-critique pattern (Madaan et al. 2023 Self-Refine)
4. **Ensemble** (a.k.a. ScEnsemble) — self-consistency vote (Wang et al. 2022)
5. **Test** — execution-grounded check (Zhong et al. 2024a)
6. **Programmer** — generate Python code and execute it with a timeout via `concurrent.futures.ThreadPoolExecutor` (the paper's Appendix shows a wrapper with "Exceed time limit" handling)
7. **Custom** — default basic node-construction operator; usable as a no-op fallback

Even with O = {Custom only}, AFlow still discovers strong workflows (ablation on GSM8K: 93.1% without operators, vs. better with the full operator set), demonstrating that operators are an **efficiency aid, not a requirement** for the search to converge.

### 2.3 MCTS variant

Each tree node represents a **complete workflow**, not an individual LLM call. The search loop (Algorithm 1 in paper):

```
Initialize W_0 = blank template; split D into D_V (20%) and D_T (80%); seed=42
W* <- W_0
for iteration = 1 to N_max (= 20):
    workflow <- Select(tree)              # soft mixed probability strategy
    child.workflow <- Expand(workflow, O) # LLM-based code mutation
    score <- Evaluate(child.workflow, G, D_V)  # 5 runs, mean + stddev
    Backpropagate(child.workflow, score)  # update tree experience
    Update W* if improved
    if ConvergenceCriteriaMet(): break
return W*
```

**Selection formula** (the paper's key novelty for avoiding local optima):

`P_mixed(i) = lambda * (1/n) + (1 - lambda) * exp(alpha * (s_i - s_max)) / Σ_j exp(alpha * (s_j - s_max))`

with `lambda = 0.2` (mix in uniform exploration), `alpha = 0.4` (softness of score-weighted exploitation). The initial workflow is always included in the top-k candidate set so the search can re-attempt from scratch — the "blank template" reset mechanism that prevents being trapped on a deep but suboptimal subtree.

**Expansion** uses an LLM optimizer (Claude-3.5-Sonnet) prompted with the selected workflow's full **experience**: every modification ever applied to it, the resulting score delta, prediction logs, and expected outputs. The optimizer emits a Python code patch that either adds/replaces an Operator call or modifies a prompt string.

**Evaluation** runs the workflow 5 times on D_V and reports mean + stddev — more expensive than single-shot evaluation but reduces noise that would otherwise corrupt the MCTS reward signal.

**Backpropagation** updates each ancestor tree node with the (modification, success/failure, score) tuple. This experience replay is the principal mechanism distinguishing AFlow from ADAS, which stores only a linear list of past workflows.

**Termination**: early stopping when top-k average score plateaus for n rounds, otherwise N_max = 20.

### 2.4 The discovered workflows look like

GSM8K best workflow (paper Figure 5B, 93.52% solve rate):

```python
async def __call__(self, problem: str):
    solutions = []
    for _ in range(5):  # Generate 5 solutions
        solution = await self.custom(input=problem, instruction=MATH_SOLVE_PROMPT)
        solutions.append(solution['response'])
    final_solution = await self.sc_ensemble(solutions=solutions, problem=problem)
    # Add a verification step using Programmer operator
    verification = await self.programmer(problem=problem, analysis=final_solution['response'])
    if verification['output']:
        return verification['output'], self.total_cost
    else:
        return final_solution['response'], self.total_cost
```

The optimization path was: blank -> Custom + MATH_SOLVE_PROMPT (round 1, score 0.8591) -> add ScEnsemble (round 3, 0.9160) -> add Programmer review (round 4, 0.9333) -> tighten prompts for formatting (rounds 8-10) -> 0.9352. The case study (Figure 6) annotates rounds in/out of the optimal path and shows AFlow's tree exploring then pruning unsuccessful branches (e.g., round 5 added a Custom review that *decreased* accuracy; round 14 tried rephrasing the problem and failed).

## 3. Multi-agent support

n/a as a runtime — AFlow itself is not multi-agent. **However**, the workflows it discovers can be multi-agent: the ablation explicitly notes that even **without** predefined operators, "AFlow autonomously develops ensemble-like structures," and the GSM8K-best workflow above is functionally a 5-way self-consistency ensemble + programmatic verifier. AFlow is therefore better classified as an **outer optimization loop over agentic-workflow space**, where the inner artifact may or may not be multi-agent.

## 4. Tool protocol / Memory model

- **Tools** = Operators (Generate, Format, Review, Revise, Ensemble, Test, Programmer, Custom). The Programmer operator is the closest to a tool-use primitive: it generates Python, executes it under timeout, and returns the result.
- **Memory** = MCTS tree experience. Per node: (score, parent-modification-description, success/failure relative to parent, prediction logs, expected outputs). This is **tree-structured** rather than linear (ADAS) — the paper argues this is the key efficiency advantage.

## 5. Maturity / Maintenance signal

Research artifact. ICLR 2025 oral acceptance, arXiv v4 dated 2025-04-15, code at github.com/FoundationAgents/AFlow. Not a production runtime; MetaGPT (68.3k stars, MIT, active through 2026-01) is the productionized companion from the same group. AFlow is heavily cited as the workflow-search baseline in subsequent 2025 agent literature.

Acknowledgements list five Chinese NSF / Guangdong / Guangzhou grants (NSF China 62402409 etc.), confirming the academic-not-vendor authorship.

## 6. Evidence quality — exact benchmark numbers (the load-bearing section)

### Table 1 — Main results, all baselines run with GPT-4o-mini on the 80% test split, 3 runs averaged

| Method | HotpotQA (F1) | DROP (F1) | HumanEval (pass@1) | MBPP (pass@1) | GSM8K (Solve) | MATH lv5* (Solve) | Avg. |
|---|---:|---:|---:|---:|---:|---:|---:|
| IO (GPT-4o-mini direct) | 68.1 | 68.3 | 87.0 | 71.8 | 92.7 | 48.6 | 72.8 |
| CoT (Wei et al. 2022) | 67.9 | 78.5 | 88.6 | 71.8 | 92.4 | 48.8 | 74.7 |
| CoT-SC 5-shot (Wang et al. 2022) | 68.9 | 78.8 | 91.6 | 73.6 | 92.7 | 50.4 | 76.0 |
| MedPrompt (Nori et al. 2023) | 68.3 | 78.0 | 91.6 | 73.6 | 90.0 | 50.0 | 75.3 |
| MultiPersona (Wang et al. 2024a) | 69.2 | 74.4 | 89.3 | 73.6 | 92.8 | 50.8 | 75.1 |
| Self-Refine (Madaan et al. 2023, max 3) | 60.8 | 70.2 | 87.8 | 69.8 | 89.6 | 46.1 | 70.7 |
| ADAS (Hu et al. 2024) | 64.5 | 76.6 | 82.4 | 53.4 | 90.8 | 35.4 | 67.2 |
| **AFlow (Ours)** | **73.5** | **80.6** | **94.7** | **83.4** | **93.5** | **56.2** | **80.3** |

**Per-benchmark deltas (AFlow vs best non-AFlow baseline):**
- HotpotQA F1: 73.5 vs 69.2 (MultiPersona) -> **+4.3 absolute**
- DROP F1: 80.6 vs 78.8 (CoT-SC) -> **+1.8 absolute**
- HumanEval pass@1: 94.7 vs 91.6 (CoT-SC / MedPrompt tied) -> **+3.1 absolute**
- MBPP pass@1: 83.4 vs 73.6 (three-way tie at 73.6) -> **+9.8 absolute** (largest gain)
- GSM8K Solve: 93.5 vs 92.8 (MultiPersona) -> **+0.7 absolute** (smallest gain — already saturated)
- MATH lv5* Solve: 56.2 vs 50.8 (MultiPersona) -> **+5.4 absolute**
- Average: 80.3 vs 76.0 (CoT-SC best avg) -> **+4.3 absolute**, or "+5.7% over manually-designed average" using the paper's framing

**vs ADAS specifically:** AFlow beats ADAS by +13.1 average; on the hardest tasks the relative deltas are MATH lv5* +20.8 absolute (35.4 -> 56.2, the paper claims +57% relative) and MBPP +30.0 absolute (53.4 -> 83.4, +56% relative).

### Table 2 — HumanEval transferability across executor LLMs, pass@1 (%), 3-run avg

Workflow searched on GPT-4o-mini ("Ours"), then re-executed with each model below. **"Ours\*"** = workflow searched on DeepSeek-V2.5.

| Executor | IO | CoT | CoT-SC | MedPrompt | MPD | Self-Refine | Ours (GPT-4o-mini-searched) | Ours* (DeepSeek-searched) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| GPT-4o-mini | 87.0 | 88.6 | 91.6 | 91.6 | 89.3 | 87.8 | **94.7** | 90.8 |
| DeepSeek-V2.5 | 88.6 | 89.3 | 88.6 | 88.6 | 89.3 | 90.0 | 93.9 | **94.7** |
| GPT-4o | 93.9 | 93.1 | 94.7 | 93.9 | 94.7 | 91.6 | **96.2** | 95.4 |
| Claude-3.5-Sonnet | 90.8 | 92.4 | 93.9 | 91.6 | 90.8 | 89.3 | **95.4** | 94.7 |

Key observations:
- AFlow workflows **transfer across models** — they beat the baselines for each row.
- But transfer is **imperfect**: the DeepSeek-searched workflow scores 90.8 on GPT-4o-mini vs the GPT-4o-mini-searched workflow's 94.7 — a 3.9-point gap that signals per-model re-search remains worthwhile.

### Appendix D — Pareto Cost Analysis, HumanEval, dollar cost on the divided test set

| Executor | Method | Score | Cost ($) |
|---|---|---:|---:|
| gpt-4o-mini | IO | 0.8702 | 0.0223 |
| gpt-4o-mini | CoT | 0.8860 | 0.0277 |
| gpt-4o-mini | CoT-SC | 0.9160 | 0.1794 |
| gpt-4o-mini | MedPrompt | 0.9160 | 0.2200 |
| gpt-4o-mini | LLM Debate | 0.8930 | 0.2278 |
| gpt-4o-mini | Self-Refine | 0.8780 | 0.1232 |
| gpt-4o-mini | **AFlow (gpt-4o-mini)** | **0.9470** | **0.0513** |
| gpt-4o-mini | AFlow (deepseek) | 0.9084 | 0.0669 |
| deepseek | IO | 0.8860 | 0.0127 |
| deepseek | CoT | 0.8930 | 0.0180 |
| deepseek | CoT-SC | 0.8860 | 0.1168 |
| deepseek | MedPrompt | 0.8860 | 0.1433 |
| deepseek | LLM Debate | 0.8930 | 0.1484 |
| deepseek | Self-Refine | 0.9000 | 0.0802 |
| deepseek | **AFlow (gpt-4o-mini)** | **0.9390** | **0.0291** |
| deepseek | **AFlow (deepseek)** | **0.9466** | **0.0377** |
| gpt-4o | IO | 0.9389 | 0.6371 |
| gpt-4o | CoT | 0.9310 | 0.7772 |
| gpt-4o | CoT-SC | 0.9470 | 5.0345 |
| gpt-4o | MedPrompt | 0.9390 | 6.1756 |
| gpt-4o | LLM Debate | 0.9470 | 6.3952 |
| gpt-4o | Self-Refine | 0.9160 | 3.4589 |
| gpt-4o | **AFlow (gpt-4o-mini)** | **0.9620** | **1.0111** |
| gpt-4o | AFlow (deepseek) | 0.9542 | 1.6600 |
| claude-3.5-sonnet | IO | 0.9084 | 0.6987 |
| claude-3.5-sonnet | CoT | 0.9240 | 0.6412 |
| claude-3.5-sonnet | CoT-SC | 0.9390 | 4.1534 |
| claude-3.5-sonnet | MedPrompt | 0.9160 | 5.0949 |
| claude-3.5-sonnet | LLM Debate | 0.9080 | 5.2761 |
| claude-3.5-sonnet | Self-Refine | 0.8930 | 2.8536 |
| claude-3.5-sonnet | **AFlow (gpt-4o-mini)** | **0.9540** | **1.1612** |
| claude-3.5-sonnet | AFlow (deepseek) | 0.9466 | 1.3252 |

**Headline cost claim, decoded:**
- GPT-4o IO baseline: 0.9389 at $0.6371.
- DeepSeek-V2.5 running an AFlow workflow searched with GPT-4o-mini: **0.9390 at $0.0291 — parity at 4.55% of the cost**.
- DeepSeek-V2.5 running an AFlow workflow searched with DeepSeek-V2.5: **0.9466 at $0.0377 — beats GPT-4o IO by 0.77pp at 5.92% of the cost**.
- GPT-4o-mini running an AFlow workflow searched with GPT-4o-mini: **0.9470 at $0.0513 — beats GPT-4o IO by 0.81pp at 8.05% of the cost**.

This is the source of the abstract's "4.55% of inference cost" claim. The "cheaper than human-designed" framing is supported only on the **execute-time** axis; the **search-time** cost is N_max=20 iterations * 5 validation runs per iteration * Claude-3.5-Sonnet as optimizer, which the paper does not amortize across deployments.

## 7. What AFlow does NOT do — corrects a cycle-7 misread

**The cycle-7 cross-framework benchmark survey (`sources/benchmark_notes/cross_framework_2026_05.md`) stated that AFlow's Table 1 includes MetaGPT, AutoGen, and ChatDev as baselines. This is incorrect.** Direct reading of the paper:

- "MetaGPT" appears exactly once in the entire PDF, in the references section (Hong et al. 2024b citation).
- "AutoGen" appears zero times.
- "ChatDev" appears zero times.

The actual Table 1 baselines are six **prompting techniques** (IO, CoT, CoT-SC, MedPrompt, MultiPersona Debate, Self-Refine) plus one **automated-workflow-search peer** (ADAS, Hu et al. 2024). Of the 13 OSS frameworks tracked in this topic, **zero appear as named baselines** in AFlow.

Implication for synthesis: the claim in `cross_framework_2026_05.md` that "the AFlow paper provides the most useful single source for ranking metagpt vs autogen vs chatdev as frameworks" is **factually wrong** and must be retracted in cycle-8 synthesis. **No paper in the surveyed literature provides head-to-head numerical comparison of MetaGPT, AutoGen, and ChatDev under their framework names on the same benchmark.** This widens the gap diagnosed in cross_framework_2026_05.md's "aggregate verdict" rather than closing it.

## 8. Limitations the authors flag

The paper does not have a dedicated "Limitations" section, but the following constraints are stated or implied across the text:

1. **Reasoning-task-only formulation.** "In this paper, we focus on applying AFLOW to reasoning tasks with numerical evaluation functions" (Section 3.2). Tasks lacking a programmatic G (open-ended writing, interactive web tasks, multi-turn dialogue grading) are out of scope.
2. **Fixed M, tau, F.** "To enhance search efficiency in practice, we simplify the search space by fixing key parameters such as the model M, temperature τ, and format F" (Section 3.2). Model selection and temperature are NOT searched.
3. **Per-model workflow re-search needed.** Table 2 commentary: "the workflow identified using DeepSeek-V2.5 performs notably weaker on GPT-4o-mini compared to the workflow found using GPT-4o-mini itself. This suggests that different language models require different workflows to achieve their optimal performance."
4. **Search-time compute is non-trivial.** 5 runs per validation eval × 20 iterations × Claude-3.5-Sonnet as optimizer. The "cheaper than humans" claim is execute-time, not search-time.
5. **Operator set is human-designed.** Seven operators extracted from existing literature. The ablation (Figure 5A) shows AFlow without operators still works (93.1% on GSM8K) but the operator set is not learned end-to-end — a manual prior remains.
6. **Empirical scope = six benchmarks.** Transfer to open-ended, multimodal, browser, or OS-level tasks is not demonstrated.

## 9. Relationship to other works in this topic

- **MetaGPT** (slug: `metagpt`) — same maintainer org (FoundationAgents / DeepWisdom). AFlow is the team's research trajectory toward self-discovered SOPs. `maintainer_overlap` edge.
- **ChatDev**, **AutoGen** — referenced **only conceptually** as the "manually designed multi-agent frameworks" AFlow's premise critiques; not named as baselines in Table 1. No direct numerical comparison exists. The cycle-7 survey's claim to the contrary is wrong (see §7).
- **GPTSwarm** (Zhuge et al. 2024) — Mingchen Zhuge is a co-author on both papers; AFlow positions GPTSwarm as a graph-restricted predecessor in the related-work section. Conceptual `influenced_by` edge but GPTSwarm is not in the 13 tracked frameworks.
- **ADAS** (Hu et al. 2024) — the only direct apples-to-apples peer (also automates workflow generation via code representation, but with linear-list experience and a heuristic search). AFlow's main empirical contrast. ADAS is not in the 13 tracked frameworks either.
- **CodeAct paper** (Wang et al., arXiv:2402.01030) — different angle: CodeAct argues *runtime* actions should be code; AFlow argues *workflow structure* should be code. Both are 2024 papers in the broader "code as the right primitive" research thread. `shared_pattern` edge plausible if shared "code as primary action representation" pattern is tagged.

## 10. Citation

Zhang, Jiayi, Jinyu Xiang, Zhaoyang Yu, Fengwei Teng, Xiong-Hui Chen, Jiaqi Chen, Mingchen Zhuge, Xin Cheng, Sirui Hong, Jinlin Wang, Bingnan Zheng, Bang Liu, Yuyu Luo, and Chenglin Wu. "AFlow: Automating Agentic Workflow Generation." In *International Conference on Learning Representations (ICLR)*, 2025 (oral). arXiv:2410.10762.
