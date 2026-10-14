import { detectKind, mapColumns, missingRequired, SPEC_BY_KIND, type ColumnMap } from "./detect";
import { normalise, type ParsedFile } from "./normalize";
import { audit } from "./audit";
import type { AuditResult, FileKind, Settings, Table } from "./types";

export interface Intake {
  name: string;
  table: Table;
  kind: FileKind | null;
  headerRow: number;
  map: ColumnMap;
  missing: string[][]; // required fields still unmapped (alternatives)
  rows: number;
}

/** Recognise a table. Pass kind/headerRow/overrides when the founder fixes it by hand. */
export function intakeTable(
  name: string,
  table: Table,
  manual?: { kind: FileKind; headerRow?: number; overrides?: ColumnMap },
): Intake {
  const clean = table.filter((r) => Array.isArray(r));
  if (manual) {
    const headerRow = manual.headerRow ?? 0;
    const map = mapColumns(manual.kind, clean[headerRow] ?? [], manual.overrides ?? {});
    return {
      name, table: clean, kind: manual.kind, headerRow, map,
      missing: missingRequired(manual.kind, map),
      rows: Math.max(0, clean.length - headerRow - 1),
    };
  }
  const d = detectKind(clean);
  return {
    name, table: clean, kind: d.kind, headerRow: d.headerRow, map: d.map,
    missing: d.kind ? missingRequired(d.kind, d.map) : [],
    rows: Math.max(0, clean.length - d.headerRow - 1),
  };
}

export function isReady(i: Intake): boolean {
  return !!i.kind && i.missing.length === 0;
}

export function runAudit(intakes: Intake[], settings: Partial<Settings> = {}): AuditResult {
  const ready = intakes.filter(isReady);
  const files: ParsedFile[] = ready.map((i) => ({
    name: i.name, kind: i.kind!, table: i.table, headerRow: i.headerRow, map: i.map,
  }));
  const ds = normalise(files);
  const kinds = new Set(files.map((f) => f.kind));
  for (const k of kinds) {
    if (files.filter((f) => f.kind === k).length > 1) ds.notes.push(`${files.filter((f) => f.kind === k).length} files were read as ${SPEC_BY_KIND[k].label}; their rows were combined.`);
  }
  return audit(ds, settings);
}
