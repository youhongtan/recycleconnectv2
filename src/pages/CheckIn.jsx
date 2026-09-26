import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { getLevel } from "@/lib/recycleData";
import { getOrCreateProfile } from "@/lib/ecoProfile";
import { MATERIALS_GRAMS, MATERIAL_RATES, validateGrams, quoteSubmission } from "@/lib/ecoConfig";
import { MATERIAL_KEY } from "@/lib/recycleData";
import { useI18n } from "@/lib/i18n";
import { MapPin, Clock, Phone, CheckCircle2, Loader2, Sparkles, ScanLine, QrCode } from "lucide-react";
import QrScanner from "@/components/checkin/QrScanner";

// Idempotency keys must be unique per logical submit. crypto.randomUUID is
// preferred; the timestamp+random fallback keeps rotation working even where
// the Crypto API is restricted, so a key can never get stuck and be reused.
const newSubmitKey = () => {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* fall through to fallback */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
};

// Must match API_REV in api/recycle.js — bump together. Mismatches trigger
// a one-time auto-reload (see submit()).
const CLIENT_API_REV = "r4";

export default function CheckIn() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const centreId = params.get("centre");
  const [centre, setCentre] = useState(null);
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [grams, setGrams] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitId, setSubmitId] = useState(() => newSubmitKey());
  const [result, setResult] = useState(null);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  // Sync guard: React state updates are async, so a rapid double-tap can
  // fire submit() twice with the same idempotency key before `submitting`
  // flips. A ref blocks the second fire synchronously.
  const busyRef = useRef(false);

  const handleScan = (text) => {
    setScanning(false);
    setScanError("");
    let id = null;
    try {
      id = new URL(text, window.location.origin).searchParams.get("centre");
    } catch { /* not a URL */ }
    if (!id && /^[0-9a-f-]{36}$/i.test((text || "").trim())) id = text.trim();
    if (id) {
      window.location.href = `/check-in?centre=${id}`;
    } else {
      setScanError(t("ciScanInvalid"));
    }
  };

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
    if (busyRef.current) return;
    busyRef.current = true;
    console.log("submit key:", submitId);
    setFormError("");
    for (const l of lines) {
      const err = validateGrams(l.grams);
      if (err) {
        setFormError(`${l.material}: ${err}`);
        busyRef.current = false;
        return;
      }
    }
    if (lines.length === 0) {
      setFormError(t("ciNeedOne"));
      busyRef.current = false;
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
      console.log("recycle result:", JSON.stringify({ awarded: data.awarded, base: data.baseCredited, bonus: data.bonus, grams: data.totalGrams, balance: data.newBalance, persisted: data.persisted, duplicate: data.duplicate, apiRev: data.apiRev, debug: data.debug || null }));
      // Stale-deploy guard: if the API answers without the current rev stamp,
      // page and function are mismatched — reload once instead of showing
      // numbers from two different builds.
      if (!data.apiRev || data.apiRev !== CLIENT_API_REV) {
        if (!sessionStorage.getItem("rc-rev-reload")) {
          sessionStorage.setItem("rc-rev-reload", "1");
          window.location.reload();
          return;
        }
        setFormError("App updated in the background — please hard-refresh (Ctrl+Shift+R) and submit again.");
        setSubmitting(false);
        busyRef.current = false;
        return;
      }
      sessionStorage.removeItem("rc-rev-reload");
      const { data: p } = await supabase
        .from('eco_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (p) setProfile(p);
      // Display the SERVER's authoritative new balance, not a refetch that
      // can return a stale row while replicas/RLS settle.
      setResult({
        awarded: data.awarded,
        base: data.baseCredited,
        bonus: data.bonus,
        grams: data.totalGrams,
        level: p ? getLevel(p.xp) : getLevel((profile?.xp || 0) + data.awarded),
        balance: typeof data.newBalance === "number" ? data.newBalance : (p ? p.eco_points : (profile?.eco_points || 0) + data.awarded),
      });
      setSubmitId(newSubmitKey());
      setGrams({});
    } catch (e) {
      setFormError(e.message);
    }
    setSubmitting(false);
    busyRef.current = false;
  };

  if (loading) return <div className="max-w-2xl mx-auto px-6 py-20 flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> {t("loadingDots")}</div>;

  if (!centreId) return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <ScanLine className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold mb-2">{t("ciNoCentreT")}</h1>
      <p className="text-muted-foreground mb-6">{t("ciNoCentreB")}</p>
      {scanError && <p role="alert" className="text-sm text-destructive mb-4">{scanError}</p>}
      <div className="flex gap-3 justify-center flex-wrap">
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="inline-flex items-center gap-2 h-14 px-8 rounded-full bg-primary text-primary-foreground font-semibold text-lg hover:brightness-110 active:scale-[0.98] transition"
        >
          <QrCode className="w-5 h-5" /> {t("ciScanBtn")}
        </button>
        <Link to="/finder" className="inline-flex items-center gap-2 h-14 px-8 rounded-full glass font-semibold text-lg hover:bg-primary/10 transition">{t("ciFindCentre")}</Link>
      </div>
      {scanning && <QrScanner onResult={handleScan} onClose={() => setScanning(false)} />}
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
                <span className="flex-1 font-medium">{t(MATERIAL_KEY[m] || m)}</span>
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
