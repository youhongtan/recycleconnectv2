import React from "react";
import Reveal from "@/components/common/Reveal";
import { LEARN_TOPICS } from "@/lib/recycleData";
import { useI18n } from "@/lib/i18n";
import {
  Newspaper, Wine, Recycle, Smartphone, BatteryCharging, Droplets, Apple,
} from "lucide-react";

const ICONS = { Newspaper, Wine, Recycle, Smartphone, BatteryCharging, Droplets, Apple };

export default function TopicGrid() {
  const { t } = useI18n();
  return (
    <section className="mt-24">
      <h2 className="text-3xl font-bold tracking-tight">{t("beyondT")}</h2>
      <p className="mt-2 text-muted-foreground">{t("beyondSub")}</p>

      <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {LEARN_TOPICS.map((topic, i) => {
          const Icon = ICONS[topic.icon] || Recycle;
          return (
            <Reveal key={topic.title} delay={(i % 3) * 0.08}>
              <article className="h-full glass orbital soft-shadow p-7 hover:-translate-y-1.5 hover:bg-primary/5 transition-all duration-500">
                <span className="h-12 w-12 rounded-2xl bg-primary/12 grid place-items-center">
                  <Icon className="w-6 h-6 text-primary" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-xl font-semibold">{t(`lt${i}Title`)}</h3>
                <p className="text-sm font-medium text-primary mt-1">{t(`lt${i}Rec`)}</p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground list-disc pl-5">
                  {[0, 1, 2].map((k) => <li key={k}>{t(`lt${i}Tip${k}`)}</li>)}
                </ul>
                <p className="mt-4 text-sm border-t border-border/60 pt-4 text-muted-foreground">{t(`lt${i}Imp`)}</p>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}