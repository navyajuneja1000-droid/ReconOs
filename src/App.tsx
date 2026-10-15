import React, { useEffect, useMemo, useState } from "react";
import { generateSample } from "./sample/generate";
import { intakeTable, isReady, partnersIn, runAuditFull, type Intake } from "./engine/intake";
import { buildTrail } from "./engine/trail";
import { emptyCard, isCardReady, ratesFromCards, type RateCard } from "./engine/partners";
import { Navbar, type Tab, TABS } from "./components/Navbar";
import { OverviewView } from "./components/OverviewView";
import { DashboardView } from "./components/DashboardView";
import { PartnersView } from "./components/PartnersView";
import { UploadView, type TrayItem } from "./components/UploadView";
import { OrderTrailView } from "./components/OrderTrailView";
import { LeaksView } from "./components/LeaksView";
import { FeeCheckView } from "./components/FeeCheckView";
import { ReportView } from "./components/ReportView";
import { PricingView } from "./components/PricingView";

export type Cards = Record<string, RateCard>;

export type ViewCtx = {
  result: ReturnType<typeof runAuditFull>["result"];
  data: ReturnType<typeof runAuditFull>["data"];
  trail: ReturnType<typeof buildTrail>;
  source: "sample" | "files";
  brandName: string;
  setTab: (t: Tab) => void;
  /** partner filter shared by Partners, Leaks and Order trail: "all", a partner id, or "team" */
  partner: string;
  setPartner: (p: string) => void;
  /** rate cards for the data on screen */
  cards: Cards;
  setCard: (c: RateCard) => void;
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
  const [partner, setPartner] = useState("all");
  const sample = useMemo(() => generateSample(), []);
  const [sampleCards, setSampleCards] = useState<Cards>(() => sample.cards);
  const [fileCards, setFileCards] = useState<Cards>({});

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

  const sampleIntakes = useMemo<Intake[]>(() => sample.files.map((f) => intakeTable(f.name, f.table)), [sample]);
  const active = useMemo(() => (source === "sample" ? sampleIntakes : items.filter(isReady)), [source, sampleIntakes, items]);
  const cards = source === "sample" ? sampleCards : fileCards;
  // only confirmed rate cards are used, so a half-typed card never drives a claim
  const confirmed = useMemo(() => Object.fromEntries(Object.entries(cards).filter(([, c]) => isCardReady(c))), [cards]);

  const { result, data } = useMemo(
    () => runAuditFull(active, { asOf: source === "sample" ? sample.asOf : undefined, ...ratesFromCards(confirmed) }),
    [active, source, sample, confirmed],
  );
  const trail = useMemo(() => buildTrail(data, result), [data, result]);
  const brandName = source === "sample" ? "Indigo Loom" : brand.trim() || "your store";
  const setCard = (c: RateCard) => (source === "sample" ? setSampleCards : setFileCards)((prev) => ({ ...prev, [c.partner]: c }));

  // a partner filter from the other data set means nothing here
  const known = partner === "all" || partner === "team" || result.partners.some((p) => p.id === partner);
  const ctx: ViewCtx = { result, data, trail, source, brandName, setTab, partner: known ? partner : "all", setPartner, cards, setCard };

  const filePartners = partnersIn(items);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <Navbar
        tab={tab}
        setTab={setTab}
        source={source}
        brandName={brandName}
        claimTotal={result.claimTotal}
        checkTotal={result.checkTotal}
        onBackToSample={() => { setSource("sample"); setPartner("all"); }}
      />

      <main className="gutter mx-auto w-full max-w-7xl flex-1 pt-6 pb-16">
        {tab === "overview" && <OverviewView {...ctx} />}
        {tab === "dashboard" && <DashboardView {...ctx} />}
        {tab === "partners" && <PartnersView {...ctx} />}
        {tab === "upload" && (
          <UploadView
            items={items}
            setItems={setItems}
            brand={brand}
            setBrand={setBrand}
            cards={Object.fromEntries(filePartners.map((p) => [p, fileCards[p] ?? emptyCard(p)]))}
            setCard={(c) => setFileCards((prev) => ({ ...prev, [c.partner]: c }))}
            onRun={() => { setSource("files"); setPartner("all"); setTab("dashboard"); }}
          />
        )}
        {tab === "orders" && <OrderTrailView {...ctx} />}
        {tab === "leaks" && <LeaksView {...ctx} />}
        {tab === "fees" && <FeeCheckView {...ctx} />}
        {tab === "report" && <ReportView {...ctx} />}
        {tab === "pricing" && <PricingView {...ctx} />}
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/60">
        <div className="gutter mx-auto flex max-w-7xl flex-col gap-2 py-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-semibold text-slate-200">ReconOS</span> finds the money your couriers and payment gateways owe you.
          </p>
          <p>Your files are checked in your browser and never uploaded.</p>
        </div>
      </footer>
    </div>
  );
}
