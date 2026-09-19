import React, { useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useI18n } from "@/lib/i18n";
import { Loader2, Send, BellRing, MapPin, Package, Truck } from "lucide-react";

const STATUS_STYLE = {
  pending: "bg-amber-500/15 text-amber-600",
  contacted: "bg-sky-500/15 text-sky-600",
  scheduled: "bg-violet-500/15 text-violet-600",
  completed: "bg-primary/12 text-primary",
  cancelled: "bg-muted text-muted-foreground",
};

const STATUS_KEY = {
  pending: "stPending",
  contacted: "stContacted",
  scheduled: "stScheduled",
  completed: "stCompleted",
  cancelled: "stCancelled",
};

function Thread({ requestId, t }) {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("school_pickup_messages")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });
    setMsgs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const send = async (text) => {
    const body = (text ?? draft).trim();
    if (!body || busy) return;
    setBusy(true);
    const { error } = await supabase.from("school_pickup_messages").insert({
      request_id: requestId,
      sender: "user",
      message: body,
    });
    if (!error) {
      setDraft("");
      await load();
    }
    setBusy(false);
  };

  return (
    <div className="mt-4 rounded-2xl bg-card border border-border p-4">
      <p className="text-sm font-bold mb-3">{t("reqMsgs")}</p>
      {loading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("loadingDots")}
        </p>
      ) : msgs.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {msgs.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.sender === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.message}</p>
              <p className={`text-[11px] mt-1 ${m.sender === "user" ? "opacity-70" : "text-muted-foreground"}`}>
                {m.sender === "user" ? t("fPerson") : "RecycleConnect"} •{" "}
                {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
              </p>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t("msgPh")}
          className="flex-1 h-11 px-4 rounded-2xl bg-background border border-border focus:border-primary text-sm"
        />
        <button
          type="button"
          disabled={busy || !draft.trim()}
          onClick={() => send()}
          aria-label={t("msgPh")}
          className="h-11 w-11 shrink-0 rounded-full bg-primary text-primary-foreground grid place-items-center hover:brightness-110 transition disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => send(t("nudgeMsg"))}
        className="mt-2 h-10 px-4 rounded-full border border-border text-sm font-semibold inline-flex items-center gap-2 hover:bg-primary/10 transition disabled:opacity-50"
      >
        <BellRing className="w-4 h-4" /> {t("nudgeBtn")}
      </button>
    </div>
  );
}

export default function BulkMyRequests() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("school_pickup_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setRequests(data || []);
      setLoading(false);
    })();
  }, [user]);

  if (!user || loading) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold">{t("myReqT")}</h2>
      {requests.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("myReqEmpty")}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {requests.map((r) => {
            const open = openId === r.id;
            return (
              <article key={r.id} className="panel-solid orbital soft-shadow p-5 sm:p-6">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="w-full text-left flex items-start justify-between gap-3"
                  aria-expanded={open}
                >
                  <div className="min-w-0">
                    <p className="font-bold">
                      #{r.id.slice(0, 8).toUpperCase()} • {r.school_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""} •{" "}
                      {r.quantity}
                      {open ? " ▲" : " ▼"}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold uppercase px-3 py-1.5 rounded-full shrink-0 ${STATUS_STYLE[r.status] || STATUS_STYLE.pending}`}
                  >
                    {t(STATUS_KEY[r.status] || "stPending")}
                  </span>
                </button>

                {open && (
                  <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
                    <p className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                      {r.school_address}
                    </p>
                    <p className="flex items-start gap-2 text-muted-foreground">
                      <Package className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                      {(r.materials || []).join(" · ")}
                    </p>
                    {(r.vehicle_size || r.matched_centre_name) && (
                      <p className="flex items-start gap-2 text-muted-foreground">
                        <Truck className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                        {[r.vehicle_size, r.matched_centre_name].filter(Boolean).join(" → ")}
                        {r.centre_source === "admin" ? " (Admin selected)" : ""}
                      </p>
                    )}
                    {r.admin_note && (
                      <p className="rounded-2xl bg-primary/8 px-4 py-3 text-sm">
                        <strong>RecycleConnect:</strong> {r.admin_note}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t("lastUpdated")}: {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                    </p>
                    <Thread requestId={r.id} t={t} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
