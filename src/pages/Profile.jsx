import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getOrCreateProfile } from "@/lib/ecoProfile";
import { useI18n } from "@/lib/i18n";
import SectionHeading from "@/components/common/SectionHeading";
import Reveal from "@/components/common/Reveal";
import ProfileStats from "@/components/profile/ProfileStats";
import Badges from "@/components/profile/Badges";
import TransactionHistory from "@/components/profile/TransactionHistory";
import BulkMyRequests from "@/components/bulk/BulkMyRequests";

import { Loader2, Coins } from "lucide-react";
import { Link } from "react-router-dom";

export default function Profile() {
  const { t } = useI18n();
  const { isAuthenticated, navigateToLogin } = useAuth();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { user: u, profile: p } = await getOrCreateProfile();
      setUser(u);
      setProfile(p);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-20 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> {t("loadingDots")}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-6 pb-10 text-center">
        <SectionHeading
          eyebrow="Profile"
          title={t("pfTrackT")}
          subtitle={t("pfTrackS")}
        />
        <button
          onClick={navigateToLogin}
          className="mt-10 h-14 px-8 rounded-full bg-primary text-primary-foreground font-semibold soft-shadow hover:brightness-110 active:scale-[0.98] transition"
        >
          {t("pfSignBtn")}
        </button>
      </div>
    );
  }

  // Defensive: profile row may be missing (e.g. RLS misconfiguration) while
  // the session exists. Never crash — offer a retry instead.
  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="text-muted-foreground mb-6">{t("submitFail")}</p>
        <button
          onClick={() => window.location.reload()}
          className="h-12 px-8 rounded-full bg-primary text-primary-foreground font-semibold hover:brightness-110 transition"
        >
          {t("retryBtn")}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pb-10 space-y-8">
      <SectionHeading
        align="left"
        eyebrow="Profile"
        title={`${t("pfHello")}, ${profile.display_name || "Eco Hero"}`}
        subtitle={t("pfSub")}
      />
      <Reveal>
        <div className="glass orbital soft-shadow p-6 flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center">
            <Coins className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-3xl font-bold text-primary">{profile.eco_points || 0}</p>
            <p className="text-sm text-muted-foreground">{t("pfSpend")}</p>
          </div>
          <Link to="/rewards" className="ml-auto h-11 px-5 rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center">{t("pfRedeem")}</Link>
        </div>
      </Reveal>
      <Reveal><ProfileStats profile={profile} /></Reveal>
      <Reveal delay={0.1}><Badges earned={profile.badges || []} /></Reveal>
      <Reveal delay={0.15}><TransactionHistory /></Reveal>
      <Reveal delay={0.2}><BulkMyRequests /></Reveal>
    </div>
  );
}
