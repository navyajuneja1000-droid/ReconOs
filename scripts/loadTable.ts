// Reads a CSV or .xlsx file from disk into rows, the same way the browser does.
import { readFileSync } from "node:fs";
import Papa from "papaparse";
import { readSheet } from "read-excel-file/node";
import type { Table } from "../src/engine/types";

export async function loadTable(path: string): Promise<Table> {
  const lower = path.toLowerCase();
  if (lower.endsWith(".xlsx")) return (await readSheet(path)) as Table;
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    const text = readFileSync(path, "utf8").replace(/^﻿/, "");
    return Papa.parse<string[]>(text, { skipEmptyLines: false }).data as Table;
  }
  throw new Error(`Only .csv and .xlsx files can be read: ${path}`);
}
