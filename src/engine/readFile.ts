import Papa from "papaparse";
import type { Table } from "./types";

export class UnsupportedFileError extends Error {}

/** Read a CSV or .xlsx file into rows, entirely in the browser. */
export async function readTable(file: File): Promise<Table> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt") || file.type === "text/csv") {
    const text = await file.text();
    const res = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: false });
    return res.data as Table;
  }
  if (name.endsWith(".xlsx")) {
    const { readSheet } = await import("read-excel-file/browser");
    const rows = await readSheet(file);
    return rows as Table;
  }
  if (name.endsWith(".xls")) {
    throw new UnsupportedFileError(
      "This is an old-style .xls file. Open it in Excel or Google Sheets, save it as .xlsx or .csv, and add it again.",
    );
  }
  throw new UnsupportedFileError("Only .csv and .xlsx files can be read. Export the report as CSV or Excel and add it again.");
}

export function download(name: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
