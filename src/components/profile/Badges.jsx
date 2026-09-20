import React from "react";
import { Award, Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const ALL_BADGES = [
  { name: "First Drop", nameKey: "bgN0", needKey: "bgD0" },
  { name: "Plastic Buster", nameKey: "bgN1", needKey: "bgD1" },
  { name: "E-Waste Hero", nameKey: "bgN2", needKey: "bgD2" },
  { name: "Oil Saver", nameKey: "bgN3", needKey: "bgD3" },
  { name: "7-Day Streak", nameKey: "bgN4", needKey: "bgD4" },
  { name: "Community Champion", nameKey: "bgN5", needKey: "bgD5" },
];

export default function Badges({ earned = [] }) {
  const { t } = useI18n();
  return (
    <div className="glass orbital soft-shadow p-8">
      <h2 className="text-2xl font-semibold">{t("bgTitle")}</h2>
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ALL_BADGES.map((b) => {
          const has = earned.includes(b.name);
          return (
            <div
              key={b.name}
              className={`rounded-3xl p-5 border transition ${
                has ? "border-primary/40 bg-primary/8" : "border-border/60 opacity-70"
              }`}
            >
              {has ? <Award className="w-6 h-6 text-primary" /> : <Lock className="w-6 h-6 text-muted-foreground" />}
              <p className="mt-3 font-semibold">{t(b.nameKey)}</p>
              <p className="text-sm text-muted-foreground">{t(b.needKey)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}