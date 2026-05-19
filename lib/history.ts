const HISTORY_KEY = "clh:history";
const MAX_ITEMS = 10;

export interface HistoryItem {
  title: string;
  ts: number;
}

function isHistoryItem(x: unknown): x is HistoryItem {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as HistoryItem).title === "string" &&
    typeof (x as HistoryItem).ts === "number"
  );
}

export function getHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryItem);
  } catch {
    return [];
  }
}

export function pushHistory(title: string): HistoryItem[] {
  if (typeof window === "undefined") return [];
  const existing = getHistory().filter((h) => h.title !== title);
  const next = [{ title, ts: Date.now() }, ...existing].slice(0, MAX_ITEMS);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function clearHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {}
  return [];
}
