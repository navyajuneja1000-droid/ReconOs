import { detectKind, mapColumns, missingRequired, SPEC_BY_KIND, type ColumnMap, type Detection } from "./detect";
import { normalise, type ParsedFile } from "./normalize";
import { audit } from "./audit";
import { guessPartner, PARTNERS, partnerName, partnerTypeForKind } from "./partners";
import { methodFromFileName } from "./instruments";
import type { AuditResult, Dataset, FileKind, Settings, Table } from "./types";

export interface Intake {
  name: string;
  table: Table;
  kind: FileKind | null;
  /** partner id for courier and gateway files; null until known */
  partner: string | null;
  /** gateway files with no method column: the one method the file holds ("upi", "card", ...), or "" for a mix */
  methodHint: string;
  headerRow: number;
  map: ColumnMap;
  missing: string[][]; // required fields still unmapped (alternatives)
  rows: number;
}

const dataRows = (t: Table, headerRow: number) => t.slice(headerRow + 1).filter((r) => r.some((c) => String(c ?? "").trim() !== "")).length;

/** Only gateway files without a method column use a hint; it's read from the file name unless set by hand. */
function hintFor(kind: FileKind | null, map: ColumnMap, name: string, manual?: string): string {
  if (kind !== "gateway_settlements" || map.method !== undefined) return "";
  return manual !== undefined ? manual : methodFromFileName(name);
}

/** Courier and gateway files must say who sent them, so their findings land on the right partner. */
export const needsPartner = (i: Pick<Intake, "kind">) => partnerTypeForKind(i.kind) !== null;

/**
 * Recognise a table and who sent it. Pass kind/partner/headerRow/overrides when the founder
 * fixes it by hand.
 */
export function intakeTable(
  name: string,
  table: Table,
  manual?: { kind: FileKind; partner?: string | null; headerRow?: number; overrides?: ColumnMap; methodHint?: string },
): Intake {
  const clean = table.filter((r) => Array.isArray(r));
  if (manual) {
    const headerRow = manual.headerRow ?? 0;
    const type = partnerTypeForKind(manual.kind);
    const partner = type ? (manual.partner !== undefined ? manual.partner : guessPartner(name, clean, type)) : null;
    const map = mapColumns(manual.kind, clean[headerRow] ?? [], manual.overrides ?? {}, partner);
    return {
      name, table: clean, kind: manual.kind, partner, headerRow, map,
      methodHint: hintFor(manual.kind, map, name, manual.methodHint),
      missing: missingRequired(manual.kind, map),
      rows: dataRows(clean, headerRow),
    };
  }

  // 1. read the file using the partner its name or headers point to (or generic columns)
  const guess = guessPartner(name, clean);
  let d: Detection = detectKind(clean, guess);
  let via: string | null = guess;
  // 2. if that fails, try each partner's own column names
  if (!d.kind) {
    for (const p of PARTNERS) {
      if (!Object.keys(p.columns).length || p.id === guess) continue;
      const t = detectKind(clean, p.id);
      if (t.kind && t.score > d.score) { d = t; via = p.id; }
    }
  }
  const type = partnerTypeForKind(d.kind);
  let partner: string | null = null;
  if (type) {
    // only the title rows and the header row: data rows name carriers ("Ekart", "Shadowfax") inside aggregator files
    partner = guessPartner(name, clean.slice(0, d.headerRow + 1), type);
    if (!partner && via && PARTNERS.find((p) => p.id === via)?.type === type) partner = via;
  }
  // re-map with the final partner's column names
  const map = d.kind ? mapColumns(d.kind, clean[d.headerRow] ?? [], {}, partner) : d.map;
  return {
    name, table: clean, kind: d.kind, partner, headerRow: d.headerRow, map,
    methodHint: hintFor(d.kind, map, name),
    missing: d.kind ? missingRequired(d.kind, map) : [],
    rows: dataRows(clean, d.headerRow),
  };
}

export function isReady(i: Intake): boolean {
  return !!i.kind && i.missing.length === 0 && (!needsPartner(i) || !!i.partner);
}

/** Partner ids across the ready files, gateways first. */
export function partnersIn(intakes: Intake[]): string[] {
  const ids = new Set(intakes.filter(isReady).map((i) => i.partner).filter((p): p is string => !!p));
  return PARTNERS.filter((p) => ids.has(p.id)).sort((a, b) => (a.type === b.type ? 0 : a.type === "gateway" ? -1 : 1)).map((p) => p.id);
}

export function runAuditFull(intakes: Intake[], settings: Partial<Settings> = {}): { result: AuditResult; data: Dataset } {
  const ready = intakes.filter(isReady);
  const files: ParsedFile[] = ready.map((i) => ({
    name: i.name, kind: i.kind!, partner: i.partner, table: i.table, headerRow: i.headerRow, map: i.map, methodHint: i.methodHint,
  }));
  const data = normalise(files);
  const groups = new Map<string, number>();
  for (const f of files) {
    const k = `${f.kind}|${f.partner ?? ""}`;
    groups.set(k, (groups.get(k) ?? 0) + 1);
  }
  for (const [k, n] of groups) {
    if (n < 2) continue;
    const [kind, partner] = k.split("|") as [FileKind, string];
    data.notes.push(`${n} files were read as ${partner ? `${partnerName(partner)} ${SPEC_BY_KIND[kind].label.toLowerCase()}` : SPEC_BY_KIND[kind].label}; their rows were combined.`);
  }
  return { result: audit(data, settings), data };
}

export function runAudit(intakes: Intake[], settings: Partial<Settings> = {}): AuditResult {
  return runAuditFull(intakes, settings).result;
}
