import { describe, expect, it } from "vitest";

import {
  graphPath,
  reportPath,
  workMarkdownPath,
  workRecordPath,
  workSlugFromNodeId,
} from "./records";

describe("work record helpers", () => {
  it("maps a work node id to the matching record slug", () => {
    expect(workSlugFromNodeId("work:example-work-2024")).toBe("example-work-2024");
  });

  it("builds the public record path from topic + work slug", () => {
    expect(workRecordPath("example-topic", "example-work-2024")).toBe(
      "/topics/example-topic/records/works_json/example-work-2024.json",
    );
  });

  it("builds the markdown path", () => {
    expect(workMarkdownPath("example-topic", "example-work-2024")).toBe(
      "/topics/example-topic/records/works_md/example-work-2024.md",
    );
  });

  it("builds the graph path", () => {
    expect(graphPath("example-topic")).toBe(
      "/topics/example-topic/indexes/knowledge_graph.json",
    );
  });

  it("builds report paths for each doc kind", () => {
    expect(reportPath("example-topic", "main")).toBe(
      "/topics/example-topic/report/main.md",
    );
    expect(reportPath("example-topic", "reference_index")).toBe(
      "/topics/example-topic/report/reference_index.md",
    );
    expect(reportPath("example-topic", "iteration_log")).toBe(
      "/topics/example-topic/report/iteration_log.md",
    );
  });
});
