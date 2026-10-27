import React, { useEffect, useRef, useState } from "react";
import { useAccount } from "../account/AccountContext";
import { Btn } from "../ui";

const WHY = {
  audit: { title: "Log in to run your audit", sub: "Your first audit is free. We save the results and your rates so next month is quicker. Your report files still never leave this browser." },
  upgrade: { title: "Log in to choose a plan", sub: "Your plan is linked to your login, so it works on any device." },
  account: { title: "Log in to ReconOS", sub: "See your saved audits, rates and plan." },
} as const;

export function LoginDialog() {
  const a = useAccount();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [agree, setAgree] = useState(false);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => { if (a.loginFor) { setStep("email"); setCode(""); setErr(""); setTimeout(() => first.current?.focus(), 0); } }, [a.loginFor]);
  useEffect(() => {
    if (!a.loginFor) return;
    const on = (e: KeyboardEvent) => e.key === "Escape" && a.closeLogin();
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [a.loginFor, a]);
  if (!a.enabled || !a.loginFor) return null;
  const why = WHY[a.loginFor];

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr("Enter a valid email address.");
    if (!agree) return setErr("Please tick the box to agree to the Terms and Privacy Policy.");
    setBusy(true); setErr("");
    const e2 = await a.sendCode(email.trim());
    setBusy(false);
    if (e2) setErr(e2); else { setStep("code"); setTimeout(() => first.current?.focus(), 0); }
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6,8}$/.test(code.trim())) return setErr("Enter the code from the email.");
    setBusy(true); setErr("");
    const e2 = await a.verifyCode(email.trim(), code.trim());
    setBusy(false);
    if (e2) setErr(e2);
  };
  const google = async () => {
    if (!agree) return setErr("Please tick the box to agree to the Terms and Privacy Policy.");
    setErr(""); const e2 = await a.google(); if (e2) setErr(e2);
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={a.closeLogin}>
      <div id="login-dialog" role="dialog" aria-modal="true" aria-labelledby="login-title" className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} data-clarity-mask="True">
        <div className="flex items-start justify-between gap-4">
          <h2 id="login-title" className="text-xl font-semibold">{why.title}</h2>
          <button type="button" aria-label="Close" onClick={a.closeLogin} className="-mr-2 -mt-1 rounded-md px-2 py-1 text-xl leading-none text-slate-400 hover:text-white">×</button>
        </div>
        <p className="mt-1 text-sm text-slate-300">{why.sub}</p>

        {step === "email" ? (
          <form onSubmit={send} noValidate className="mt-5 grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-slate-300">Work email</span>
              <input ref={first} id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourbrand.in" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-base focus:border-emerald-400 focus:outline-none" />
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-300">
              <input id="login-agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500" />
              <span>I agree to the <a href="/terms" target="_blank" rel="noreferrer" className="text-emerald-300 hover:underline">Terms</a> and <a href="/privacy" target="_blank" rel="noreferrer" className="text-emerald-300 hover:underline">Privacy Policy</a>.</span>
            </label>
            <Btn type="submit" variant="primary" className="py-2.5" disabled={busy}>{busy ? "Sending" : "Email me a code"}</Btn>
            <div className="flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-800" />or<span className="h-px flex-1 bg-slate-800" /></div>
            <Btn onClick={google} className="py-2.5">Continue with Google</Btn>
          </form>
        ) : (
          <form onSubmit={verify} noValidate className="mt-5 grid gap-3">
            <p className="text-sm text-slate-300">We sent a login email to <strong className="font-semibold text-slate-100">{email}</strong>. Enter the code from it below, or click the link in it on this device. It can take a minute; check spam too.</p>
            <label className="grid gap-1 text-sm">
              <span className="text-slate-300">Code</span>
              <input ref={first} id="login-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="12345678" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-center font-mono text-xl tracking-[0.3em] focus:border-emerald-400 focus:outline-none" />
            </label>
            <Btn type="submit" variant="primary" className="py-2.5" disabled={busy}>{busy ? "Checking" : "Log in"}</Btn>
            <button type="button" onClick={() => { setStep("email"); setErr(""); }} className="text-sm text-slate-400 hover:text-slate-200">Use a different email</button>
          </form>
        )}
        {err && <p role="alert" className="mt-3 text-sm text-rose-300">{err}</p>}
      </div>
    </div>
  );
}
