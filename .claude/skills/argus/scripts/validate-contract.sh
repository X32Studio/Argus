#!/usr/bin/env bash
# Validate (and optionally auto-fix) one or more topics against the Argus
# frontend contract.
#
# Spec: .claude/skills/argus/docs/frontend-contract.md §3 hard rules
#
# Usage:
#   bash .../validate-contract.sh                    # validate all topics in $PWD/topics/
#   bash .../validate-contract.sh <slug>             # validate one topic
#   bash .../validate-contract.sh --fix              # validate + auto-fix every topic
#   bash .../validate-contract.sh --fix <slug>       # validate + auto-fix one topic
#   bash .../validate-contract.sh --root <dir> ...   # use <dir>/topics/ instead of $PWD
#
# Exit code 0 = all checked topics compliant after any --fix; 1 = at least
# one violation remains (e.g. a work node without a record file — can't be
# auto-created).

set -euo pipefail

ROOT="$PWD"
TARGET=""
FIX_MODE="false"

while [ $# -gt 0 ]; do
  case "$1" in
    --fix)  FIX_MODE="true"; shift ;;
    --root) ROOT="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) TARGET="$1"; shift ;;
  esac
done

TOPICS_DIR="$ROOT/topics"
if [ ! -d "$TOPICS_DIR" ]; then
  echo "No topics/ directory at $TOPICS_DIR" >&2
  exit 2
fi

python3 - "$TOPICS_DIR" "$TARGET" "$FIX_MODE" <<'PYEOF'
import json
import re
import sys
from collections import Counter
from pathlib import Path

topics_dir = Path(sys.argv[1])
target = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else None
fix_mode = sys.argv[3] == "true"

ALLOWED_KINDS = {"route", "work", "technique", "transferable_idea", "pitfall"}
KIND_PREFIXES = {f"{k}:" for k in ALLOWED_KINDS}


# ── helpers ────────────────────────────────────────────────────────────────

def extract_yaml_keys(yaml_text, section):
    """Pull `key:` values from a top-level yaml list section. Manual parse."""
    keys = []
    in_section = False
    for line in yaml_text.split("\n"):
        if re.match(rf"^{section}:\s*$", line):
            in_section = True
            continue
        if in_section and re.match(r"^[a-z_]+:\s*$", line):
            break
        if in_section:
            m = re.match(r"^\s{4}key:\s*(.+?)\s*$", line)
            if m:
                keys.append(m.group(1).strip())
    return keys


def yaml_section_items_missing_key(yaml_text, section):
    """Return list of (line_idx, name) for items in <section> that lack a `key:` sibling."""
    lines = yaml_text.split("\n")
    items_missing = []
    in_section = False
    i = 0
    while i < len(lines):
        line = lines[i]
        if re.match(rf"^{section}:\s*$", line):
            in_section = True
            i += 1
            continue
        if in_section and re.match(r"^[a-z_]+:\s*$", line):
            break
        if in_section:
            # an item start: `  - <something>`
            m = re.match(r"^\s{2}-\s(?:name|key|description):\s*(.*)$", line)
            if line.startswith("  - "):
                # gather the block of lines belonging to this item (until next "  - " or end of section)
                block_start = i
                item_lines = [line]
                j = i + 1
                while j < len(lines):
                    nxt = lines[j]
                    if nxt.startswith("  - ") or re.match(r"^[a-z_]+:\s*$", nxt):
                        break
                    item_lines.append(nxt)
                    j += 1
                # check if block has a `    key:` line
                has_key = any(re.match(r"^\s{4}key:\s*\S+", il) for il in item_lines)
                # if block has `name:` extract it
                name = None
                for il in item_lines:
                    mm = re.match(r"^\s{2,4}-?\s?name:\s*(.+?)\s*$", il)
                    if mm:
                        name = mm.group(1).strip()
                        break
                if not has_key and name:
                    items_missing.append((block_start, name, item_lines))
                i = j
                continue
        i += 1
    return items_missing


def to_kebab(name):
    s = re.sub(r"[^a-zA-Z0-9_\-\s]", "", name).lower().strip()
    return "-".join(s.split())


def to_snake(name):
    s = re.sub(r"[^a-zA-Z0-9_\-\s]", "", name).lower().strip()
    return "_".join(s.replace("-", "_").split())


# ── validator ─────────────────────────────────────────────────────────────

