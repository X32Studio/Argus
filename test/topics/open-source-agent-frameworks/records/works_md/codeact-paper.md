# CodeAct — *Executable Code Actions Elicit Better LLM Agents* (Wang et al., arXiv:2402.01030, ICML 2024)

## 1. Identity and provenance

- **Title**: *Executable Code Actions Elicit Better LLM Agents*
- **Authors**: Xingyao Wang, Yangyi Chen, Lifan Yuan, Yizhe Zhang, Yunzhu Li, Hao Peng, Heng Ji
- **Affiliations**: Department of Computer Science, University of Illinois Urbana-Champaign (Wang, Chen, Yuan, Y. Li, Peng, Ji); Apple (Yizhe Zhang). Correspondence: Xingyao Wang (xingyao6@illinois.edu), Heng Ji (hengji@illinois.edu).
- **Venue**: ICML 2024 (PMLR 235, Vienna).
- **arXiv**: 2402.01030 — submitted 2024-02-01, current revision v4 (2024-06-07). License CC BY 4.0.
- **Code / data / models**: https://github.com/xingyaoww/code-act (MIT, ~1.7k stars / 138 forks). CodeActInstruct on HF Hub at `xingyaoww/code-act`. Released agents: `xingyaoww/CodeActAgent-Mistral-7b-v0.1` (32k ctx) and `xingyaoww/CodeActAgent-Llama-2-7b` (4k ctx).
- **Funding disclosed**: DARPA ECOLE (HR00112390060), DARPA ITM (FA8650-23-C-7316), DARPA KAIROS (FA8750-19-2-1004); NSF/ACCESS compute via Delta at NCSA.
- **Why this is a first-class record**: until iteration 8 the paper existed only as a citation inside `smolagents.json`. It is the academic anchor for the *code-act execution kernel* axis across the topic — promoting it to its own record lets the synthesis editor cite the source directly instead of through smolagents' summary.

## 2. The technical mechanism

CodeAct is a paradigm, not a system. The proposal in one paragraph:

> The LLM agent's action space is consolidated to a single type — **a piece of Python source code**. Each turn the agent emits a `<execute>...</execute>` block (or equivalent delimiter); a stateful Python interpreter runs it and returns stdout / return values / exceptions as the next observation; the agent may then plan, revise, and emit another code action. The roles are formalized as **agent / user / environment** (Fig. 2 of the paper). Conversation with the user stays in natural language; interaction with the environment is mediated entirely through code.

This contrasts with two prior schemes the paper explicitly names:

- **Text-as-action** (à la ReAct / Yao et al. 2022b, Park et al. 2023): the agent writes free-form text that names a tool and arguments in a pre-defined surface format; a parser routes it.
- **JSON-as-action** (à la ToolLLM / Qin et al. 2023b, LangChain / Chase 2022, the OpenAI function-calling API): the agent emits a JSON object matching a tool's schema; the runtime dispatches to that tool.

The four properties the paper claims fall out for free with code-as-action (Table 1, verbatim summary):

1. **Pre-training data abundance** — code is abundant in LLM pre-training corpora, so models are already fluent; text/JSON tool-call formats require bespoke curated training data.
2. **Native control & data flow** — `if`, `for`, variable reuse, function composition come for free; JSON/text need to fake these by defining synthetic "if-statement tools" or by chaining many actions.
3. **Existing software access** — anything on PyPI is a tool; no need to hand-curate a tool registry.
4. **Automated feedback** — Python tracebacks/exceptions are natural-language error messages already, so self-debugging is mechanically supported with no extra infrastructure.

The paper distinguishes itself from earlier code-for-control work (Code-as-Policies / Liang et al. 2022, Voyager / Wang et al. 2023a, Singh et al. 2023): those used code for robot/game control but bound to *pre-specified control primitives*, with hand-engineered prompts and no dynamic revision from environment feedback. CodeAct is general-purpose, interpreter-integrated, and multi-turn.

## 3. Where it sits in the landscape

This is the **provenance anchor** for the code-act kernel axis. Within the topic's framework cohort:

