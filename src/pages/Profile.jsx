import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getOrCreateProfile } from "@/lib/ecoProfile";
import SectionHeading from "@/components/common/SectionHeading";
import Reveal from "@/components/common/Reveal";
import ProfileStats from "@/components/profile/ProfileStats";
import Badges from "@/components/profile/Badges";

import { Loader2, Coins } from "lucide-react";
import { Link } from "react-router-dom";

export default function Profile() {
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
        <Loader2 className="w-4 h-4 animate-spin" /> Loading your eco profile…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-6 pb-10 text-center">
        <SectionHeading
          eyebrow="Profile"
          title="Track your impact"
          subtitle="Sign in to log recycled items, earn XP, unlock badges and climb the leaderboard."
        />
        <button
          onClick={navigateToLogin}
          className="mt-10 h-14 px-8 rounded-full bg-primary text-primary-foreground font-semibold soft-shadow hover:brightness-110 active:scale-[0.98] transition"
        >
          Sign in to continue
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pb-10 space-y-8">
      <SectionHeading
        align="left"
        eyebrow="Profile"
        title={`Hello, ${profile.display_name || "Eco Hero"}`}
        subtitle="Every item you log turns into XP, badges and a measurable carbon saving."
      />
      <Reveal>
        <div className="glass orbital soft-shadow p-6 flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center">
            <Coins className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-3xl font-bold text-primary">{profile.eco_points || 0}</p>
            <p className="text-sm text-muted-foreground">Eco Points — spend on rewards</p>
          </div>
          <Link to="/rewards" className="ml-auto h-11 px-5 rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center">Redeem</Link>
        </div>
      </Reveal>
      <Reveal><ProfileStats profile={profile} /></Reveal>
      <Reveal delay={0.1}><Badges earned={profile.badges || []} /></Reveal>
    </div>
  );
}
