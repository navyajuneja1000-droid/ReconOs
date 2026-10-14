"use client";

import { KIND_SPECS, SPEC_BY_KIND } from "@/engine/detect";
import type { Intake } from "@/engine/intake";
import { isReady } from "@/engine/intake";
import type { FileKind } from "@/engine/types";

export interface TrayItem extends Intake {
  uid: string;
}

export function FileTray({
  items,
  errors,
  onRemove,
  onChangeKind,
  onMap,
}: {
  items: TrayItem[];
  errors: { name: string; message: string }[];
  onRemove: (uid: string) => void;
  onChangeKind: (uid: string, kind: FileKind | "") => void;
  onMap: (uid: string, field: string, col: number | null) => void;
}) {
  const have = new Set(items.filter(isReady).map((i) => i.kind));
  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <section aria-labelledby="your-files">
        <h2 id="your-files" className="text-lg font-semibold">Your files</h2>
        <ul className="mt-3 divide-y divide-rule-2 rounded-lg border border-rule bg-sheet">
          {items.map((it) => {
            const ready = isReady(it);
            const headers = (it.table[it.headerRow] ?? []).map((h) => String(h ?? ""));
            return (
              <li key={it.uid} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{it.name}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {ready
                        ? `${SPEC_BY_KIND[it.kind!].label}, ${it.rows.toLocaleString("en-IN")} rows`
                        : it.kind
                          ? `Looks like ${SPEC_BY_KIND[it.kind].label}, but some columns weren't found`
                          : "We couldn't tell what this file is"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${ready ? "bg-moss-soft text-moss" : "bg-amber-soft text-amber"}`}>
                      {ready ? "Ready" : "Needs your help"}
                    </span>
                    <button type="button" onClick={() => onRemove(it.uid)} className="rounded px-2 py-1 text-sm text-muted hover:bg-paper hover:text-ink">
                      Remove
                    </button>
                  </div>
                </div>

                {!ready && (
                  <div className="mt-4 grid gap-3 rounded-md bg-paper p-3 text-sm">
                    <label className="grid gap-1">
                      <span className="font-medium">What is this file?</span>
                      <select
                        className="rounded border border-rule bg-sheet px-2 py-1.5"
                        value={it.kind ?? ""}
                        onChange={(e) => onChangeKind(it.uid, e.target.value as FileKind | "")}
                      >
                        <option value="">Choose a file type</option>
                        {KIND_SPECS.map((s) => (
                          <option key={s.kind} value={s.kind}>{s.label}</option>
                        ))}
                      </select>
                    </label>
                    {it.kind &&
                      SPEC_BY_KIND[it.kind].fields
                        .filter((f) => SPEC_BY_KIND[it.kind!].required.flat().includes(f.key))
                        .map((f) => (
                          <label key={f.key} className="grid gap-1">
                            <span>Which column has the <strong className="font-medium">{/^[A-Z]{2}/.test(f.label) ? f.label : f.label.toLowerCase()}</strong>?</span>
                            <select
                              className="rounded border border-rule bg-sheet px-2 py-1.5"
                              value={it.map[f.key] ?? ""}
                              onChange={(e) => onMap(it.uid, f.key, e.target.value === "" ? null : Number(e.target.value))}
                            >
                              <option value="">Not in this file</option>
                              {headers.map((h, i) => (
                                <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                              ))}
                            </select>
                          </label>
                        ))}
                  </div>
                )}
              </li>
            );
          })}
          {errors.map((e, i) => (
            <li key={`err-${i}`} className="p-4">
              <p className="font-medium">{e.name}</p>
              <p className="mt-0.5 text-sm text-amber">{e.message}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="checklist">
        <h2 id="checklist" className="text-lg font-semibold">What each file unlocks</h2>
        <ul className="mt-3 grid gap-2">
          {KIND_SPECS.map((s) => {
            const ok = have.has(s.kind);
            return (
              <li key={s.kind} className={`rounded-lg border p-3 ${ok ? "border-moss/30 bg-moss-soft/50" : "border-rule bg-sheet"}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">{s.label}</p>
                  <span className={`shrink-0 text-xs font-medium ${ok ? "text-moss" : "text-muted"}`}>{ok ? "Added" : s.kind === "shopify_orders" ? "Needed" : "Optional"}</span>
                </div>
                <p className="mt-1 text-sm text-ink-2">{s.unlocks}</p>
                {!ok && <p className="mt-1 text-xs text-muted">Where to get it: {s.source}</p>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
