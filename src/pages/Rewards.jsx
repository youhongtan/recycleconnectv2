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
  Sprout,
} from "lucide-react";

// ---------------------------------------------------------------------------
// RecycleConnect V2 — Eco + Impact redemption.
//
// Redemption is SERVER-AUTHORITATIVE: POST /api/redeem verifies the session,
// checks balance and one-per-reward, deducts, and writes the ledger row.
// The client never touches eco_points directly.
// Prices live in the `rewards` table (see seed_rewards_v2.sql); this fallback
// only covers a DB outage and mirrors those prices.
// ---------------------------------------------------------------------------
const FALLBACK_ECO_REWARDS = [
  { id: "local-sticker", name: "Eco Sticker Pack", description: "Recycled-paper stickers with Malaysian wildlife designs.", eco_points_cost: 5000, category: "Stationery", available: true, reward_kind: "eco", local: true },
  { id: "local-eraser", name: "Reusable Eraser", description: "Long-lasting plastic-free eraser in recycled packaging.", eco_points_cost: 8000, category: "Stationery", available: true, reward_kind: "eco", local: true },
  { id: "local-pencil", name: "Eco Pencil", description: "Bamboo pencil with recycled graphite core. Zero plastic.", eco_points_cost: 10000, category: "Stationery", available: true, reward_kind: "eco", local: true },
  { id: "local-notebook", name: "Recycled Notebook", description: "A5 notebook, 100% post-consumer recycled paper, 80 pages.", eco_points_cost: 15000, category: "Stationery", available: true, reward_kind: "eco", local: true },
  { id: "local-bag", name: "Reusable Shopping Bag (Recycled PET)", description: "Foldable bag sewn from recycled plastic bottles.", eco_points_cost: 25000, category: "Eco Product", available: true, reward_kind: "eco", local: true },
  { id: "local-bottle", name: "Reusable Water Bottle", description: "Steel vacuum-insulated bottle (500ml). Cold 24h / hot 12h.", eco_points_cost: 50000, category: "Eco Product", available: true, reward_kind: "eco", local: true },
  { id: "local-tree1", name: "Plant 1 Tree", description: "One native-tree planting contribution, tracked in your history.", eco_points_cost: 10000, category: "Impact", available: true, reward_kind: "impact", impact_note: "Impact Contribution — tracked in-app. No verified planting partner.", local: true },
  { id: "local-cleanup", name: "Support a Cleanup", description: "RM1 impact contribution towards community cleanups.", eco_points_cost: 5000, category: "Impact", available: true, reward_kind: "impact", impact_note: "Impact Contribution — tracked in-app. No verified donation partner.", local: true },
];