def check(topic_dir):
    problems = []
    yaml_path = topic_dir / "topic.yaml"
    graph_path = topic_dir / "indexes/knowledge_graph.json"
    records_dir = topic_dir / "records/works_json"

    if not yaml_path.exists():
        return [("missing", "missing topic.yaml", None)]
    if not graph_path.exists():
        return [("missing", "missing indexes/knowledge_graph.json", None)]

    yaml_text = yaml_path.read_text()
    route_keys = extract_yaml_keys(yaml_text, "execution_routes")
    edge_keys = set(extract_yaml_keys(yaml_text, "graph_edge_types"))
    concept_keys = extract_yaml_keys(yaml_text, "concept_layers")
    record_field_keys = extract_yaml_keys(yaml_text, "record_fields")

    for section, keys, _kind in [
        ("execution_routes", route_keys, "kebab"),
        ("graph_edge_types", edge_keys, "snake"),
        ("concept_layers", concept_keys, "kebab"),
        ("record_fields", record_field_keys, "snake"),
    ]:
        if not keys:
            problems.append(
                ("yaml_missing_keys", f"topic.yaml: {section} has no entries with `key:` field", section)
            )

    try:
        g = json.loads(graph_path.read_text())
    except json.JSONDecodeError as e:
        return [("bad_json", f"invalid JSON in knowledge_graph.json: {e}", None)]

    nodes = g.get("nodes", [])
    edges = g.get("edges", [])
    node_ids = {n.get("id") for n in nodes}

    for n in nodes:
        nid = n.get("id", "<no id>")
        kind = n.get("kind")
        if not kind:
            problems.append(("node_missing_kind", f"node {nid!r}: missing `kind`", nid))
        elif kind not in ALLOWED_KINDS:
            problems.append(("node_bad_kind", f"node {nid!r}: kind={kind!r} not allowed", nid))
        elif not str(nid).startswith(f"{kind}:"):
            problems.append(("node_bad_id_prefix", f"node id {nid!r}: must start with {kind}: prefix", nid))

    record_stems = (
        {p.stem for p in records_dir.glob("*.json")} if records_dir.exists() else set()
    )
    for n in nodes:
        if n.get("kind") == "work":
            slug = str(n.get("id", "")).removeprefix("work:")
            if slug and slug not in record_stems:
                problems.append((
                    "work_no_record",
                    f"work node {n['id']!r}: no records/works_json/{slug}.json",
                    n['id'],
                ))

    for e in edges:
        for endpoint_label in ("src", "dst"):
            end = e.get(endpoint_label)
            if not end:
                problems.append(("edge_missing_endpoint", f"edge missing `{endpoint_label}`: {e}", None))
            elif end not in node_ids:
                problems.append(("edge_dangling", f"edge dangling `{endpoint_label}`: {end!r}", end))

    for e in edges:
        rel = e.get("rel")
        if not rel:
            problems.append(("edge_missing_rel", f"edge missing `rel`: {e}", None))
        elif edge_keys and rel not in edge_keys:
            problems.append(("edge_bad_rel", f"edge rel={rel!r} not in topic.yaml.graph_edge_types", rel))

    declared = {f"route:{k}" for k in route_keys}
    actual = {n.get("id") for n in nodes if n.get("kind") == "route"}
    for r in sorted(declared - actual):
        problems.append(("route_missing", f"route {r!r} declared in yaml but missing in graph", r))
    for r in sorted(actual - declared):
        problems.append(("route_undeclared", f"route {r!r} in graph but not in yaml", r))

    return problems


# ── fixer ─────────────────────────────────────────────────────────────────

