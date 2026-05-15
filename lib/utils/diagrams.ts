const NOTE_DIAGRAM_BUCKET_PREFIX = "note-diagrams/";
const STORAGE_PATH_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[^/?#]+\.(?:svg|png|jpe?g)$/i;

export function normalizeDiagramStoragePath(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith(NOTE_DIAGRAM_BUCKET_PREFIX)
    ? trimmed.slice(NOTE_DIAGRAM_BUCKET_PREFIX.length)
    : trimmed;
}

export function isNoteDiagramStoragePath(value: string) {
  const path = normalizeDiagramStoragePath(value);
  return path.length <= 700 && !path.includes("..") && STORAGE_PATH_PATTERN.test(path);
}

export function diagramRenderUrl(path: string) {
  return `/api/diagrams/render?path=${encodeURIComponent(normalizeDiagramStoragePath(path))}`;
}

export function normalizeDiagramImageUrl(src: string) {
  if (src.startsWith("/api/diagrams/render?path=")) return src;
  return isNoteDiagramStoragePath(src) ? diagramRenderUrl(src) : src;
}

function markdownAltText(text: string) {
  return text.replace(/[\[\]\n\r]/g, " ").replace(/\s+/g, " ").trim() || "Diagram";
}

export function diagramMarkdownImage(path: string, altText: string) {
  return `![${markdownAltText(altText)}](${diagramRenderUrl(path)})`;
}
