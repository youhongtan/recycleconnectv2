import React from "react";
import { Link } from "react-router-dom";
import { Trophy, Target, Gift } from "lucide-react";
import Reveal from "@/components/common/Reveal";
import SectionHeading from "@/components/common/SectionHeading";
import { useI18n } from "@/lib/i18n";

const ITEMS = [
  { icon: Target, titleKey: "gamBonusTitle", bodyKey: "gamBonusBody" },
  { icon: Trophy, titleKey: "gamLbTitle", bodyKey: "gamLbBody" },
  { icon: Gift, titleKey: "gamRwTitle", bodyKey: "gamRwBody" },
];

export default function GamificationTeaser() {
  const { t } = useI18n();
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <SectionHeading
        eyebrow={t("gamEyebrow")}
        title={t("gamTitle")}
        subtitle={t("gamSubtitle")}
      />
      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {ITEMS.map((it, i) => (
          <Reveal key={it.titleKey} delay={i * 0.08}>
            <div className="h-full glass orbital soft-shadow p-7 hover:-translate-y-1 transition-transform duration-500">
              <it.icon className="w-6 h-6 text-accent" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold">{t(it.titleKey)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(it.bodyKey)}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delay={0.1}>
        <div className="mt-10 text-center">
          <Link
            to="/profile"
            className="inline-flex h-14 px-8 rounded-full bg-primary text-primary-foreground font-semibold items-center soft-shadow hover:brightness-110 active:scale-[0.98] transition"
          >
            {t("gamCta")}
          </Link>
        </div>
      </Reveal>
    </section>
  );
}