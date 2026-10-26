import React, { useEffect } from "react";
import { LEGAL, LEGAL_DOCS, type LegalDoc } from "../legal/content";
import { Logo } from "./Navbar";
import { SiteFooter } from "./SiteFooter";

/** Turns the contact email inside text into a link. */
function withLinks(text: string): React.ReactNode {
  const parts = text.split(LEGAL.email);
  return parts.flatMap((part, i) => (i === 0 ? [part] : [<a key={i} href={`mailto:${LEGAL.email}`} className="text-emerald-300 underline-offset-4 hover:underline">{LEGAL.email}</a>, part]));
}

export function LegalPage({ doc }: { doc: LegalDoc }) {
  useEffect(() => {
    document.title = `${doc.title} | ReconOS`;
    // the page renders after load, so jump to #section links ourselves
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, [doc]);
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="gutter mx-auto flex max-w-7xl items-center justify-between gap-4 py-3">
          <a href="/" className="flex items-center gap-3">
            <Logo />
            <span className="text-lg font-bold tracking-tight">ReconOS</span>
          </a>
          <a href="/" className="rounded-lg bg-emerald-500 px-3.5 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">Back to ReconOS</a>
        </div>
      </header>

      <main className="gutter mx-auto w-full max-w-3xl flex-1 pt-8 pb-16">
        <nav aria-label="Policies" className="flex flex-wrap gap-2 text-sm">
          {LEGAL_DOCS.map((d) => (
            <a key={d.path} href={d.path} aria-current={d.path === doc.path ? "page" : undefined}
              className={`rounded-full border px-3 py-1 ${d.path === doc.path ? "border-emerald-400 bg-emerald-500/10 text-emerald-200" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
              {d.title}
            </a>
          ))}
        </nav>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">{doc.title}</h1>
        <p className="mt-1 text-sm text-slate-400">Last updated {LEGAL.updated}</p>
        <p className="mt-4 text-slate-300">{withLinks(doc.intro)}</p>
        {doc.sections.map((s) => (
          <section key={s.h} id={s.id} className="mt-8 scroll-mt-6">
            <h2 className="text-lg font-semibold text-slate-100">{s.h}</h2>
            {s.blocks.map((b, i) =>
              "p" in b ? (
                <p key={i} className="mt-2 leading-relaxed text-slate-300">{withLinks(b.p)}</p>
              ) : (
                <ul key={i} className="mt-2 grid list-disc gap-1.5 pl-5 leading-relaxed text-slate-300">
                  {b.ul.map((li) => <li key={li}>{withLinks(li)}</li>)}
                </ul>
              ),
            )}
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}
