import React, { useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useI18n, LANGS } from "@/lib/i18n";
import ThemeToggle from "@/components/common/ThemeToggle";
import { User, Globe, Palette, LogOut, Save, Loader2, Check } from "lucide-react";

export default function Settings() {
  const { lang, setLang, t } = useI18n();
  const { user, profile, logout } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      setName(profile.display_name || "");
    }
    setLoading(false);
  }, [profile]);

  const save = async () => {
    setSaving(true);
    if (profile) {
      await supabase.from('eco_profiles').update({ display_name: name }).eq('id', profile.id);
    }
    if (user) {
      await supabase.auth.updateUser({ data: { full_name: name } });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="max-w-2xl mx-auto px-6 py-20 flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> {t("loadingDots")}</div>;

  return (
    <div className="max-w-2xl mx-auto px-6 pb-10 space-y-6">
      <div>
        <h1 className="text-4xl font-bold">{t("settings")}</h1>
        <p className="text-muted-foreground mt-1">{t("seSub")}</p>
      </div>
      <div className="glass orbital p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary"><User className="w-5 h-5" /><h2 className="font-semibold">{t("seProfile")}</h2></div>
        <div>
          <label className="block text-sm font-medium mb-2">{t("seName")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-12 px-4 rounded-2xl border border-border bg-background" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">{t("seEmail")}</label>
          <input value={user?.email || ""} disabled className="w-full h-12 px-4 rounded-2xl border border-border bg-muted text-muted-foreground" />
        </div>
        <button onClick={save} disabled={saving} className="h-12 px-6 rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? t("seSaved") : t("seSave")}
        </button>
      </div>
      <div className="glass orbital p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary"><Globe className="w-5 h-5" /><h2 className="font-semibold">{t("seLang")}</h2></div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(LANGS).map(([code, info]) => (
            <button key={code} onClick={() => setLang(code)} className={`h-12 rounded-2xl font-medium transition ${lang === code ? "bg-primary text-primary-foreground" : "glass"}`}>
              {info.label}
            </button>
          ))}
        </div>
      </div>
      <div className="glass orbital p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary"><Palette className="w-5 h-5" /><h2 className="font-semibold">{t("seAppear")}</h2></div>
        <div className="flex items-center justify-between">
          <span>{t("seMode")}</span>
          <ThemeToggle />
        </div>
      </div>
      <button onClick={logout} className="w-full h-12 rounded-full border border-destructive/30 text-destructive font-semibold inline-flex items-center justify-center gap-2 hover:bg-destructive/5">
        <LogOut className="w-4 h-4" /> {t("seLogout")}
      </button>
    </div>
  );
}
