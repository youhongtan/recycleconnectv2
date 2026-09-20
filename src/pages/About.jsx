import React from "react";
import SectionHeading from "@/components/common/SectionHeading";
import Reveal from "@/components/common/Reveal";
import { Image } from "@/components/ui/image";
import { Target, Sprout, Handshake, Rocket } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const GOALS = [
  { icon: Target, titleKey: "abT0", bodyKey: "abB0" },
  { icon: Sprout, titleKey: "abT1", bodyKey: "abB1" },
  { icon: Handshake, titleKey: "abT2", bodyKey: "abB2" },
  { icon: Rocket, titleKey: "abT3", bodyKey: "abB3" },
];

const TIMELINE = [
  { when: "2026 Q1", whatKey: "abTl0" },
  { when: "2026 Q2", whatKey: "abTl1" },
  { when: "2026 Q3", whatKey: "abTl2" },
  { when: "2026 Q4", whatKey: "abTl3" },
];

export default function About() {
  const { t } = useI18n();
  return (
    <div className="max-w-6xl mx-auto px-6 pb-10">
      <SectionHeading
        eyebrow={t("abEyebrow")}
        title={t("abTitle")}
        subtitle={t("abSub")}
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
          <Reveal key={g.titleKey} delay={(i % 2) * 0.08}>
            <article className="h-full glass orbital soft-shadow p-8">
              <span className="h-12 w-12 rounded-2xl bg-primary/12 grid place-items-center">
                <g.icon className="w-6 h-6 text-primary" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-semibold">{t(g.titleKey)}</h3>
              <p className="mt-3 text-muted-foreground">{t(g.bodyKey)}</p>
            </article>
          </Reveal>
        ))}
      </div>

      <section className="mt-24">
        <h2 className="text-3xl font-bold tracking-tight">{t("abRoadmap")}</h2>
        <div className="mt-8 space-y-4">
          {TIMELINE.map((t2, i) => (
            <Reveal key={t2.when} delay={i * 0.06}>
              <div className="glass orbital soft-shadow p-6 flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-sm font-semibold text-primary w-28 shrink-0">{t2.when}</span>
                <span className="text-muted-foreground">{t(t2.whatKey)}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}