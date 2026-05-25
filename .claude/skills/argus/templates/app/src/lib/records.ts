export function workSlugFromNodeId(nodeId: string) {
  return nodeId.replace(/^work:/, "");
}

export function workRecordPath(topicSlug: string, workSlug: string) {
  return `/topics/${topicSlug}/records/works_json/${workSlug}.json`;
}

export function workMarkdownPath(topicSlug: string, workSlug: string) {
  return `/topics/${topicSlug}/records/works_md/${workSlug}.md`;
}

export function graphPath(topicSlug: string) {
  return `/topics/${topicSlug}/indexes/knowledge_graph.json`;
}

export type ReportDoc = "main" | "reference_index" | "iteration_log";

export function reportPath(topicSlug: string, doc: ReportDoc) {
  return `/topics/${topicSlug}/report/${doc}.md`;
}

export function topicYamlPath(topicSlug: string) {
  return `/topics/${topicSlug}/topic.yaml`;
}
