import React from "react";
import Counter from "@/components/common/Counter";
import { useI18n } from "@/lib/i18n";
import { Flame, Recycle, Cloud, Package } from "lucide-react";

export const levelFromXp = (xp) => Math.floor(xp / 500) + 1;

export default function ProfileStats({ profile }) {
  const { t } = useI18n();
  const level = levelFromXp(profile.xp || 0);
  const intoLevel = (profile.xp || 0) % 500;
  const pct = (intoLevel / 500) * 100;

  const cards = [
    { icon: Package, label: t("psItems"), value: profile.items_recycled || 0 },
    { icon: Recycle, label: t("psPlastic"), value: profile.plastic_saved_kg || 0, decimals: 1 },
    { icon: Cloud, label: t("psCo2"), value: profile.co2_reduced_kg || 0, decimals: 1 },
    { icon: Flame, label: t("psStreak"), value: profile.streak_days || 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="glass orbital soft-shadow p-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm uppercase tracking-wider text-muted-foreground">{t("psLevel")}</p>
            <p className="text-5xl font-bold tracking-tight">{t("psLevelN")} {level}</p>
          </div>
          <p className="text-lg font-semibold text-primary">{profile.xp || 0} XP</p>
        </div>
        <div className="mt-6 h-4 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("psProgress")}
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{500 - intoLevel} {t("psXpTo")} {level + 1}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="glass orbital soft-shadow p-6">
            <c.icon className="w-5 h-5 text-primary" aria-hidden="true" />
            <p className="mt-3 text-3xl font-bold tracking-tight">
              <Counter to={c.value} decimals={c.decimals || 0} />
            </p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}