- **smolagents (Hugging Face)** — direct ideological heir. Its `CodeAgent` is the productized CodeAct: Thought → Code → Observation loop, stateful Python executor (LocalPythonExecutor / E2B / Modal / Docker / Wasm). smolagents docs cite this paper by arXiv ID for the four advantages above. Edge: `smolagents --influenced_by--> codeact-paper`.
- **OpenInterpreter** — the predecessor in spirit: chat-shaped local code-execution agent that pre-dates CodeAct as a paper but matures alongside it. CodeAct provides the empirical justification post-hoc. Edge: `openinterpreter --influenced_by--> codeact-paper`.
- **OpenManus / Manus-style agents** — emit code or pseudo-code actions and stream-execute; same paradigm. (Not asserted as a hard edge here; cite via shared_pattern instead.)
- **vs LangChain / AutoGen / CrewAI** — these are the foils. LangChain's default action space is JSON-tool-call (or text-prompted equivalent); AutoGen's is a conversation among role-played agents; CrewAI's is role-task assignments. None of them treat Python code as the primary unified action. The CodeAct paper's *empirical* contribution is to show that on identical benchmarks the code-as-action mode beats text/JSON by up to 20% absolute on M3ToolEval — i.e., the choice of action space is a measurable design lever, not a stylistic preference.

This record carries weight in synthesis because the framework records (smolagents in particular, also chatdev/metagpt/openinterpreter when those discuss code execution) already lean on the paper's numbers; having a first-class record removes the indirection.

## 4. What is reusable

For an OSS framework or a research baseline, the directly-portable artifacts are:

- **The four-properties argument** (data abundance / control flow / PyPI access / traceback-as-feedback) — verbatim-quotable justification for any code-act design. smolagents lifts this nearly word-for-word into its conceptual docs.
- **The empirical anchor**: "up to 20% absolute success-rate improvement on M3ToolEval across 17 LLMs, up to 30% fewer turns." This is the *one* number that justifies adopting code-as-action over JSON-function-call.
- **CodeActInstruct dataset** — 7k multi-turn trajectories on HF Hub at `xingyaoww/code-act`. Reusable as instruction-tuning data for any open-source agent fine-tune. Composition emphasizes agent-environment interaction (information seeking, package use, external memory, robot planning) with selection bias toward self-debug / self-improvement behaviors. Mix with general-conversation data — the paper's ablation (Tab. A.8) shows both ingredients matter for preserving MMLU/HumanEval/GSM8K/MT-Bench scores.
- **CodeActAgent checkpoints** — `CodeActAgent-Mistral-7b-v0.1` (32k ctx) and `CodeActAgent-Llama-2-7b` (4k ctx) — drop-in open instruction-tuned models for code-act experimentation without needing to redo the 7B fine-tune.
- **M3ToolEval benchmark** — 82 human-curated tasks across web browsing, finance, travel itinerary, science, information processing. Each domain has its own toolset. Crucially: it supports *evaluating different action formats* on the same task, which was the gap the authors identified (no prior multi-tool/multi-turn benchmark allowed cross-format comparison). Anyone benchmarking code-act vs JSON-tool-call on a new model should run M3ToolEval as the calibration set.
- **The agent/user/environment role formalization** — clean three-way decomposition that maps to almost any modern agent system; useful pedagogically and for designing interfaces.

## 5. Notable absences / failure modes / anti-patterns

The paper's own Impact Statement (which doubles as the limitations section — there is no separate "Limitations") flags:

- **Hallucination persists** — the canonical example: the agent "imagines" the contents of a variable instead of printing it. Code-as-action does not by itself fix this; downstream alignment (RLHF / DPO-style) is called out as the obvious next step.
- **The Llama-2 / Mistral asymmetry** — `CodeActAgent (LLaMA-2, 7B)` scores **0.0** on M3ToolEval despite improving on MINT; the Mistral variant scores 12.2. The paper discusses causes in Appendix H — the takeaway for downstream users is that *code-act gains are not unconditional on weaker base models*. If you're fine-tuning a code-act agent on a 7B model, the base matters more than the recipe.
- **"Limited" self-improvement** — the agent can self-debug from tracebacks but does not do deeper meta-reasoning over its history; the paper positions CodeActAgent as a "prototype."
- **No security/sandboxing story** — executing arbitrary LLM-generated Python is dangerous in production. The paper's evaluation environments are research sandboxes; it does not propose a hardened execution model. This gap is what later OSS frameworks (smolagents' E2B/Modal/Docker/Wasm executors; OpenInterpreter's safe-mode container variants) fill. Anyone porting code-act to production must add that layer themselves.
- **Empirical context-dependence** — the 20% headline was measured in 2023-early-2024 on a generation of models where native JSON function-calling was still uneven (especially in open-source). On 2025/2026 frontier models, the providers' tool-calling has improved; in CodeActAgent Tab. 5 we already see gpt-4-0613 hit 67.1% on M3ToolEval with code-as-action vs strong JSON baselines — competitive but not 20% apart. Generalizing the gap to all model classes is an anti-pattern.

## 6. What we now know vs guess

**Verified from primary source (the PDF and the GitHub repo)**:

