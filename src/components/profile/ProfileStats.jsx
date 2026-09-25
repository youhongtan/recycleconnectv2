import React, { useEffect, useState } from "react";
import Counter from "@/components/common/Counter";
import { supabase } from "@/api/supabaseClient";
import { MATERIALS, MATERIAL_KEY } from "@/lib/recycleData";
import { useI18n } from "@/lib/i18n";
import { Recycle } from "lucide-react";

export const levelFromXp = (xp) => Math.floor(xp / 500) + 1;

export default function ProfileStats({ profile }) {
  const { t } = useI18n();
  const level = levelFromXp(profile.xp || 0);
  const intoLevel = (profile.xp || 0) % 500;
  const pct = (intoLevel / 500) * 100;
  const [kgByMaterial, setKgByMaterial] = useState({});

  // Per-material lifetime totals from the ledger (1 decimal kg each).
  useEffect(() => {
    if (!profile?.user_id) return;
    (async () => {
      const { data } = await supabase
        .from("recycle_logs")
        .select("material,weight_g")
        .eq("user_id", profile.user_id)
        .limit(5000);
      const sums = {};
      for (const row of data || []) {
        sums[row.material] = (sums[row.material] || 0) + (Number(row.weight_g) || 0);
      }
      const kg = {};
      for (const m of MATERIALS) kg[m] = +((sums[m] || 0) / 1000).toFixed(1);
      setKgByMaterial(kg);
    })();
  }, [profile?.user_id]);

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
        {MATERIALS.map((m) => (
          <div key={m} className="glass orbital soft-shadow p-6">
            <Recycle className="w-5 h-5 text-primary" aria-hidden="true" />
            <p className="mt-3 text-3xl font-bold tracking-tight">
              <Counter to={kgByMaterial[m] || 0} decimals={1} />
            </p>
            <p className="text-sm text-muted-foreground">{t(MATERIAL_KEY[m] || m)} (kg)</p>
          </div>
        ))}
      </div>
    </div>
  );
}