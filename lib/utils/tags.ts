export function parseTags(value: string) {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
