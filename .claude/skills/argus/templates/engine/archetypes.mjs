/**
 * Universal Deep Exploration Archetypes for Argus 2.0.
 *
 * Every real-world deep search reduces to one of four modes:
 *   - hunt:     Needle-in-a-haystack rare-signal / primary-source / root-cause discovery
 *   - intel:    Broad landscape & competitive intelligence synthesis (many sources -> matrix)
 *   - decision: Decision under uncertainty (options + claims + JEV probabilities + flip triggers)
 *   - research: Long-horizon compounding knowledge tree (literature, technology, policy)
 */

export const ARCHETYPES = Object.freeze({
  hunt: {
    id: "hunt",
    label: "Needle Hunt",
    zhLabel: "稀缺猎寻",
    tagline: "Locate rare primary sources, obscure repos, exact clauses, or hard-to-find root causes.",
    primaryUnit: "Verified primary hit + provenance chain",
    jevDefaults: {
      routeDropBelow: 0.35,
      passFloor: 0.75,
      preserveAmbiguous: true,
      maxDeepReadPerCycle: 4,
    },
    iterationMix: { new_pct: 60, deepen_pct: 25, challenge_pct: 15, synthesis_every_n_cycles: 4 },
    stopCriterion: "Target artifact located with verified primary-source provenance, or search space exhausted.",
  },
  intel: {
    id: "intel",
    label: "Landscape & Competitive Intel",
    zhLabel: "竞品与全景情报",
    tagline: "Sweep dozens of products, repos, pricing pages, and user signals into a living comparison matrix.",
    primaryUnit: "Competitor / ecosystem dossier + feature & positioning matrix",
    jevDefaults: {
      routeDropBelow: 0.35,
      passFloor: 0.70,
      preserveAmbiguous: true,
      maxDeepReadPerCycle: 6,
    },
    iterationMix: { new_pct: 55, deepen_pct: 30, challenge_pct: 15, synthesis_every_n_cycles: 5 },
    stopCriterion: "Coverage saturates across target market routes and major differentiators are evidence-backed.",
  },
  decision: {
    id: "decision",
    label: "Decision Under Uncertainty",
    zhLabel: "决策推演",
    tagline: "Resolve high-stakes technical, product, or strategic bets with calibrated JEV evidence and flip triggers.",
    primaryUnit: "Decision option probabilities + contested claims + flip triggers",
    jevDefaults: {
      routeDropBelow: 0.35,
      passFloor: 0.70,
      preserveAmbiguous: true,
      maxDeepReadPerCycle: 5,
    },
    iterationMix: { new_pct: 35, deepen_pct: 30, challenge_pct: 35, synthesis_every_n_cycles: 4 },
    stopCriterion: "Leading option crosses passFloor with zero unresolved critical conflicts and documented flip triggers.",
  },
  research: {
    id: "research",
    label: "Long-Horizon Research Tree",
    zhLabel: "持久研究树",
    tagline: "Grow a compounding multi-week knowledge graph across papers, systems, and evolving fields.",
    primaryUnit: "Structured work records + typed knowledge graph + living synthesis brief",
    jevDefaults: {
      routeDropBelow: 0.35,
      passFloor: 0.70,
      preserveAmbiguous: true,
      maxDeepReadPerCycle: 5,
    },
    iterationMix: { new_pct: 50, deepen_pct: 30, challenge_pct: 20, synthesis_every_n_cycles: 7 },
    stopCriterion: "Three consecutive synthesis cycles report saturation across active routes.",
  },
});

export const ARCHETYPE_IDS = Object.freeze(Object.keys(ARCHETYPES));

export function getArchetype(id) {
  const key = String(id ?? "research").toLowerCase().trim();
  return ARCHETYPES[key] ?? ARCHETYPES.research;
}

export function listArchetypes() {
  return ARCHETYPE_IDS.map((id) => ARCHETYPES[id]);
}
