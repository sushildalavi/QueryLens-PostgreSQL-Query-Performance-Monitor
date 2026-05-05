// Lightweight SQL highlighter — regex-based, no dependency.
// Tokenizes keywords, functions, strings, numbers, operators, identifiers.

const KW = [
  "select", "from", "where", "and", "or", "not", "in", "is", "null", "as",
  "join", "left", "right", "inner", "outer", "full", "on", "using",
  "group", "by", "order", "having", "limit", "offset", "asc", "desc",
  "with", "distinct", "case", "when", "then", "else", "end",
  "insert", "into", "values", "update", "set", "delete",
  "create", "table", "index", "if", "exists", "drop", "alter",
  "interval", "between", "like", "ilike", "now", "true", "false",
  "primary", "key", "references", "default", "unique",
  "explain", "analyze", "format", "json", "buffers", "timing",
  "prepare", "execute", "deallocate", "begin", "commit", "rollback",
];
const FN = [
  "count", "sum", "avg", "min", "max", "coalesce", "nullif",
  "to_char", "to_timestamp", "lower", "upper", "length", "trim",
  "round", "ceil", "floor", "abs",
];

const KW_RE = new RegExp(`\\b(${KW.join("|")})\\b`, "gi");
const FN_RE = new RegExp(`\\b(${FN.join("|")})\\b(?=\\s*\\()`, "gi");
const STR_RE = /'(?:[^']|'')*'/g;
const NUM_RE = /\b\d+(?:\.\d+)?\b/g;
const PARAM_RE = /\$\d+|\?/g;
const COMMENT_RE = /--[^\n]*|\/\*[\s\S]*?\*\//g;

interface Token {
  s: number;
  e: number;
  cls: string;
}

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  const push = (re: RegExp, cls: string) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(sql))) {
      tokens.push({ s: m.index, e: m.index + m[0].length, cls });
    }
  };
  push(COMMENT_RE, "tok-com");
  push(STR_RE, "tok-str");
  push(FN_RE, "tok-fn");
  push(KW_RE, "tok-kw");
  push(NUM_RE, "tok-num");
  push(PARAM_RE, "tok-param");

  // resolve overlapping tokens — comment/string wins, then keep first by start
  tokens.sort((a, b) => a.s - b.s || b.e - a.e);
  const filtered: Token[] = [];
  let cursor = 0;
  for (const t of tokens) {
    if (t.s < cursor) continue;
    filtered.push(t);
    cursor = t.e;
  }
  return filtered;
}

const CLASS_MAP: Record<string, string> = {
  "tok-kw": "text-accent",
  "tok-fn": "text-ok",
  "tok-str": "text-warn",
  "tok-num": "text-secondary",
  "tok-param": "text-bad",
  "tok-com": "text-muted italic",
};

interface Props {
  sql: string;
  className?: string;
}

export function SqlCode({ sql, className = "" }: Props) {
  const tokens = tokenize(sql);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  tokens.forEach((t, i) => {
    if (t.s > cursor) {
      parts.push(
        <span key={`p-${i}`} className="text-secondary">
          {sql.slice(cursor, t.s)}
        </span>
      );
    }
    parts.push(
      <span key={`t-${i}`} className={CLASS_MAP[t.cls] || ""}>
        {sql.slice(t.s, t.e)}
      </span>
    );
    cursor = t.e;
  });
  if (cursor < sql.length) {
    parts.push(
      <span key="tail" className="text-secondary">
        {sql.slice(cursor)}
      </span>
    );
  }

  return (
    <pre className={`font-mono text-xs leading-relaxed whitespace-pre-wrap break-all ${className}`}>
      {parts}
    </pre>
  );
}
