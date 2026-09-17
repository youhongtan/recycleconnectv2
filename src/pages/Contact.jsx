import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import SectionHeading from "@/components/common/SectionHeading";
import Reveal from "@/components/common/Reveal";
import { useI18n } from "@/lib/i18n";
import { Send, CheckCircle2 } from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_KEYS = [
  { q: "faq1q", a: "faq1a" },
  { q: "faq2q", a: "faq2a" },
  { q: "faq3q", a: "faq3a" },
  { q: "faq4q", a: "faq4a" },
  { q: "faq5q", a: "faq5a" },
];

export default function Contact() {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error: insertError } = await supabase.from('feedback').insert(form);
      if (insertError) throw insertError;
      fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }).catch(() => {});
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setError(t("ctSendFail"));
    }
    setBusy(false);
  };

  const field = "w-full h-12 px-4 rounded-2xl bg-background border border-border focus:border-primary";

  return (
    <div className="max-w-6xl mx-auto px-6 pb-10">
      <SectionHeading
        eyebrow={t("ctEyebrow")}
        title={t("ctTitle")}
        subtitle={t("ctSub")}
      />

      <div className="mt-14 grid lg:grid-cols-2 gap-6 items-start">
        <Reveal>
          <form onSubmit={submit} className="glass orbital soft-shadow p-8 space-y-5">
            <div>
              <label htmlFor="c-name" className="block text-sm font-semibold mb-2">{t("ctName")}</label>
              <input id="c-name" required className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="c-email" className="block text-sm font-semibold mb-2">{t("ctEmail")}</label>
              <input id="c-email" type="email" required className={field} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label htmlFor="c-subject" className="block text-sm font-semibold mb-2">{t("ctSubject")}</label>
              <input id="c-subject" className={field} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div>
              <label htmlFor="c-msg" className="block text-sm font-semibold mb-2">{t("ctMessage")}</label>
              <textarea id="c-msg" required rows={5} className="w-full p-4 rounded-2xl bg-background border border-border focus:border-primary" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {sent && (
              <p className="text-sm text-primary flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {t("ctSentOk")}
              </p>
            )}
            <button disabled={busy} type="submit" className="h-14 w-full rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60">
              <Send className="w-4 h-4" /> {busy ? t("ctSending") : t("ctSend")}
            </button>
          </form>
        </Reveal>

        <div className="space-y-6">
          <Reveal delay={0.1}>
            <div id="faq" className="glass orbital soft-shadow p-8 scroll-mt-32">
              <h2 className="text-2xl font-semibold">{t("faqTitle")}</h2>
              <Accordion type="single" collapsible className="mt-4">
                {FAQ_KEYS.map((f) => (
                  <AccordionItem key={f.q} value={f.q}>
                    <AccordionTrigger className="text-left">{t(f.q)}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{t(f.a)}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </Reveal>

        </div>
      </div>
    </div>
  );
}
