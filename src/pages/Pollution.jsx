import React from "react";
import SectionHeading from "@/components/common/SectionHeading";
import Reveal from "@/components/common/Reveal";
import Counter from "@/components/common/Counter";
import PollutionCharts from "@/components/pollution/PollutionCharts";
import { POLLUTION_STATS } from "@/lib/recycleData";
import { useI18n } from "@/lib/i18n";
import { Waves, Trash2, Fish, Factory } from "lucide-react";

const ISSUES = [
  { icon: Trash2, titleKey: "isPlasticT", bodyKey: "isPlasticB" },
  { icon: Waves, titleKey: "isOceanT", bodyKey: "isOceanB" },
  { icon: Factory, titleKey: "isLandT", bodyKey: "isLandB" },
  { icon: Fish, titleKey: "isMarineT", bodyKey: "isMarineB" },
];

export default function Pollution() {
  const { t } = useI18n();
  return (
    <div className="max-w-6xl mx-auto px-6 pb-10">
      <SectionHeading
        eyebrow={t("polEyebrow")}
        title={t("polTitle")}
        subtitle={t("polSub")}
      />

      <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {POLLUTION_STATS.map((s, i) => (
          <Reveal key={s.labelKey} delay={i * 0.08}>
            <div className="glass orbital soft-shadow p-6 h-full">
              <p className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">
                <Counter to={s.value} suffix={s.suffix} decimals={s.decimals || 0} />
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{t(s.labelKey)}</p>
              {s.noteKey && <p className="mt-1 text-xs text-muted-foreground/80">{t(s.noteKey)}</p>}
            </div>
          </Reveal>
        ))}
      </div>

      <PollutionCharts />

      <section className="mt-24 grid md:grid-cols-2 gap-5">
        {ISSUES.map((it, i) => (
          <Reveal key={it.titleKey} delay={(i % 2) * 0.08}>
            <article className="h-full glass orbital soft-shadow p-8">
              <span className="h-12 w-12 rounded-2xl bg-accent/12 grid place-items-center">
                <it.icon className="w-6 h-6 text-accent" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-semibold">{t(it.titleKey)}</h3>
              <p className="mt-3 text-muted-foreground">{t(it.bodyKey)}</p>
            </article>
          </Reveal>
        ))}
      </section>
    </div>
  );
}
