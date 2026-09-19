import React from "react";
import { Link } from "react-router-dom";
import SectionHeading from "@/components/common/SectionHeading";
import Reveal from "@/components/common/Reveal";
import { WEIGHT_BONUS_TIERS, quoteSubmission } from "@/lib/ecoConfig";
import { useI18n } from "@/lib/i18n";
import { Trophy, ArrowRight } from "lucide-react";

// ---------------------------------------------------------------------------
// "Challenges" is a WEIGHT MILESTONES information page only.
// No daily/weekly challenges, missions, XP, badges, completion tracking,
// database logic or reward mechanics live here — it simply presents the
// existing Weight Bonus tiers from src/lib/ecoConfig.js. Milestone rows and
// examples are COMPUTED from that config, so they can never disagree with
// the actual points calculation.
// ---------------------------------------------------------------------------

const EXAMPLES = [
  { material: "Plastic", grams: 1000 },
  { material: "Plastic", grams: 10000 },
];

export default function Challenges() {
  const { t } = useI18n();

  return (
    <div className="max-w-5xl mx-auto px-6 pb-10 space-y-8">
      <SectionHeading
        eyebrow={t("chEyebrow")}
        title={t("chTitle")}
        subtitle={t("chSub")}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {WEIGHT_BONUS_TIERS.map(([minG, pts], i) => (
          <Reveal key={minG} delay={i * 0.06}>
            <div className="panel-solid orbital soft-shadow p-6 h-full text-center flex flex-col items-center justify-center gap-1 hover:-translate-y-1 transition-transform duration-500">
              <Trophy className="w-6 h-6 text-primary mb-2" aria-hidden="true" />
              <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                {minG.toLocaleString()}g+
              </p>
              <p className="text-lg font-bold text-primary">
                +{pts.toLocaleString()} {t("ecoPointsUnit")}
              </p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.05}>
        <p className="text-center text-sm font-semibold text-muted-foreground max-w-2xl mx-auto">
          {t("chHighest")}
        </p>
      </Reveal>

      <div className="grid md:grid-cols-2 gap-4">
        {EXAMPLES.map((ex, i) => {
          const q = quoteSubmission([{ material: ex.material, grams: ex.grams }]);
          return (
            <Reveal key={ex.grams} delay={i * 0.08}>
              <div className="panel-solid orbital soft-shadow p-6 sm:p-8">
                <h2 className="text-xl font-bold">
                  {ex.grams.toLocaleString()}g {ex.material}
                </h2>
                <div className="mt-4 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("ciBase")}</span>
                    <span className="font-bold">+{q.baseCredited.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("ciBonus")}</span>
                    <span className="font-bold">+{q.bonus.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="font-semibold">{t("ciTotal")}</span>
                    <span className="text-xl font-bold text-primary">
                      +{q.totalCredited.toLocaleString()} {t("ecoPointsUnit")}
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.1}>
        <div className="text-center">
          <Link
            to="/check-in"
            className="inline-flex h-14 px-8 rounded-full bg-primary text-primary-foreground font-semibold items-center gap-2 soft-shadow hover:brightness-110 active:scale-[0.98] transition"
          >
            {t("chCta")} <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
