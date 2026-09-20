import React from "react";
import SectionHeading from "@/components/common/SectionHeading";
import Reveal from "@/components/common/Reveal";
import PlasticGrid from "@/components/learn/PlasticGrid";
import TopicGrid from "@/components/learn/TopicGrid";
import { Image } from "@/components/ui/image";
import { useI18n } from "@/lib/i18n";

export default function Learn() {
  const { t } = useI18n();
  return (
    <div className="max-w-6xl mx-auto px-6 pb-10">
      <SectionHeading
        eyebrow={t("learnEyebrow")}
        title={t("learnTitle")}
        subtitle={t("learnSub")}
      />

      <Reveal delay={0.05}>
        <p className="mt-8 mx-auto max-w-3xl text-center text-sm text-muted-foreground rounded-2xl border border-border bg-card px-6 py-4">
          {t("learnNote")}
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <Image
          src="https://media.base44.com/images/public/6a67017a886f99eed0748a3d/0c8a97536_generated_27547b85.png"
          alt="Macro photograph of glass cullet, aluminium pellets and shredded paper arranged artistically"
          className="mt-12 w-full h-64 sm:h-80 orbital soft-shadow"
        />
      </Reveal>

      <PlasticGrid />
      <TopicGrid />
    </div>
  );
}