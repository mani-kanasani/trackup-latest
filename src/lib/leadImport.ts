// Paste-a-list import.
//
// The doctrine's daily quota is 20 connection requests. Reaching it through a
// modal that takes one lead at a time is not a workflow, it is a reason to stop
// using the app. A repo-wide search for csv, bulk or import returned nothing, so
// a stranger arriving with a 200-row export had no way in at all.
//
// Parsing is deliberately forgiving about format and strict about identity:
// people paste from Sales Navigator exports, Google Sheets, Notion tables and
// Apollo, which differ in delimiter and header wording but all key on a
// LinkedIn URL.

export interface ParsedRow {
  values: string[];
  /** 1-based, matching what the user sees in their spreadsheet. */
  line: number;
}

export interface ParsedSheet {
  headers: string[];
  rows: ParsedRow[];
  /** True when the first line looked like headers rather than data. */
  hadHeaders: boolean;
  delimiter: string;
}

export const IMPORT_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'linkedin_url', label: 'LinkedIn URL', required: true },
  { key: 'job_title', label: 'Job title', required: false },
  { key: 'company_name', label: 'Company', required: false },
  { key: 'industry', label: 'Industry', required: false },
  { key: 'company_website', label: 'Company website', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'potential_services', label: 'Services you could offer', required: false },
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number]['key'];

/** Header wordings seen in the exports people actually paste. */
const HEADER_HINTS: Record<ImportField, RegExp> = {
  name: /^(full ?name|name|first ?name|contact|person|lead)$/i,
  linkedin_url: /(linkedin|profile ?url|profile ?link|^url$)/i,
  job_title: /^(title|job ?title|position|role|headline)$/i,
  company_name: /^(company|company ?name|organi[sz]ation|account|employer)$/i,
  industry: /^(industry|sector|vertical)$/i,
  company_website: /(website|company ?url|domain|site)/i,
  email: /^(e-?mail|email ?address|work ?email)$/i,
  potential_services: /(service|offer|notes?|pitch)/i,
};

/**
 * Splits one line, honouring quoted fields.
 *
 * Written out rather than pulled from a library because a company name
 * containing a comma is the single most common thing that shifts every
 * subsequent column by one, and that failure stays invisible until somebody
 * reads a DM addressed to an industry.
 */
export const splitLine = (line: string, delimiter: string): string[] => {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === delimiter && !quoted) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
};

/** Tabs win when present: a paste straight out of a spreadsheet is tab-separated. */
export const detectDelimiter = (text: string): string => {
  const first = text.split(/\r?\n/).find((l) => l.trim()) ?? '';
  if (first.includes('\t')) return '\t';
  if (first.includes(';') && !first.includes(',')) return ';';
  return ',';
};

