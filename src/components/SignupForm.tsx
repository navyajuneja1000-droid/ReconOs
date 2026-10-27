import React, { useState } from "react";
import { Btn } from "../ui";

// Sign-ups go to Formspree. VITE_WAITLIST_ENDPOINT can override it (for example a test form).
const ENDPOINT = (import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_WAITLIST_ENDPOINT || "https://formspree.io/f/xnpjwqjn";

export function SignupForm({ id = "signup" }: { id?: string }) {
  const [email, setEmail] = useState("");
  const [store, setStore] = useState("");
  const [orders, setOrders] = useState("");
  const [agree, setAgree] = useState(false);
  const [trap, setTrap] = useState(""); // hidden from people; bots fill it in
  const [state, setState] = useState<"idle" | "sending" | "done" | "error" | "closed">("idle");
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setState("error");
      setMsg("Enter a valid email address, like you@yourbrand.in.");
      return;
    }
    if (!agree) {
      setState("error");
      setMsg("Please tick the box to agree to the Privacy Policy, so we can email you.");
      return;
    }
    if (!ENDPOINT) {
      setState("closed");
      setMsg("Early-access sign-ups open very soon. Nothing was saved, so please check back.");
      return;
    }
    if (trap) {
      // a bot filled the hidden field, so pretend it worked and save nothing
      setState("done");
      setMsg("You're on the list. We'll email you when your monthly audits are ready.");
      return;
    }
    setState("sending");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ _subject: "New ReconOS early access sign-up", _replyto: email.trim(), email: email.trim(), store: store.trim(), monthlyOrders: orders, source: "reconos-site", consent: "Agreed to Privacy Policy (version 27 October 2026) and to receive emails about ReconOS early access", consentAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("done");
      setMsg("You're on the list. We'll email you when your monthly audits are ready.");
    } catch {
      setState("error");
      setMsg("That didn't go through. Check your connection and try again.");
    }
  };

  if (state === "done") {
    return <p id={id} className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-200">{msg}</p>;
  }
  return (
    <form id={id} onSubmit={submit} noValidate data-clarity-mask="True" className="grid gap-3 sm:grid-cols-[1.4fr_1fr_0.9fr_auto] sm:items-end">
      <label className="grid gap-1 text-sm">
        <span className="text-slate-300">Work email</span>
        <input id={`${id}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourbrand.in" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none" />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-slate-300">Store name</span>
        <input id={`${id}-store`} value={store} onChange={(e) => setStore(e.target.value)} placeholder="Optional" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none" />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-slate-300">Orders a month</span>
        <select id={`${id}-orders`} value={orders} onChange={(e) => setOrders(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-base text-slate-100 focus:border-emerald-400 focus:outline-none">
          <option value="">Choose</option>
          <option>Under 300</option>
          <option>300 to 2,000</option>
          <option>2,000 to 15,000</option>
          <option>Over 15,000</option>
        </select>
      </label>
      <Btn type="submit" variant="primary" className="py-2.5" disabled={state === "sending"}>{state === "sending" ? "Sending" : "Get early access"}</Btn>
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>Leave this empty<input name="_gotcha" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} /></label>
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-300 sm:col-span-4">
        <input id={`${id}-agree`} type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500" />
        <span>I agree to the <a href="/privacy" target="_blank" rel="noreferrer" className="text-emerald-300 underline-offset-4 hover:underline">Privacy Policy</a> and to receive emails about ReconOS early access. I can unsubscribe at any time.</span>
      </label>
      {msg && <p className={`text-sm sm:col-span-4 ${state === "error" ? "text-rose-300" : "text-slate-300"}`}>{msg}</p>}
    </form>
  );
}
