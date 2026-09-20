import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SectionHeading from "@/components/common/SectionHeading";
import Reveal from "@/components/common/Reveal";
import { WEIGHT_BONUS_TIERS, MEDAL_TIERS, quoteSubmission, medalFor } from "@/lib/ecoConfig";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useI18n } from "@/lib/i18n";
import { Trophy, ArrowRight, Medal, Check } from "lucide-react";

// ---------------------------------------------------------------------------
// "Challenges" = information + medal progress. NO old mechanics: no daily or
// weekly challenges, missions, XP, badges, completion tracking or challenge
// tables. Milestones render from WEIGHT_BONUS_TIERS; medal thresholds from
// MEDAL_TIERS; examples are computed. Trophy claims go through /api/redeem,
// which enforces qualification + first-come stock server-side.
// ---------------------------------------------------------------------------

const MEDAL_STYLE = {
  bronze: "from-amber-700/20 to-amber-900/10 text-amber-700 dark:text-amber-400",
  silver: "from-slate-400/20 to-slate-600/10 text-slate-600 dark:text-slate-300",
  gold: "from-yellow-500/25 to-amber-600/10 text-yellow-600 dark:text-yellow-400",
};

const MEDAL_KEY = { bronze: "tierBronze", silver: "tierSilver", gold: "tierGold" };

const EXAMPLES = [
  { material: "Plastic", grams: 1000 },
  { material: "Plastic", grams: 10000 },
];

export default function Challenges() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [best, setBest] = useState(0);
  const [trophies, setTrophies] = useState([]);
  const [redeemedIds, setRedeemedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);
  const [claimMsg, setClaimMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("rewards")
        .select("*")
        .eq("available", true)
        .not("tier_min_grams", "is", null)
        .order("tier_min_grams", { ascending: true });
      setTrophies(rows || []);
      if (user) {
        const { data: logs } = await supabase
          .from("recycle_logs")
          .select("id,client_submission_id,weight_g")
          .eq("user_id", user.id)
          .limit(2000);
        const sums = {};
        for (const row of logs || []) {
          const key = row.client_submission_id || row.id;
          sums[key] = (sums[key] || 0) + (Number(row.weight_g) || 0);
        }
        setBest(Math.round(Math.max(0, ...Object.values(sums))));
        const { data: prof } = await supabase
          .from("eco_profiles")
          .select("redeemed_rewards")
          .eq("user_id", user.id)
          .maybeSingle();
        setRedeemedIds(prof?.redeemed_rewards || []);
      }
      setLoading(false);
    })();
  }, [user]);

  const reached = medalFor(best);

  const claim = async (trophy) => {
    setClaiming(trophy.id);
    setClaimMsg("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId: trophy.id, accessToken: session?.access_token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Claim failed.");
      setRedeemedIds((ids) => [...ids, trophy.id]);
      setTrophies((ts) =>
        ts.map((x) =>
          x.id === trophy.id ? { ...x, stock_left: 1, holder_name: data.holder || x.holder_name } : x
        )
      );
      setClaimMsg(`${trophy.name} — ${t("tierClaimed")}!`);
    } catch (e) {
      setClaimMsg(e.message);
    }
    setClaiming(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 pb-10 space-y-12">
      <SectionHeading
        eyebrow={t("chEyebrow")}
        title={t("chTitle")}
        subtitle={t("chSub")}
      />

      {/* Weight bonus milestones (computed from config) */}
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

      {/* Medal tiers + personal progress */}
      <section>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Medal className="w-6 h-6 text-primary" /> {t("tierT")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("tierSub")}</p>
        {!user ? (
          <p className="mt-4 text-sm text-muted-foreground">
            <Link to="/login" className="text-primary font-semibold hover:underline">
              {t("signInBtn")}
            </Link>{" "}
            {t("tierToTrack")}
          </p>
        ) : (
          <p className="mt-4 text-sm">
            <strong>{t("tierBest")}: {best.toLocaleString()}g</strong>
            {reached && (
              <span className="ml-2 px-2.5 py-1 rounded-full bg-primary/12 text-primary text-xs font-bold">
                {t(MEDAL_KEY[reached.key])}
              </span>
            )}
          </p>
        )}
        <div className="mt-4 grid md:grid-cols-3 gap-4">
          {MEDAL_TIERS.map((tier, i) => {
            const pct = user ? Math.min(100, Math.round((best / tier.minGrams) * 100)) : 0;
            const done = user && best >= tier.minGrams;
            return (
              <Reveal key={tier.key} delay={i * 0.07}>
                <div className={`panel-solid orbital soft-shadow p-6 bg-gradient-to-b ${MEDAL_STYLE[tier.key]}`}>
                  <p className="text-xl font-bold">
                    {t(MEDAL_KEY[tier.key])} • {tier.minGrams.toLocaleString()}g
                  </p>
                  <div className="mt-4 h-3 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-1000"
                      style={{ width: `${pct}%` }}
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${t(MEDAL_KEY[tier.key])} ${pct}%`}
                    />
                  </div>
                  <p className="mt-2 text-sm font-semibold">
                    {done ? (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Check className="w-4 h-4" /> {best.toLocaleString()}g
                      </span>
                    ) : (
                      <>{user ? `${best.toLocaleString()}g / ${tier.minGrams.toLocaleString()}g` : `${t("tierNext")}: ${tier.minGrams.toLocaleString()}g`}</>
                    )}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Tier trophies: 1 unit each, first come first served */}
      {trophies.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" /> {t("tierTrophyT")}
          </h2>
          {claimMsg && <p role="status" className="mt-2 text-sm font-semibold text-primary">{claimMsg}</p>}
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trophies.map((tr) => {
              const claimed = redeemedIds.includes(tr.id);
              const qualified = user && best >= (tr.tier_min_grams || 0);
              const available = (tr.stock_left ?? 1) > 0;
              return (
                <div key={tr.id} className="panel-solid orbital soft-shadow p-6 flex flex-col">
                  <p className="text-xs font-bold uppercase tracking-wide text-primary">
                    {tr.tier_min_grams ? `${Number(tr.tier_min_grams).toLocaleString()}g` : ""} • {t("tierTrophyT")}
                  </p>
                  <h3 className="mt-1 font-bold text-lg">{tr.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 flex-1">{tr.description}</p>
                  <p className="mt-3 text-sm font-semibold">
                    {available ? (
                      <span className="text-primary">{t("tierAvailable")}</span>
                    ) : (
                      <span className="text-muted-foreground">
                        {t("tierHeldBy")}: {tr.holder_name || "—"}
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    disabled={!user || claimed || !qualified || !available || claiming === tr.id}
                    onClick={() => claim(tr)}
                    title={
                      !user ? t("signInToRedeem")
                      : claimed ? t("tierClaimed")
                      : !qualified ? `${t("tierReachA")} ${Number(tr.tier_min_grams).toLocaleString()}g ${t("tierReachB")}`
                      : !available ? `${t("tierHeldBy")}: ${tr.holder_name || "—"}`
                      : t("tierClaim")
                    }
                    className={`mt-3 w-full h-11 rounded-full font-semibold transition ${
                      claimed || !qualified || !available || !user
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground hover:brightness-110"
                    }`}
                  >
                    {claimed ? t("tierClaimed") : claiming === tr.id ? t("processingBtn") : !user ? t("signInToRedeem") : t("tierClaim")}
                  </button>
                  {!qualified && user && !claimed && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      {t("tierReachA")} {Number(tr.tier_min_grams).toLocaleString()}g {t("tierReachB")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Worked examples (computed) */}
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
