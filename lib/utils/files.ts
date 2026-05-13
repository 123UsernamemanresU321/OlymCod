const ACCEPTED_MIME_TYPES = new Set([
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/jpg"
]);

const ACCEPTED_EXTENSIONS = new Set(["svg", "png", "jpg", "jpeg"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function validateDiagramFile(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeAllowed = file.type ? ACCEPTED_MIME_TYPES.has(file.type) : true;

  if (!ACCEPTED_EXTENSIONS.has(extension) || !mimeAllowed) {
    return "Upload SVG, PNG, JPG, or JPEG diagrams only.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "Diagram files must be 5MB or smaller.";
  }

  return null;
}

export function safeFilename(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "file";
  const basename = filename
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return `${basename || "diagram"}-${Date.now()}.${extension}`;
}
