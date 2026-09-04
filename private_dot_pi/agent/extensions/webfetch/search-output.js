export const DEFAULT_NUM_RESULTS = 3;
export const DEFAULT_SEARCH_TYPE = "fast";
export const DEFAULT_CONTEXT_MAX_CHARACTERS = 2_500;
export const MAX_SEARCH_OUTPUT_CHARS = 10_000;

const SECTION_SEPARATOR = "\n\n---\n\n";
const EXCERPT_NOTICE = "[Result excerpts truncated to fit the output budget.]";

function truncateExcerpt(text, maxChars) {
  if (text.length <= maxChars) return text;
  if (maxChars <= 1) return "…".slice(0, maxChars);

  const suffix = "\n[Excerpt truncated]";
  if (maxChars <= suffix.length) return text.slice(0, maxChars - 1) + "…";
  return text.slice(0, maxChars - suffix.length).trimEnd() + suffix;
}

export function compactSearchOutput(text, { maxChars = MAX_SEARCH_OUTPUT_CHARS, maxResults = DEFAULT_NUM_RESULTS } = {}) {
  const sections = text.split(/\n{2,}---\n{2,}/).filter(Boolean);
  if (sections.length === 0) return truncateExcerpt(text, maxChars);

  const selected = sections.slice(0, maxResults);
  const omittedCount = sections.length - selected.length;
  const omittedNotice = omittedCount > 0
    ? `[${omittedCount} additional search result${omittedCount === 1 ? "" : "s"} omitted.]`
    : "";
  const separatorChars = SECTION_SEPARATOR.length * Math.max(selected.length - 1, 0);
  const noticeChars = omittedNotice.length + (omittedNotice ? 2 : 0);
  let excerptBudget = Math.max(1, Math.floor((maxChars - separatorChars - noticeChars) / selected.length));
  const needsExcerptNotice = selected.some((section) => section.length > excerptBudget);

  if (needsExcerptNotice) {
    excerptBudget = Math.max(1, Math.floor((maxChars - separatorChars - noticeChars - EXCERPT_NOTICE.length - 2) / selected.length));
  }

  const output = selected.map((section) => truncateExcerpt(section, excerptBudget)).join(SECTION_SEPARATOR);
  const notices = [needsExcerptNotice ? EXCERPT_NOTICE : "", omittedNotice].filter(Boolean);
  return notices.length > 0 ? `${output}\n\n${notices.join("\n")}` : output;
}
