import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import SectionHeading from "@/components/common/SectionHeading";
import Reveal from "@/components/common/Reveal";
import { Send, CheckCircle2 } from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = [
  { q: "Is RecycleConnect free?", a: "Yes. Every tool — the AI assistant, the centre finder and the learning library — is completely free to use." },
  { q: "Are the recycling centres verified?", a: "Our starter list covers well-known Klang Valley locations. We verify new submissions with councils and operators before publishing." },
  { q: "Can I recycle pizza boxes?", a: "Tear off the clean top and recycle it. The greasy base should go into general waste or your compost bin." },
  { q: "Do you support Bahasa Melayu?", a: "Yes — use the language switch in the navigation bar for English, Bahasa Melayu or Chinese." },
  { q: "How do I add my centre to the map?", a: "Send us the name, address, opening hours and accepted materials through the form on this page." },
];

export default function Contact() {
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
      setError("Sorry, we couldn't send that. Please try again.");
    }
    setBusy(false);
  };

  const field = "w-full h-12 px-4 rounded-2xl bg-background border border-border focus:border-primary";

  return (
    <div className="max-w-6xl mx-auto px-6 pb-10">
      <SectionHeading
        eyebrow="Contact"
        title="Talk to us"
        subtitle="Feedback, centre submissions, school partnerships — we read everything."
      />

      <div className="mt-14 grid lg:grid-cols-2 gap-6 items-start">
        <Reveal>
          <form onSubmit={submit} className="glass orbital soft-shadow p-8 space-y-5">
            <div>
              <label htmlFor="c-name" className="block text-sm font-semibold mb-2">Name</label>
              <input id="c-name" required className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="c-email" className="block text-sm font-semibold mb-2">Email</label>
              <input id="c-email" type="email" required className={field} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label htmlFor="c-subject" className="block text-sm font-semibold mb-2">Subject</label>
              <input id="c-subject" className={field} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div>
              <label htmlFor="c-msg" className="block text-sm font-semibold mb-2">Message</label>
              <textarea id="c-msg" required rows={5} className="w-full p-4 rounded-2xl bg-background border border-border focus:border-primary" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {sent && (
              <p className="text-sm text-primary flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Thank you — your message has been received.
              </p>
            )}
            <button disabled={busy} type="submit" className="h-14 w-full rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60">
              <Send className="w-4 h-4" /> {busy ? "Sending…" : "Send message"}
            </button>
          </form>
        </Reveal>

        <div className="space-y-6">
          <Reveal delay={0.1}>
            <div id="faq" className="glass orbital soft-shadow p-8 scroll-mt-32">
              <h2 className="text-2xl font-semibold">Frequently asked questions</h2>
              <Accordion type="single" collapsible className="mt-4">
                {FAQ.map((f) => (
                  <AccordionItem key={f.q} value={f.q}>
                    <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
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
