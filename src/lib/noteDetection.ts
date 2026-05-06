import type { NoteKind } from "../types";

const URL_RE = /^https?:\/\//i;

const CMD_PREFIXES = [
  "npm", "npx", "git", "pnpm", "yarn", "bun", "cargo", "gcloud", "firebase", 
  "docker", "kubectl", "pip", "python", "node", "cd ", "mkdir", "rm ", "ls ", "cat ", "echo "
];

const CODE_KEYWORDS = [
  "const ", "let ", "var ", "function ", "import ", "export ", "type ", "interface ", "class "
];

export function detectNoteKind(text: string): NoteKind {
  const trimmed = text.trim();
  if (URL_RE.test(trimmed)) return "url";
  
  const lower = trimmed.toLowerCase();
  
  if (CMD_PREFIXES.some((p) => lower.startsWith(p))) return "code";
  if (CODE_KEYWORDS.some((p) => lower.startsWith(p))) return "code";
  if (trimmed.includes("```")) return "code";
  if (trimmed.startsWith("$")) return "code";
  
  const symbols = trimmed.match(/[{}=>;]/g);
  if (symbols && symbols.length >= 3) return "code";

  return "plain";
}

export function isUrl(text: string): boolean {
  return URL_RE.test(text.trim());
}
