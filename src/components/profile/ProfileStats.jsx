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
  const [gByMaterial, setGByMaterial] = useState({});

  // Per-material lifetime totals in GRAMS, straight from the ledger weights.
  // Waits for the auth session first: on some loads this query fired before
  // the login token was restored, RLS then returned zero rows, and the cards
  // stuck at 0. Transient failures are retried so a cold start can't stick.
  useEffect(() => {
    if (!profile?.user_id) return;
    let cancelled = false;
    const load = async () => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const { data, error } = await supabase
          .from("recycle_logs")
          .select("material,weight_g")
          .eq("user_id", profile.user_id)
          .limit(5000);
        console.log("stats query:", JSON.stringify({ attempt, uid: profile.user_id, rows: data ? data.length : -1, err: error ? error.message : null }));
        if (cancelled) return;
        if (!error && data && data.length > 0) {
          const sums = {};
          for (const row of data) {
            sums[row.material] = (sums[row.material] || 0) + (Number(row.weight_g) || 0);
          }
          const g = {};
          for (const m of MATERIALS) g[m] = Math.round(sums[m] || 0);
          setGByMaterial(g);
          return;
        }
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    };
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) { load(); return; }
      let started = false;
      const start = () => { if (!started && !cancelled) { started = true; load(); } };
      const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
        if (sess) { try { sub.subscription.unsubscribe(); } catch (e) { void e; } start(); }
      });
      setTimeout(() => { try { sub.subscription.unsubscribe(); } catch (e) { void e; } start(); }, 4000);
    })();
    return () => { cancelled = true; };
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
              <Counter to={gByMaterial[m] || 0} decimals={0} />
            </p>
            <p className="text-sm text-muted-foreground">{t(MATERIAL_KEY[m] || m)} (g)</p>
          </div>
        ))}
      </div>
    </div>
  );
}