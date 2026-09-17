import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { getOrCreateProfile } from "@/lib/ecoProfile";
import { useI18n } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Coins,
  Gift,
  Check,
  CheckCircle2,
  Loader2,
  BookOpen,
  ShoppingBag,
  Leaf,
  Pencil,
  Recycle,
  Sparkles,
} from "lucide-react";

// ---------------------------------------------------------------------------
// RecycleConnect V2 — Eco-friendly reward redemption.
//
// MODIFIES the existing rewards system (same `rewards` table + `eco_profiles`
// Eco Points deduction). Adds school/useful sustainable items and a polished
// confirm → deduct → confirmation flow. DB rows win; this fallback only
// guarantees the requested eco school items exist even before the V2 seed is
// applied.
// ---------------------------------------------------------------------------
const FALLBACK_ECO_REWARDS = [
  {
    id: "local-recycled-paper",
    name: "Eco-Friendly Recycled Paper (A4, 100 sheets)",
    description:
      "A4 printing paper made from 100% post-consumer recycled fibre. Great for classrooms and homework.",
    eco_points_cost: 70,
    category: "Stationery",
    available: true,
    local: true,
  },
  {
    id: "local-recycled-notebook",
    name: "Recycled Notebook (A5, 80 pages)",
    description:
      "A5 notebook with kraft cover made from 100% recycled paper. Perfect for school notes.",
    eco_points_cost: 80,
    category: "Stationery",
    available: true,
    local: true,
  },
  {
    id: "local-reusable-bag",
    name: "Reusable Shopping Bag (Recycled PET)",
    description:
      "Strong foldable shopping bag sewn from recycled plastic bottles. Replaces hundreds of single-use bags.",
    eco_points_cost: 150,
    category: "Eco Product",
    available: true,
    local: true,
  },
  {
    id: "local-bamboo-pencils",
    name: "Bamboo Pencil Set (6pcs)",
    description:
      "Sustainably grown bamboo pencils with recycled graphite cores. A classroom essential without plastic.",
    eco_points_cost: 90,
    category: "Stationery",
    available: true,
    local: true,
  },
  {
    id: "local-recycled-crayons",
    name: "Recycled Crayon Pack",
    description:
      "Chunky crayons remoulded from recycled wax. Easy grip for young learners, zero new plastic.",
    eco_points_cost: 110,
    category: "Stationery",
    available: true,
    local: true,
  },
  {
    id: "local-steel-bottle",
    name: "Reusable Steel Water Bottle (500ml)",
    description:
      "Vacuum-insulated stainless steel bottle. Keeps drinks cold 24h — bring it to school every day.",
    eco_points_cost: 350,
    category: "Eco Product",
    available: true,
    local: true,
  },
];

function iconFor(reward) {
  const hay = `${reward.category || ""} ${reward.name || ""}`.toLowerCase();
  if (hay.includes("notebook") || hay.includes("paper") || hay.includes("book")) return BookOpen;
  if (hay.includes("bag") || hay.includes("tote") || hay.includes("shopping")) return ShoppingBag;
  if (hay.includes("pencil") || hay.includes("crayon") || hay.includes("stationery")) return Pencil;
  if (hay.includes("bottle") || hay.includes("straw") || hay.includes("lunch")) return Recycle;
  if (hay.includes("seed") || hay.includes("tree") || hay.includes("plant")) return Leaf;
  return Gift;
}

