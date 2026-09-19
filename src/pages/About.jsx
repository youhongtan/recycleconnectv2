import React from "react";
import SectionHeading from "@/components/common/SectionHeading";
import Reveal from "@/components/common/Reveal";
import { Image } from "@/components/ui/image";
import { Target, Sprout, Handshake, Rocket } from "lucide-react";

const GOALS = [
  { icon: Target, title: "Our mission", body: "Connecting People for a Greener Tomorrow — making correct recycling the easiest choice for every Malaysian household." },
  { icon: Sprout, title: "Why it matters", body: "Malaysia generates around 39,000 tonnes of waste daily. Better sorting at home is the single fastest lever we have." },
  { icon: Handshake, title: "Partners", body: "We work alongside councils, school eco-clubs, mall operators, scrap dealers and cooking-oil collectors nationwide." },
  { icon: Rocket, title: "Roadmap", body: "QR-based Eco Points, verified centre data, school leaderboards and a Bahasa Melayu voice assistant." },
];

const TIMELINE = [
  { when: "2026 Q1", what: "Launch AI assistant, centre finder and learning library." },
  { when: "2026 Q2", what: "School bulk-recycling programme and community leaderboards." },
  { when: "2026 Q3", what: "QR Eco Points with voucher partners." },
  { when: "2026 Q4", what: "Nationwide verified centre database and home-collection booking." },
];

export default function About() {
  return (
    <div className="max-w-6xl mx-auto px-6 pb-10">
      <SectionHeading
        eyebrow="About"
        title="A student-built platform for a national problem"
        subtitle="RecycleConnect began as a simple question: why is it so hard to know where our rubbish should go?"
      />

      <Reveal delay={0.1}>
        <Image
          src="https://media.base44.com/images/public/6a67017a886f99eed0748a3d/6db2338b5_generated_7fa5e08a.png"
          alt="Isometric render of a green Malaysian city with recycling hubs"
          className="mt-12 w-full h-72 sm:h-96 orbital soft-shadow"
        />
      </Reveal>

      <div className="mt-16 grid md:grid-cols-2 gap-5">
        {GOALS.map((g, i) => (
          <Reveal key={g.title} delay={(i % 2) * 0.08}>
            <article className="h-full glass orbital soft-shadow p-8">
              <span className="h-12 w-12 rounded-2xl bg-primary/12 grid place-items-center">
                <g.icon className="w-6 h-6 text-primary" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-semibold">{g.title}</h3>
              <p className="mt-3 text-muted-foreground">{g.body}</p>
            </article>
          </Reveal>
        ))}
      </div>

      <section className="mt-24">
        <h2 className="text-3xl font-bold tracking-tight">Future roadmap</h2>
        <div className="mt-8 space-y-4">
          {TIMELINE.map((t, i) => (
            <Reveal key={t.when} delay={i * 0.06}>
              <div className="glass orbital soft-shadow p-6 flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-sm font-semibold text-primary w-28 shrink-0">{t.when}</span>
                <span className="text-muted-foreground">{t.what}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}