function iconFor(reward) {
  if ((reward.reward_kind || "eco") === "impact") return Sprout;
  const hay = `${reward.category || ""} ${reward.name || ""}`.toLowerCase();
  if (hay.includes("notebook") || hay.includes("paper") || hay.includes("book")) return BookOpen;
  if (hay.includes("bag") || hay.includes("tote") || hay.includes("shopping")) return ShoppingBag;
  if (hay.includes("pencil") || hay.includes("crayon") || hay.includes("stationery") || hay.includes("sticker") || hay.includes("eraser")) return Pencil;
  if (hay.includes("bottle") || hay.includes("straw") || hay.includes("lunch") || hay.includes("cutlery")) return Recycle;
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

  const refresh = async () => {
    try {
      const { data: rewardsData, error: rErr } = await supabase
        .from("rewards")
        .select("*")
        .eq("available", true)
        .order("eco_points_cost", { ascending: true });
      if (rErr) throw rErr;
      const { user: u, profile: p } = await getOrCreateProfile();
      const dbRows = rewardsData || [];
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
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ecoRewards = useMemo(
    () => rewards.filter((r) => (r.reward_kind || "eco") === "eco"),
    [rewards]
  );
  const impactRewards = useMemo(
    () => rewards.filter((r) => r.reward_kind === "impact"),
    [rewards]
  );
  const categories = useMemo(() => {
    const cats = [...new Set(ecoRewards.map((r) => r.category).filter(Boolean))];
    return ["All", ...cats];
  }, [ecoRewards]);
  const visibleEco = useMemo(
    () => (category === "All" ? ecoRewards : ecoRewards.filter((r) => r.category === category)),
    [ecoRewards, category]
  );

  const balance = profile?.eco_points || 0;
  const isRedeemed = (r) => (profile?.redeemed_rewards || []).includes(r.id);

  const redeem = async (reward) => {
    setError("");
    if (!user || !profile) {
      setError(t("rwLoginNeeded"));
      return;
    }
    if (balance < reward.eco_points_cost) return;
    setRedeeming(reward.id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewardId: reward.local ? undefined : reward.id,
          localName: reward.local ? reward.name : undefined,
          localCost: reward.local ? reward.eco_points_cost : undefined,
          localKind: reward.local ? reward.reward_kind : undefined,
          accessToken: session?.access_token,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Redemption failed.");
      setProfile((p) => ({
        ...p,
        eco_points: data.newBalance,
        redeemed_rewards: [...(p?.redeemed_rewards || []), reward.id],
      }));
      setConfirmReward(null);
      setSuccess({ reward, newBalance: data.newBalance });
    } catch (e) {
      setError(e.message === "Not enough Eco Points" ? t("notEnoughBtn") + "." : e.message || t("rwRedeemFail"));
      setConfirmReward(null);
    }
    setRedeeming(null);
  };

  const card = (r) => {
    const redeemed = isRedeemed(r);
    const canAfford = balance >= r.eco_points_cost;
    const Icon = iconFor(r);
    return (
      <div key={r.id} className="glass orbital overflow-hidden flex flex-col">
        <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 grid place-items-center relative">
          <Icon className="w-12 h-12 text-primary" aria-hidden="true" />
          {r.category === "Stationery" && (r.reward_kind || "eco") === "eco" && (
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
          {r.impact_note && (
            <p className="text-xs text-amber-600 mt-2">{r.impact_note}</p>
          )}
          <div className="flex items-center gap-1 mt-3 mb-3">
            <Coins className="w-4 h-4 text-primary" />
            <span className="font-bold">{Number(r.eco_points_cost).toLocaleString()} {t("pointsRequired")}</span>
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
              `${t("redeemBtn")} • ${Number(r.eco_points_cost).toLocaleString()} ${t("ptsUnit")}`
            ) : (
              t("notEnoughBtn")
            )}
          </button>
          {!canAfford && user && !redeemed && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {t("needMoreA")} {(r.eco_points_cost - balance).toLocaleString()} {t("needMoreB")}
            </p>
          )}
        </div>
      </div>
    );
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
          <p className="text-muted-foreground mt-1">{t("rewardsSub")}</p>
        </div>
        <div className="glass orbital px-6 py-4 flex items-center gap-3">
          <Coins className="w-8 h-8 text-primary" />
          <div>
            <p className="text-2xl font-bold" data-testid="eco-balance">
              {Number(balance).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{t("ecoPointsUnit")}</p>
          </div>
        </div>
      </div>

      {!user && (
        <div className="glass orbital p-5 flex flex-wrap items-center gap-3 justify-between">
          <p className="text-sm text-muted-foreground">{t("rwSignIn")}</p>
          <Link
            to="/login"
            className="h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center hover:brightness-110 transition"
          >
            {t("signInBtn")}
          </Link>
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
              <strong>{Number(success.reward.eco_points_cost).toLocaleString()} {t("ecoPointsUnit")}</strong>. {t("rwBalance")}:{" "}
              <strong>{Number(success.newBalance).toLocaleString()}</strong>. {t("rwShowAt")}
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
              {c === "All" ? t("allCat") : c}
            </button>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleEco.map(card)}
      </div>
      {visibleEco.length === 0 && (
        <p className="text-center text-muted-foreground py-10">{t("noRewards")}</p>
      )}

      {impactRewards.length > 0 && (
        <div className="pt-4">
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Sprout className="w-7 h-7 text-primary" /> {t("impactT")}
          </h2>
          <p className="text-muted-foreground mt-1">{t("impactSub")}</p>
          <p className="text-xs text-amber-600 mt-2 max-w-3xl">{t("impactNote")}</p>
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {impactRewards.map(card)}
          </div>
        </div>
      )}

      <Dialog open={!!confirmReward} onOpenChange={(open) => !open && setConfirmReward(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmT")}</DialogTitle>
            <DialogDescription>
              {confirmReward && (
                <>
                  {t("rwYouRedeemed")} {confirmReward.name} {t("rwFor")}{" "}
                  {Number(confirmReward.eco_points_cost).toLocaleString()} {t("ecoPointsUnit")}?
                  <br />
                  {t("ecoPointsUnit")}: {Number(balance).toLocaleString()} • {t("pointsRequired")}:{" "}
                  {Number(confirmReward.eco_points_cost).toLocaleString()} • {t("remAfterT")}:{" "}
                  {Number(balance - confirmReward.eco_points_cost).toLocaleString()}
                </>
              )}
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
              {t("confirmBtn")} • {confirmReward ? Number(confirmReward.eco_points_cost).toLocaleString() : 0} {t("ptsUnit")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
