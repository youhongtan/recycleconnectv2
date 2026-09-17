import React from "react";
import { Link } from "react-router-dom";
import { ScanLine, Map, Wand2, ArrowUpRight } from "lucide-react";
import Reveal from "@/components/common/Reveal";
import SectionHeading from "@/components/common/SectionHeading";
import { useI18n } from "@/lib/i18n";

const FEATURES = [
  {
    icon: ScanLine,
    titleKey: "featScanTitle",
    bodyKey: "featScanBody",
    ctaKey: "featScanCta",
    to: "/assistant",
  },
  {
    icon: Map,
    titleKey: "featMapTitle",
    bodyKey: "featMapBody",
    ctaKey: "featMapCta",
    to: "/finder",
  },
  {
    icon: Wand2,
    titleKey: "featMatchTitle",
    bodyKey: "featMatchBody",
    ctaKey: "featMatchCta",
    to: "/finder#recommend",
  },
];

export default function FeatureCards() {
  const { t } = useI18n();
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <SectionHeading
        eyebrow={t("featuresEyebrow")}
        title={t("featuresTitle")}
        subtitle={t("featuresSubtitle")}
      />
      <div className="mt-14 grid md:grid-cols-3 gap-6">
        {FEATURES.map((f, i) => (
          <Reveal key={f.to} delay={i * 0.1}>
            <Link
              to={f.to}
              className="group block h-full glass orbital soft-shadow p-8 hover:-translate-y-1.5 hover:bg-primary/5 transition-all duration-500"
            >
              <span className="h-14 w-14 rounded-2xl bg-primary/12 grid place-items-center">
                <f.icon className="w-7 h-7 text-primary" aria-hidden="true" />
              </span>
              <h3 className="mt-6 text-2xl font-semibold tracking-tight">{t(f.titleKey)}</h3>
              <p className="mt-3 text-muted-foreground">{t(f.bodyKey)}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 font-semibold text-primary">
                {t(f.ctaKey)}
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}