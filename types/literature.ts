export interface Background {
  era: string | null;
  genre: string | null;
  context: string[];
  sources: string[];
}

export interface AuthorInfo {
  life: string | null;
  motivation: string | null;
  literary_position: string | null;
  sources: string[];
}

export interface SymbolEntry {
  symbol: string;
  meaning: string;
  example: string;
}

export interface CriticismEntry {
  critic: string;
  perspective: string;
  quote: string;
  source: string;
}

export interface LiteratureResult {
  title: string;
  author: string | null;
  background: Background;
  author_info: AuthorInfo;
  symbols: SymbolEntry[];
  criticism: CriticismEntry[];
  reading_tips: string | null;
}

export type SearchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; data: LiteratureResult }
  | { kind: "error"; message: string }
  | { kind: "rate_limited"; message: string; resetIn?: number };
