import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_CONTEXT_MAX_CHARACTERS,
  DEFAULT_NUM_RESULTS,
  DEFAULT_SEARCH_TYPE,
  MAX_SEARCH_OUTPUT_CHARS,
  compactSearchOutput,
} from "./search-output.js";

const result = (number, highlights) => [
  `Title: Source ${number}`,
  `URL: https://example.com/${number}`,
  "Published: N/A",
  "Author: N/A",
  "Highlights:",
  highlights,
].join("\n");

test("uses conservative defaults for discovery searches", () => {
  assert.equal(DEFAULT_NUM_RESULTS, 3);
  assert.equal(DEFAULT_SEARCH_TYPE, "fast");
  assert.equal(DEFAULT_CONTEXT_MAX_CHARACTERS, 2500);
  assert.equal(MAX_SEARCH_OUTPUT_CHARS, 10_000);
});

test("keeps a bounded excerpt for each selected result", () => {
  const output = [
    result(1, "a".repeat(7_000)),
    result(2, "b".repeat(7_000)),
    result(3, "c".repeat(7_000)),
    result(4, "d".repeat(7_000)),
  ].join("\n\n---\n\n");

  const compacted = compactSearchOutput(output, { maxChars: 1_000, maxResults: 3 });

  assert.ok(compacted.length <= 1_000);
  assert.match(compacted, /Title: Source 1/);
  assert.match(compacted, /Title: Source 2/);
  assert.match(compacted, /Title: Source 3/);
  assert.doesNotMatch(compacted, /Title: Source 4/);
  assert.match(compacted, /Result excerpts truncated|Additional search results omitted/);
});

test("returns a small result unchanged", () => {
  const output = result(1, "A concise excerpt.");

  assert.equal(compactSearchOutput(output, { maxChars: 1_000, maxResults: 3 }), output);
});