const looksLikeHeaders = (cells: string[]): boolean => {
  // A header row names things; a data row contains a URL.
  if (cells.some((c) => /https?:\/\//i.test(c))) return false;
  return cells.some((c) => Object.values(HEADER_HINTS).some((re) => re.test(c.trim())));
};

export const parseSheet = (text: string): ParsedSheet => {
  const delimiter = detectDelimiter(text);
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [], hadHeaders: false, delimiter };

  const firstCells = splitLine(lines[0], delimiter);
  const hadHeaders = looksLikeHeaders(firstCells);
  const headers = hadHeaders ? firstCells : firstCells.map((_, i) => `Column ${i + 1}`);

  const rows = lines.slice(hadHeaders ? 1 : 0).map((l, i) => ({
    values: splitLine(l, delimiter),
    line: i + (hadHeaders ? 2 : 1),
  }));

  return { headers, rows, hadHeaders, delimiter };
};

/**
 * Guesses which column is which.
 *
 * Header names first, then content: a column full of linkedin.com URLs is the
 * LinkedIn column whatever it is called, which is what makes a headerless paste
 * work at all.
 */
export const guessMapping = (sheet: ParsedSheet): Partial<Record<ImportField, number>> => {
  const mapping: Partial<Record<ImportField, number>> = {};
  const taken = new Set<number>();

  for (const field of IMPORT_FIELDS) {
    const idx = sheet.headers.findIndex(
      (h, i) => !taken.has(i) && HEADER_HINTS[field.key].test(h.trim()),
    );
    if (idx >= 0) {
      mapping[field.key] = idx;
      taken.add(idx);
    }
  }

  if (mapping.linkedin_url === undefined) {
    const idx = sheet.headers.findIndex(
      (_, i) => !taken.has(i) && sheet.rows.some((r) => /linkedin\.com\//i.test(r.values[i] ?? '')),
    );
    if (idx >= 0) {
      mapping.linkedin_url = idx;
      taken.add(idx);
    }
  }
  if (mapping.email === undefined) {
    const idx = sheet.headers.findIndex(
      (_, i) => !taken.has(i) && sheet.rows.some((r) => /@.+\./.test(r.values[i] ?? '')),
    );
    if (idx >= 0) {
      mapping.email = idx;
      taken.add(idx);
    }
  }
  return mapping;
};

/**
 * One canonical form per profile.
 *
 * Trailing slashes, query strings, http against https, www, and a locale prefix
 * are all the same person. Without collapsing them the uniqueness constraint
 * would cheerfully store five copies.
 */
export const normalizeLinkedInUrl = (raw: string): string => {
  const v = (raw ?? '').trim();
  if (!v) return '';
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    const host = u.hostname.replace(/^([a-z]{2,3}\.)?(www\.)?/i, '');
    const path = u.pathname.replace(/\/+$/, '').toLowerCase();
    return `https://${host.toLowerCase()}${path}`;
  } catch {
    return v.replace(/\/+$/, '').toLowerCase();
  }
};

export interface ImportRow {
  line: number;
  lead: Record<string, string>;
  /** Set when the row cannot be imported. */
  problem?: string;
  /** Set when the row is importable but something was changed. */
  note?: string;
}

export interface ImportPlan {
  ready: ImportRow[];
  skipped: ImportRow[];
}

/**
 * Turns a mapped sheet into rows to insert.
 *
 * Every rejection carries its line number, because "42 of 200 imported" with no
 * explanation is the point at which people stop trusting an importer and go back
 * to typing.
 */
export const buildPlan = (
  sheet: ParsedSheet,
  mapping: Partial<Record<ImportField, number>>,
  existingUrls: string[],
): ImportPlan => {
  const existing = new Set(existingUrls.map(normalizeLinkedInUrl).filter(Boolean));
  const seen = new Set<string>();
  const ready: ImportRow[] = [];
  const skipped: ImportRow[] = [];

  for (const row of sheet.rows) {
    const at = (f: ImportField) => {
      const i = mapping[f];
      return i === undefined ? '' : (row.values[i] ?? '').trim();
    };

    const name = at('name');
    const rawUrl = at('linkedin_url');
    const url = normalizeLinkedInUrl(rawUrl);

    if (!name && !url) continue; // A blank line is not an error.
    if (!name) {
      skipped.push({ line: row.line, lead: {}, problem: 'No name' });
      continue;
    }
    if (!url) {
      skipped.push({ line: row.line, lead: { name }, problem: 'No LinkedIn URL' });
      continue;
    }
    if (!/linkedin\.com\//i.test(url)) {
      skipped.push({ line: row.line, lead: { name }, problem: 'Not a LinkedIn profile URL' });
      continue;
    }
    if (existing.has(url)) {
      skipped.push({ line: row.line, lead: { name }, problem: 'Already in your list' });
      continue;
    }
    if (seen.has(url)) {
      skipped.push({ line: row.line, lead: { name }, problem: 'Duplicated inside this paste' });
      continue;
    }
    seen.add(url);

    const lead: Record<string, string> = { name, linkedin_url: url };
    for (const f of IMPORT_FIELDS) {
      if (f.key === 'name' || f.key === 'linkedin_url') continue;
      const v = at(f.key);
      if (v) lead[f.key] = v;
    }
    ready.push({
      line: row.line,
      lead,
      note: rawUrl !== url ? 'URL tidied to its canonical form' : undefined,
    });
  }

  return { ready, skipped };
};
