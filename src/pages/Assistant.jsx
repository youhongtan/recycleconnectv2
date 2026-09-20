import React from "react";
import SectionHeading from "@/components/common/SectionHeading";
import Reveal from "@/components/common/Reveal";
import ScanPanel from "@/components/assistant/ScanPanel";
import ChatPanel from "@/components/assistant/ChatPanel";
import { useI18n } from "@/lib/i18n";

export default function Assistant() {
  const { t } = useI18n();
  return (
    <div className="max-w-6xl mx-auto px-6 pb-10">
      <SectionHeading
        eyebrow={t("asEyebrow")}
        title={t("asTitle")}
        subtitle={t("asSub")}
      />
      <div className="mt-14 grid lg:grid-cols-2 gap-6 items-start">
        <Reveal><ScanPanel /></Reveal>
        <Reveal delay={0.1}><ChatPanel /></Reveal>
      </div>
    </div>
  );
}