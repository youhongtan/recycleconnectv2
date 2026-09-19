import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { getLevel } from "@/lib/recycleData";
import { getOrCreateProfile } from "@/lib/ecoProfile";
import { MATERIALS_GRAMS, MATERIAL_RATES, validateGrams, quoteSubmission } from "@/lib/ecoConfig";
import { useI18n } from "@/lib/i18n";
import { MapPin, Clock, Phone, CheckCircle2, Loader2, Sparkles, ScanLine } from "lucide-react";

export default function CheckIn() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const centreId = params.get("centre");
  const [centre, setCentre] = useState(null);
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [grams, setGrams] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitId, setSubmitId] = useState(() => crypto.randomUUID());
  const [result, setResult] = useState(null);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (centreId) {
        const { data: c } = await supabase.from('recycling_centres').select('*').eq('id', centreId).maybeSingle();
        setCentre(c);
      }
      const { user: u, profile: p } = await getOrCreateProfile();
      setUser(u);
      setProfile(p);
      setLoading(false);
    })();
  }, [centreId]);

  const setG = (m, v) => setGrams((g) => ({ ...g, [m]: v }));

  const lines = useMemo(
    () =>
      MATERIALS_GRAMS.map((m) => ({ material: m, grams: Number(grams[m] || 0) })).filter(
        (l) => l.grams > 0
      ),
    [grams]
  );

  // Live preview uses the same central config as the server — the server
  // re-validates and re-computes everything before awarding points.
  const quote = useMemo(() => quoteSubmission(lines), [lines]);

  const submit = async () => {
    setFormError("");
    for (const l of lines) {
      const err = validateGrams(l.grams);
      if (err) {
        setFormError(`${l.material}: ${err}`);
        return;
      }
    }
    if (lines.length === 0) {
      setFormError(t("ciNeedOne"));
      return;
    }
    setSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/recycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines,
          clientSubmissionId: submitId,
          centreId: centreId || null,
          centreName: centre?.name || null,
          accessToken: session?.access_token,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed.");
      const { data: p } = await supabase
        .from('eco_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (p) setProfile(p);
      setResult({
        awarded: data.awarded,
        base: data.baseCredited,
        bonus: data.bonus,
        grams: data.totalGrams,
        level: p ? getLevel(p.xp) : getLevel((profile?.xp || 0) + data.awarded),
        balance: p ? p.eco_points : (profile?.eco_points || 0) + data.awarded,
        newBadges: data.newBadges || [],
      });
      setSubmitId(crypto.randomUUID());
      setGrams({});
    } catch (e) {
      setFormError(e.message);
    }
    setSubmitting(false);
  };

  if (loading) return <div className="max-w-2xl mx-auto px-6 py-20 flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> {t("loadingDots")}</div>;

  if (!centreId) return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <ScanLine className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold mb-2">{t("ciNoCentreT")}</h1>
      <p className="text-muted-foreground mb-6">{t("ciNoCentreB")}</p>
      <Link to="/finder" className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-primary text-primary-foreground font-semibold">{t("ciFindCentre")}</Link>
    </div>
  );

  if (!user) return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <h1 className="text-3xl font-bold mb-4">{t("ciLoginT")}</h1>
      <p className="text-muted-foreground mb-6">{t("ciLoginB")}</p>
      <Link to="/login" className="h-12 px-8 rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center">{t("ciLoginBtn")}</Link>
    </div>
  );

  if (result) return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <CheckCircle2 className="w-16 h-16 mx-auto text-primary mb-4" />
      <h1 className="text-3xl font-bold mb-2">+{result.awarded} {t("ecoPointsUnit")}!</h1>
      <p className="text-muted-foreground mb-2">
        {t("ciBase")}: +{result.base} • {t("ciBonus")}: +{result.bonus} • {quote && result.grams.toLocaleString()} g
      </p>
      <p className="text-muted-foreground mb-6">{t("ciLevel")} {result.level} • {result.balance} {t("ecoPointsUnit")}</p>
      {result.newBadges.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-semibold mb-2">{t("ciNewBadges")}</p>
          <div className="flex gap-2 justify-center flex-wrap">
            {result.newBadges.map((b) => <span key={b} className="px-3 py-1 rounded-full bg-primary/12 text-primary text-sm font-medium">🏅 {b}</span>)}
          </div>
        </div>
      )}
      <div className="flex gap-3 justify-center flex-wrap">
        <Link to="/profile" className="h-12 px-6 rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center">{t("ciViewProfile")}</Link>
        <Link to="/rewards" className="h-12 px-6 rounded-full glass font-semibold inline-flex items-center">{t("rewards")}</Link>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-6 pb-10">
      {centre && (
        <div className="glass orbital p-6 mb-6">
          <h1 className="text-2xl font-bold">{centre.name}</h1>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {centre.address}</p>
            {centre.hours && <p className="flex items-center gap-2"><Clock className="w-4 h-4" /> {centre.hours}</p>}
            {centre.contact && <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> {centre.contact}</p>}
          </div>
        </div>
      )}
      <div className="glass orbital p-6">
        <h2 className="text-lg font-semibold mb-1">{t("ciWhat")}</h2>
        <p className="text-sm text-muted-foreground mb-4">{t("ciWhatSub")}</p>
        <div className="space-y-2 mb-4">
          {MATERIALS_GRAMS.map((m) => (
            <div key={m} className={`p-3 rounded-2xl border transition-colors ${Number(grams[m] || 0) > 0 ? "border-primary bg-primary/5" : "border-border"}`}>
              <div className="flex items-center gap-3">
                <span className="flex-1 font-medium">{m}</span>
                <span className="text-sm text-muted-foreground">{MATERIAL_RATES[m]} {t("ciPer100")}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <label htmlFor={`g-${m}`} className="text-sm text-muted-foreground">{t("ciWeight")}</label>
                <input
                  id={`g-${m}`}
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="0"
                  value={grams[m] ?? ""}
                  onChange={(e) => setG(m, e.target.value)}
                  className="flex-1 h-11 px-3 rounded-xl border border-border bg-background text-right font-semibold"
                />
                <span className="text-sm font-bold text-primary w-6">g</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mb-4 p-4 rounded-2xl bg-primary/8 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("ciBase")} ({quote.totalGrams.toLocaleString()} g)</span>
            <span className="font-bold">+{quote.baseCredited}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("ciBonus")}</span>
            <span className="font-bold">+{quote.bonus}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className="font-semibold flex items-center gap-2">{t("ciTotal")} <Sparkles className="w-4 h-4 text-primary" /></span>
            <span className="text-2xl font-bold text-primary">+{quote.totalCredited} {t("ecoPointsUnit")}</span>
          </div>
        </div>
        {formError && <p role="alert" className="text-sm text-destructive mb-3">{formError}</p>}
        <button
          disabled={submitting || lines.length === 0}
          onClick={submit}
          className="w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> {t("ciSubmitting")}</> : `${t("ciSubmit")} +${quote.totalCredited}`}
        </button>
      </div>
    </div>
  );
}