export default function Rewards() {
  const { t } = useI18n();
  const [rewards, setRewards] = useState([]);
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);
  const [confirmReward, setConfirmReward] = useState(null);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    (async () => {
      try {
        const { data: rewardsData } = await supabase
          .from("rewards")
          .select("*")
          .eq("available", true);
        const { user: u, profile: p } = await getOrCreateProfile();
        const dbRows = rewardsData || [];
        // Merge: DB rows win by name; fallback fills the eco school items.
        const dbNames = new Set(dbRows.map((r) => (r.name || "").toLowerCase()));
        const merged = [
          ...dbRows,
          ...FALLBACK_ECO_REWARDS.filter((f) => !dbNames.has(f.name.toLowerCase())),
        ].sort((a, b) => (a.eco_points_cost || 0) - (b.eco_points_cost || 0));
        setRewards(merged);
        setUser(u);
        setProfile(p);
      } catch {
        setRewards([...FALLBACK_ECO_REWARDS]);
        setError(t("rwError"));
      }
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(rewards.map((r) => r.category).filter(Boolean))];
    return ["All", ...cats];
  }, [rewards]);

  const visible = useMemo(
    () => (category === "All" ? rewards : rewards.filter((r) => r.category === category)),
    [rewards, category]
  );
  const catLabel = (c) => (c === "All" ? t("allCat") : c);

  const balance = profile?.eco_points || 0;

  const redeem = async (reward) => {
    setError("");
    if (!user || !profile) {
      setError(t("rwLoginNeeded"));
      return;
    }
    if (balance < reward.eco_points_cost) return;
    setRedeeming(reward.id);
    try {
      const redeemed = new Set(profile.redeemed_rewards || []);
      redeemed.add(reward.id);
      const newBalance = balance - reward.eco_points_cost;
      // Local-only fallback rows have no DB id — still deduct points locally.
      if (reward.local) {
        const { data: updated, error: updateError } = await supabase
          .from("eco_profiles")
          .update({ eco_points: newBalance, redeemed_rewards: [...redeemed] })
          .eq("id", profile.id)
          .select()
          .single();
        if (updateError) throw updateError;
        setProfile(updated || { ...profile, eco_points: newBalance, redeemed_rewards: [...redeemed] });
      } else {
        const { data: updated, error: updateError } = await supabase
          .from("eco_profiles")
          .update({ eco_points: newBalance, redeemed_rewards: [...redeemed] })
          .eq("id", profile.id)
          .select()
          .single();
        if (updateError) throw updateError;
        setProfile(updated);
      }
      setConfirmReward(null);
      setSuccess({ reward, newBalance });
    } catch {
      setError(t("rwRedeemFail"));
    }
    setRedeeming(null);
  };

  if (loading)
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> {t("loadingDots")}
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto px-6 pb-10 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold">{t("rewardsTitle")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("rewardsSub")}
          </p>
        </div>
        <div className="glass orbital px-6 py-4 flex items-center gap-3">
          <Coins className="w-8 h-8 text-primary" />
          <div>
            <p className="text-2xl font-bold" data-testid="eco-balance">
              {balance}
            </p>
            <p className="text-xs text-muted-foreground">{t("ecoPointsUnit")}</p>
          </div>
        </div>
      </div>

      {!user && (
        <div className="glass orbital p-5 flex flex-wrap items-center gap-3 justify-between">
          <p className="text-sm text-muted-foreground">
            {t("rwSignIn")}
          </p>
          <Link
            to="/login"
            className="h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center hover:brightness-110 transition"
          >
            {t("signInBtn")}
          </Link>
        </div>
      )}

      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter rewards by category">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`h-10 px-4 rounded-full text-sm font-semibold transition ${
                category === c
                  ? "bg-primary text-primary-foreground"
                  : "glass hover:bg-primary/10"
              }`}
            >
              {catLabel(c)}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive glass orbital p-4">
          {error}
        </p>
      )}

      {success && (
        <div
          role="status"
          className="glass orbital p-6 flex flex-col sm:flex-row sm:items-center gap-4 border-primary/40"
        >
          <span className="h-12 w-12 rounded-2xl bg-primary/12 grid place-items-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-primary" />
          </span>
          <div className="flex-1">
            <p className="font-bold text-lg">{t("redeemSuccessT")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("rwYouRedeemed")} <strong>{success.reward.name}</strong> {t("rwFor")}{" "}
              <strong>{success.reward.eco_points_cost} {t("ecoPointsUnit")}</strong>. {t("rwBalance")}:{" "}
              <strong>{success.newBalance}</strong>. {t("rwShowAt")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="h-10 px-5 rounded-full glass text-sm font-semibold hover:bg-primary/10 transition shrink-0"
          >
            {t("dismissBtn")}
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((r) => {
          const redeemed = (profile?.redeemed_rewards || []).includes(r.id);
          const canAfford = balance >= r.eco_points_cost;
          const Icon = iconFor(r);
          return (
            <div key={r.id} className="glass orbital overflow-hidden flex flex-col">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 grid place-items-center relative">
                <Icon className="w-12 h-12 text-primary" aria-hidden="true" />
                {r.category === "Stationery" && (
                  <span className="absolute top-3 left-3 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-background/80 text-primary inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {t("schoolPick")}
                  </span>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
                  {r.category}
                </span>
                <h3 className="font-bold text-lg">{r.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 flex-1">{r.description}</p>
                <div className="flex items-center gap-1 mt-3 mb-3">
                  <Coins className="w-4 h-4 text-primary" />
                  <span className="font-bold">{r.eco_points_cost} {t("pointsRequired")}</span>
                </div>
                <button
                  disabled={redeemed || !canAfford || redeeming === r.id || !user}
                  onClick={() => setConfirmReward(r)}
                  title={
                    !user
                      ? t("signInToRedeem")
                      : redeemed
                        ? t("redeemedBtn")
                        : canAfford
                          ? `${t("redeemBtn")} ${r.eco_points_cost} ${t("ptsUnit")}`
                          : t("notEnoughBtn")
                  }
                  className={`w-full h-11 rounded-full font-semibold transition ${
                    redeemed
                      ? "bg-muted text-muted-foreground"
                      : canAfford && user
                        ? "bg-primary text-primary-foreground hover:brightness-110"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {redeemed ? (
                    <span className="inline-flex items-center gap-1">
                      <Check className="w-4 h-4" /> {t("redeemedBtn")}
                    </span>
                  ) : redeeming === r.id ? (
                    t("processingBtn")
                  ) : !user ? (
                    t("signInToRedeem")
                  ) : canAfford ? (
                    `${t("redeemBtn")} • ${r.eco_points_cost} ${t("ptsUnit")}`
                  ) : (
                    t("notEnoughBtn")
                  )}
                </button>
                {!canAfford && user && !redeemed && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {t("needMoreA")} {r.eco_points_cost - balance} {t("needMoreB")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {visible.length === 0 && (
        <p className="text-center text-muted-foreground py-20">
          {t("noRewards")}
        </p>
      )}

      <Dialog open={!!confirmReward} onOpenChange={(open) => !open && setConfirmReward(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmT")}</DialogTitle>
            <DialogDescription>
              {confirmReward &&
                `${t("rwYouRedeemed")} ${confirmReward.name} ${t("rwFor")} ${confirmReward.eco_points_cost} ${t("ecoPointsUnit")}? ${t("rwBalance")}: ${balance - confirmReward.eco_points_cost}.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmReward(null)}
              className="h-11 px-5 rounded-full glass font-semibold hover:bg-primary/10 transition"
            >
              {t("cancelBtn")}
            </button>
            <button
              type="button"
              disabled={redeeming === confirmReward?.id}
              onClick={() => confirmReward && redeem(confirmReward)}
              className="h-11 px-6 rounded-full bg-primary text-primary-foreground font-semibold hover:brightness-110 transition disabled:opacity-60 inline-flex items-center gap-2"
            >
              {redeeming === confirmReward?.id && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("confirmBtn")} • {confirmReward?.eco_points_cost} {t("ptsUnit")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