def fix(topic_dir):
    """Try to auto-fix what's deterministically fixable. Returns list of repair messages."""
    yaml_path = topic_dir / "topic.yaml"
    graph_path = topic_dir / "indexes/knowledge_graph.json"

    repairs = []

    # ── 1. yaml: inject missing `key:` in list items ────────────────────
    yaml_text = yaml_path.read_text()
    sections = [
        ("execution_routes", "kebab"),
        ("graph_edge_types", "snake"),
        ("concept_layers", "kebab"),
        ("record_fields", "snake"),
    ]
    for section, kind in sections:
        items_missing = yaml_section_items_missing_key(yaml_text, section)
        if not items_missing:
            continue
        # process in reverse line order so injection doesn't shift earlier line numbers
        lines = yaml_text.split("\n")
        for block_start, name, item_lines in reversed(items_missing):
            key = to_kebab(name) if kind == "kebab" else to_snake(name)
            insertion = "    key: " + key
            # insert right after the first `- name: ...` line of the block
            for off, il in enumerate(item_lines):
                if "name:" in il:
                    insert_at = block_start + off + 1
                    lines.insert(insert_at, insertion)
                    repairs.append(f"  + yaml: injected key={key} for {section}.{name}")
                    break
        yaml_text = "\n".join(lines)
    yaml_path.write_text(yaml_text)

    # re-extract keys after possible injections
    route_keys = extract_yaml_keys(yaml_text, "execution_routes")
    edge_keys = set(extract_yaml_keys(yaml_text, "graph_edge_types"))

    # ── 2. graph: load, fix nodes + edges ───────────────────────────────
    g = json.loads(graph_path.read_text())
    nodes = g.get("nodes", [])
    edges = g.get("edges", [])

    # 2a. add missing `kind` field — infer from id prefix
    for n in nodes:
        if "kind" not in n:
            nid = n.get("id", "")
            inferred = None
            for k in ALLOWED_KINDS:
                if nid.startswith(f"{k}:"):
                    inferred = k
                    break
            if inferred:
                n["kind"] = inferred
                repairs.append(f"  + node {nid!r}: inferred kind={inferred} from prefix")
            else:
                # bare id; default to "technique" as the most flexible
                n["kind"] = "technique"
                repairs.append(f"  + node {nid!r}: bare id, defaulted kind=technique")

    # 2b. rename nodes whose id lacks `<kind>:` prefix
    id_map = {}
    for n in nodes:
        nid = n["id"]
        kind = n["kind"]
        if not nid.startswith(f"{kind}:"):
            slug = re.sub(r"^[^:]+:", "", nid)  # strip any wrong prefix
            slug = re.sub(r"[^a-zA-Z0-9_\-]", "-", slug).lower().strip("-")
            new_id = f"{kind}:{slug}"
            if new_id != nid:
                id_map[nid] = new_id
                n["id"] = new_id
                repairs.append(f"  + node id: {nid!r} → {new_id!r}")

    # update edges' src/dst to match
    if id_map:
        for e in edges:
            if e.get("src") in id_map:
                e["src"] = id_map[e["src"]]
            if e.get("dst") in id_map:
                e["dst"] = id_map[e["dst"]]

    # 2c. seed missing route nodes from yaml
    existing_ids = {n["id"] for n in nodes}
    for rk in route_keys:
        rid = f"route:{rk}"
        if rid not in existing_ids:
            # read the route's name from yaml as label
            label_match = None
            # naive parse for the line right above `    key: rk`
            for i, line in enumerate(yaml_text.split("\n")):
                if re.match(rf"^\s{{4}}key:\s*{re.escape(rk)}\s*$", line):
                    # search backwards for the `- name:` line
                    for j in range(i - 1, max(-1, i - 10), -1):
                        nm = re.match(r"^\s{2}-\s?name:\s*(.+?)\s*$", yaml_text.split("\n")[j])
                        if nm:
                            label_match = nm.group(1).strip()
                            break
                    break
            label = label_match or rk
            nodes.append({"id": rid, "kind": "route", "label": label})
            existing_ids.add(rid)
            repairs.append(f"  + seeded route node {rid!r}")

    # 2d. drop dangling edges
    node_ids_now = {n["id"] for n in nodes}
    before = len(edges)
    edges = [e for e in edges if e.get("src") in node_ids_now and e.get("dst") in node_ids_now]
    dropped = before - len(edges)
    if dropped:
        repairs.append(f"  + dropped {dropped} dangling edge(s)")
    g["edges"] = edges
    g["nodes"] = nodes

    # write back
    if repairs:
        graph_path.write_text(json.dumps(g, indent=2))

    return repairs


# ── driver ────────────────────────────────────────────────────────────────

def summary(topic_dir):
    g = json.loads((topic_dir / "indexes/knowledge_graph.json").read_text())
    nodes = g.get("nodes", [])
    edges = g.get("edges", [])
    by_kind = dict(Counter(n.get("kind") for n in nodes))
    b2r = sum(1 for e in edges if e.get("rel") == "belongs_to_route")
    return f"{len(nodes)} nodes ({by_kind}), {len(edges)} edges, {b2r} belongs_to_route"


if target:
    candidates = [topics_dir / target]
else:
    candidates = sorted(
        p for p in topics_dir.iterdir() if p.is_dir() and (p / "topic.yaml").exists()
    )

if not candidates:
    print(f"No topics found under {topics_dir}", file=sys.stderr)
    sys.exit(2)

any_remaining = False
for td in candidates:
    print(f"\n━━━ {td.name} ━━━")
    if not (td / "topic.yaml").exists():
        print("  SKIP — no topic.yaml")
        continue

    problems_before = check(td)

    if fix_mode and problems_before:
        repairs = fix(td)
        if repairs:
            print(f"  ⚙ FIX applied ({len(repairs)} change(s)):")
            for r in repairs[:30]:
                print(f"  {r}")
            if len(repairs) > 30:
                print(f"      (+ {len(repairs) - 30} more)")

        problems_after = check(td)
        if problems_after:
            any_remaining = True
            print(f"  ⚠ REMAINING — {len(problems_after)} violation(s) need human attention:")
            for code, msg, _ctx in problems_after[:20]:
                print(f"      [{code}] {msg}")
            if len(problems_after) > 20:
                print(f"      (+ {len(problems_after) - 20} more)")
        else:
            print(f"  ✓ OK after fix.  {summary(td)}")
    elif problems_before:
        any_remaining = True
        print(f"  ✗ FAIL — {len(problems_before)} violation(s)")
        for code, msg, _ctx in problems_before[:30]:
            print(f"      [{code}] {msg}")
        if len(problems_before) > 30:
            print(f"      (+ {len(problems_before) - 30} more)")
    else:
        print(f"  ✓ OK    {summary(td)}")

print()
if any_remaining:
    print("FAIL — some violations remain. See .claude/skills/argus/docs/frontend-contract.md §3 for the spec; not all problems can be auto-fixed (e.g., a work node with no record file requires actual research, not a script).")
    sys.exit(1)
else:
    print("All topics PASS the contract." + (" (after --fix)" if fix_mode else ""))
    sys.exit(0)
PYEOF