- The "up to 20% absolute improvement" claim is on **M3ToolEval** (the paper's own new benchmark), NOT on API-Bank. API-Bank is the *atomic*-tool-call experiment in §2.2; M3ToolEval is the *compositional*-multi-tool experiment in §2.3. The smolagents record (and the prompt that spawned this work) phrased it as "across 17 LLMs on API-Bank" — that's imprecise. The 17-LLM cohort spans both experiments; the 20% improvement specifically refers to M3ToolEval's success-rate gap.
- CodeActInstruct is exactly **7,000 multi-turn interaction trajectories**, distilled from stronger LLMs, with selection emphasizing self-debug behaviors. HF Hub: `xingyaoww/code-act`.
- Two released agent variants: Llama-2-7B (4k ctx) and Mistral-7B-v0.1 (32k ctx).
- License posture: paper CC BY 4.0; code repo MIT; dataset/model under author's HF namespace.
- Funding: DARPA (ECOLE, ITM, KAIROS) + NSF/ACCESS — relevant if downstream users care about provenance of public-funding-derived models.
- The Mistral variant matches some 70B-class open models on M3ToolEval; the Llama-2 variant fails on M3ToolEval (0.0) despite improving on MINT — author-acknowledged.
- Generalization: CodeActAgent-Llama-2-7B, never trained on text actions, still matches AgentLM-7B (which *was* trained on text actions) on OOD text-action benchmarks (MiniWob++, ScienceWorld). Implies code-act fine-tuning is a strong general agent prior.

**Still uncertain / not captured**:

- The exact license string on the CodeActInstruct dataset card (the HF dataset page should be authoritative — recommend a quick follow-up fetch before any commercial reuse).
- Whether the paper's claims have been replicated by independent groups on 2025/2026 models — this is the H1 hypothesis already filed in the smolagents record.
- Whether there are heirs beyond smolagents/OpenInterpreter that *explicitly* cite CodeAct as their paradigmatic basis (the GitHub repo's README does not enumerate citing OSS frameworks).

## 7. Concrete next experiments or hypotheses

- **H1 — does the 20% gap survive on frontier models?** Re-run M3ToolEval on GPT-4o / Claude 3.5 Sonnet / Claude 3.7 / GPT-5-class models, comparing code-as-action vs the providers' native JSON function-calling. Prediction: gap narrows to <10% on frontier models, persists at 15-20% on weaker open-source models. This is the cleanest extension of the paper.
- **H2 — CodeActInstruct + modern open base.** Re-do the fine-tune with Llama-3.1-8B or Qwen-2.5-7B-Instruct as the base, holding CodeActInstruct constant. Compare to CodeActAgent-Mistral-7B-v0.1. Does the M3ToolEval gap close? Does the 0.0 failure mode of the Llama-2 variant disappear with a stronger code-pretrained base?
- **H3 — M3ToolEval as a smolagents calibration benchmark.** Run smolagents CodeAgent vs ToolCallingAgent on M3ToolEval directly. This would give the topic's first independent code-act-vs-JSON number on a *non-paper* implementation, tied back to the same benchmark.
- **H4 — security-bracketed CodeAct.** Re-evaluate the 20% gap when the Python executor is sandboxed (E2B / Modal / Docker / Wasm). Does the latency tax matter? Does the agent's ability to import from PyPI degrade? This connects the paper's paradigm to the smolagents record's H2 (sandbox tax) and would close a loop the paper itself leaves open.
- **H5 — composability ceiling.** The paper's M3ToolEval tasks are bounded at 10 turns. Curate longer-horizon tasks (50+ turns, web research scale) and check whether the code-act advantage compounds (more composability per turn × more turns) or degrades (variable-state confusion over long contexts). This is the natural follow-up the paper hints at but does not run.

---

```json
{
  "slug": "codeact-paper",
  "title": "CodeAct (Wang et al., arXiv:2402.01030)",
  "year": 2024,
  "analysis_depth": "deep",
  "proposed_graph_edges": [
    {"src": "smolagents", "dst": "codeact-paper", "rel": "influenced_by"},
    {"src": "openinterpreter", "dst": "codeact-paper", "rel": "influenced_by"}
  ],
  "proposed_route_index_updates": {
    "Academic agent literature": {"add_to_representative_works": ["codeact-paper"], "search_count_delta": 1}
  },
  "proposed_search_log_entry": {
    "iteration_id": 8,
    "new_direction": true,
    "query": "CodeAct paper deep-read",
    "source": "https://arxiv.org/abs/2402.01030",
    "result_status": "ok",
    "works_found": ["codeact-paper"],
    "why_new": "iteration 8 — academic anchor for smolagents; promotes paper from referenced-only to recorded"
  }
}
```
