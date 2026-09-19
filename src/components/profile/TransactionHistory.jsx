import React, { useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useI18n } from "@/lib/i18n";
import { History } from "lucide-react";

const TYPE_KEY = {
  recycle_base: "txBase",
  weight_bonus: "txBonus",
  reward_redemption: "txReward",
  impact_redemption: "txImpact",
};

export default function TransactionHistory({ limit = 50 }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("eco_point_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      setTxs(data || []);
      setLoading(false);
    })();
  }, [user, limit]);

  if (!user || loading) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <History className="w-6 h-6 text-primary" /> {t("txT")}
      </h2>
      {txs.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("txEmpty")}</p>
      ) : (
        <div className="mt-4 panel-solid orbital soft-shadow divide-y divide-border overflow-hidden">
          {txs.map((tx) => {
            const amt = Number(tx.amount) || 0;
            const positive = amt >= 0;
            return (
              <div key={tx.id} className="p-4 flex items-start gap-3">
                <span
                  className={`font-bold shrink-0 ${positive ? "text-primary" : "text-destructive"}`}
                >
                  {positive ? "+" : ""}
                  {amt.toLocaleString()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {t(TYPE_KEY[tx.type] || "txBase")}
                  </p>
                  <p className="text-sm text-muted-foreground break-words">{tx.reason}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tx.created_at ? new Date(tx.created_at).toLocaleString() : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
