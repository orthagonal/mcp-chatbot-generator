export function normalizeCommand(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ");
}

export function humanizeToolName(name: string): string {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function singularize(noun: string): string {
  if (noun.endsWith("ies")) return `${noun.slice(0, -3)}y`;
  if (noun.endsWith("ses")) return noun.slice(0, -2);
  if (noun.endsWith("s") && noun.length > 1) return noun.slice(0, -1);
  return noun;
}

export function pluralize(noun: string): string {
  if (noun.endsWith("y")) return `${noun.slice(0, -1)}ies`;
  if (noun.endsWith("s")) return noun;
  return `${noun}s`;
}
