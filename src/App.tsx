import React, { useEffect, useMemo, useState } from "react";
import { generateSample } from "./sample/generate";
import { intakeTable, isReady, runAuditFull, type Intake } from "./engine/intake";
import { buildTrail } from "./engine/trail";
import { DEFAULT_SETTINGS } from "./engine/types";
import { Navbar, type Tab, TABS } from "./components/Navbar";
import { OverviewView } from "./components/OverviewView";
import { DashboardView } from "./components/DashboardView";
import { UploadView, type TrayItem } from "./components/UploadView";
import { OrderTrailView } from "./components/OrderTrailView";
import { LeaksView } from "./components/LeaksView";
import { FeeCheckView } from "./components/FeeCheckView";
import { ReportView } from "./components/ReportView";
import { PricingView } from "./components/PricingView";

export interface Rates {
  feePct: number;
  premiumPct: number;
  gstPct: number;
  codGraceDays: number;
}

export type ViewCtx = {
  result: ReturnType<typeof runAuditFull>["result"];
  data: ReturnType<typeof runAuditFull>["data"];
  trail: ReturnType<typeof buildTrail>;
  source: "sample" | "files";
  brandName: string;
  setTab: (t: Tab) => void;
};

const tabFromHash = (): Tab => {
  const h = window.location.hash.replace("#", "") as Tab;
  return TABS.some((t) => t.id === h) ? h : "overview";
};

export default function App() {
  const [tab, setTabState] = useState<Tab>(tabFromHash);
  const [source, setSource] = useState<"sample" | "files">("sample");
  const [items, setItems] = useState<TrayItem[]>([]);
  const [brand, setBrand] = useState("");
  const [rates, setRates] = useState<Rates>({
    feePct: DEFAULT_SETTINGS.gatewayFeePct,
    premiumPct: DEFAULT_SETTINGS.gatewayFeePctPremium,
    gstPct: DEFAULT_SETTINGS.gstPct,
    codGraceDays: DEFAULT_SETTINGS.codGraceDays,
  });

  useEffect(() => {
    const on = () => setTabState(tabFromHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const setTab = (t: Tab) => {
    setTabState(t);
    if (window.location.hash !== `#${t}`) window.history.replaceState(null, "", `#${t}`);
    window.scrollTo({ top: 0 });
  };

  const sample = useMemo(() => generateSample(), []);
  const sampleIntakes = useMemo<Intake[]>(() => sample.files.map((f) => intakeTable(f.name, f.table)), [sample]);
  const active = useMemo(() => (source === "sample" ? sampleIntakes : items.filter(isReady)), [source, sampleIntakes, items]);

  const { result, data } = useMemo(
    () =>
      runAuditFull(active, {
        asOf: source === "sample" ? sample.asOf : undefined,
        gatewayFeePct: rates.feePct,
        gatewayFeePctPremium: rates.premiumPct,
        gstPct: rates.gstPct,
        codGraceDays: rates.codGraceDays,
      }),
    [active, source, sample, rates],
  );
  const trail = useMemo(() => buildTrail(data, result), [data, result]);
  const brandName = source === "sample" ? "Indigo Loom" : brand.trim() || "your store";

  const ctx: ViewCtx = { result, data, trail, source, brandName, setTab };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <Navbar
        tab={tab}
        setTab={setTab}
        source={source}
        brandName={brandName}
        claimTotal={result.claimTotal}
        checkTotal={result.checkTotal}
        onBackToSample={() => setSource("sample")}
      />

      <main className="gutter mx-auto w-full max-w-7xl flex-1 pt-6 pb-16">
        {tab === "overview" && <OverviewView {...ctx} />}
        {tab === "dashboard" && <DashboardView {...ctx} />}
        {tab === "upload" && (
          <UploadView
            items={items}
            setItems={setItems}
            brand={brand}
            setBrand={setBrand}
            rates={rates}
            setRates={setRates}
            onRun={() => { setSource("files"); setTab("dashboard"); }}
          />
        )}
        {tab === "orders" && <OrderTrailView {...ctx} />}
        {tab === "leaks" && <LeaksView {...ctx} />}
        {tab === "fees" && <FeeCheckView {...ctx} rates={rates} setRates={setRates} />}
        {tab === "report" && <ReportView {...ctx} />}
        {tab === "pricing" && <PricingView {...ctx} />}
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/60">
        <div className="gutter mx-auto flex max-w-7xl flex-col gap-2 py-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-semibold text-slate-200">ReconOS</span> finds the money your courier and payment gateway owe you.
          </p>
          <p>Your files are checked in your browser and never uploaded.</p>
        </div>
      </footer>
    </div>
  );
}
