import React from "react";
import Reveal from "@/components/common/Reveal";
import { PLASTIC_TYPES } from "@/lib/recycleData";
import { useI18n } from "@/lib/i18n";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const diffColor = {
  Easy: "bg-primary/12 text-primary",
  Medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  Hard: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

const diffKey = { Easy: "diffEasy", Medium: "diffMedium", Hard: "diffHard" };

export default function PlasticGrid() {
  const { t } = useI18n();
  return (
    <section className="mt-20">
      <h2 className="text-3xl font-bold tracking-tight">{t("plasticT")}</h2>
      <p className="mt-2 text-muted-foreground">{t("plasticSub")}</p>

      <div className="mt-8 grid md:grid-cols-2 gap-5">
        {PLASTIC_TYPES.map((p, i) => (
          <Reveal key={p.code} delay={(i % 2) * 0.08}>
            <div className="glass orbital soft-shadow p-7 h-full hover:-translate-y-1 transition-transform duration-500">
              <div className="flex items-center gap-4">
                <span className="h-12 w-12 rounded-2xl bg-accent/12 grid place-items-center font-bold text-accent text-lg">
                  {p.code}
                </span>
                <div>
                  <h3 className="text-xl font-semibold">{t(`pl${i}Name`)}</h3>
                  <p className="text-sm text-muted-foreground">{t(`pl${i}Rec`)}</p>
                </div>
                <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${diffColor[p.difficulty]}`}>
                  {t(diffKey[p.difficulty] || "diffMedium")}
                </span>
              </div>
              <Accordion type="single" collapsible className="mt-4">
                <AccordionItem value="details" className="border-none">
                  <AccordionTrigger className="text-sm font-semibold py-2">{t("detailsT")}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground space-y-3">
                    <p><strong className="text-foreground">{t("examplesT")}</strong> {t(`pl${i}Ex`)}</p>
                    <p><strong className="text-foreground">{t("howT")}</strong> {t(`pl${i}How`)}</p>
                    <p><strong className="text-foreground">{t("impactT")}</strong> {t(`pl${i}Imp`)}</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}