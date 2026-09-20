import React, { useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { getLevel } from "@/lib/recycleData";
import { getOrCreateProfile } from "@/lib/ecoProfile";
import { useI18n } from "@/lib/i18n";
import { Trophy, Loader2 } from "lucide-react";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const { t } = useI18n();
  const [profiles, setProfiles] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Only public profiles appear. If the is_public column is missing
      // (migration not run yet), fall back to the unfiltered list.
      let all = null;
      const filtered = await supabase.from('eco_profiles').select('*').eq('is_public', true).limit(100);
      if (filtered.error && /is_public|column/i.test(filtered.error.message || "")) {
        const retry = await supabase.from('eco_profiles').select('*').limit(100);
        all = retry.data;
      } else {
        all = filtered.data;
      }
      all?.sort((a, b) => (b.eco_points || 0) - (a.eco_points || 0));
      setProfiles(all || []);
      const { profile: p } = await getOrCreateProfile();
      setMyProfile(p);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="max-w-3xl mx-auto px-6 py-20 flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> {t("loadingDots")}</div>;

  const myRank = profiles.findIndex((p) => p.id === myProfile?.id) + 1;

  return (
    <div className="max-w-3xl mx-auto px-6 pb-10 space-y-6">
      <div className="text-center">
        <Trophy className="w-12 h-12 mx-auto text-amber-500 mb-2" />
        <h1 className="text-4xl font-bold">{t("lbTitle")}</h1>
        <p className="text-muted-foreground mt-1">{t("lbSub")}</p>
      </div>
      {myProfile && (
        <div className="glass orbital p-4 flex items-center gap-4">
          <span className="text-2xl font-bold text-primary w-12 text-center">#{myRank}</span>
          <div className="flex-1">
            <p className="font-semibold">{myProfile.display_name || t("lbYou")}</p>
            <p className="text-sm text-muted-foreground">{t("lbLevel")} {getLevel(myProfile.xp)}</p>
          </div>
          <span className="font-bold text-primary">{myProfile.eco_points || 0} {t("ptsUnit")}</span>
        </div>
      )}
      <div className="space-y-2">
        {profiles.map((p, i) => (
          <div key={p.id} className={`glass orbital p-4 flex items-center gap-4 ${p.id === myProfile?.id ? "ring-2 ring-primary" : ""}`}>
            <span className="text-xl font-bold w-12 text-center">{MEDALS[i] || `#${i + 1}`}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{p.display_name || t("lbHero")}</p>
              <p className="text-sm text-muted-foreground">{t("lbLevel")} {getLevel(p.xp)} • {p.items_recycled || 0} {t("lbItems")}</p>
            </div>
            <span className="font-bold text-primary whitespace-nowrap">{p.eco_points || 0} {t("ptsUnit")}</span>
          </div>
        ))}
      </div>
      {profiles.length === 0 && <p className="text-center text-muted-foreground py-20">{t("lbEmpty")}</p>}
    </div>
  );
}
