import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import {
  Trash2,
  RefreshCw,
  Loader2,
  School,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  Package,
  Reply,
  Send,
  MessageCircle,
} from "lucide-react";

const STATUSES = ["pending", "contacted", "scheduled", "completed", "cancelled"];

const STATUS_STYLE = {
  pending: "bg-amber-500/15 text-amber-600",
  contacted: "bg-sky-500/15 text-sky-600",
  scheduled: "bg-violet-500/15 text-violet-600",
  completed: "bg-primary/12 text-primary",
  cancelled: "bg-muted text-muted-foreground",
};

export default function SchoolRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [missingTable, setMissingTable] = useState(false);
  const [filter, setFilter] = useState("all");
  const [updating, setUpdating] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyResult, setReplyResult] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    setMissingTable(false);
    const { data, error: err } = await supabase
      .from("school_pickup_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) {
      if (/does not exist|42P01|school_pickup_requests/i.test(err.message)) {
        setMissingTable(true);
      } else {
        setError(err.message);
      }
    } else if (data) {
      setRequests(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(
    () => (filter === "all" ? requests : requests.filter((r) => r.status === filter)),
    [requests, filter]
  );

  const setStatus = async (id, status) => {
    setUpdating(id);
    const { error: err } = await supabase
      .from("school_pickup_requests")
      .update({ status })
      .eq("id", id);
    if (!err) setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    setUpdating(null);
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this school pickup request?")) return;
    await supabase.from("school_pickup_requests").delete().eq("id", id);
    setRequests((rs) => rs.filter((r) => r.id !== id));
  };

  const openReply = (r) => {
    setReplyTo(r.id);
    setReplyResult("");
    setReplySubject(`Recycling pickup for ${r.school_name} — RecycleConnect`);
    setReplyText(
      `Hi ${r.contact_person},\n\nThank you for your bulk recycling request for ${(r.materials || []).join(", ")} (${r.quantity}), preferred pickup ${r.pickup_date || "—"}.\n\n` +
        (r.matched_centre_name
          ? `We have matched you with ${r.matched_centre_name} as the nearest suitable centre. `
          : "") +
        `Please reply to confirm a pickup time, or tell us a better date.\n\nYour response had been received. We will get back to you within 3 days.\n\n— RecycleConnect team`
    );
  };

  const sendReply = async (r) => {
    setReplyBusy(true);
    setReplyResult("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "reply",
          to: r.contact_email,
          subject: replySubject,
          text: replyText,
          accessToken: session?.access_token,
        }),
      });
      const data = await res.json();
      if (data.notified) {
        setReplyResult("sent");
        setReplyTo(null);
        setRequests((rs) =>
          rs.map((x) => (x.id === r.id ? { ...x, status: "contacted" } : x))
        );
        await supabase
          .from("school_pickup_requests")
          .update({ status: "contacted" })
          .eq("id", r.id);
      } else {
        setReplyResult(`fail: ${data.error || data.reason || "could not send"}`);
      }
    } catch {
      setReplyResult("fail: network error");
    }
    setReplyBusy(false);
  };

  const waLink = (r) => {
    const digits = (r.contact_phone || "").replace(/\D/g, "");
    const msg = `Hi ${r.contact_person}, this is RecycleConnect about your bulk recycling pickup request for ${r.school_name}.`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">School Pickup Requests</h1>
          <p className="text-muted-foreground mt-1">
            Bulk recycling requests from schools — contact them within 3 days.
          </p>
        </div>
        <button
          onClick={load}
          className="h-10 px-4 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 hover:brightness-110"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", ...STATUSES].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`h-9 px-4 rounded-full text-sm font-semibold capitalize transition ${
              filter === s ? "bg-primary text-primary-foreground" : "glass hover:bg-primary/10"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : missingTable ? (
        <div className="glass orbital p-8 text-center max-w-xl mx-auto">
          <School className="w-10 h-10 mx-auto text-primary mb-3" />
          <h2 className="text-xl font-bold">Table not set up yet</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Run <code className="font-mono">supabase/migration_school_pickup.sql</code> in your
            Supabase SQL Editor to create the <code className="font-mono">school_pickup_requests</code>{" "}
            table. New form submissions will appear here automatically.
          </p>
        </div>
      ) : error ? (
        <div className="text-center py-20 text-destructive">{error}</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No school pickup requests{filter !== "all" ? ` with status “${filter}”` : ""} yet.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <article key={r.id} className="glass orbital p-5 sm:p-6 rounded-2xl">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <School className="w-5 h-5 text-primary shrink-0" />
                    {r.school_name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full capitalize ${STATUS_STYLE[r.status] || STATUS_STYLE.pending}`}
                  >
                    {r.status}
                  </span>
                  <button
                    onClick={() => remove(r.id)}
                    aria-label="Delete request"
                    className="h-8 w-8 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive grid place-items-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-semibold text-foreground">{r.contact_person}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <a href={`mailto:${r.contact_email}`} className="text-primary hover:underline truncate">
                    {r.contact_email}
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  <a href={`tel:${(r.contact_phone || "").replace(/\s/g, "")}`} className="hover:text-primary">
                    {r.contact_phone}
                  </a>
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                  Pickup: <strong className="text-foreground">{r.pickup_date || "—"}</strong>
                </p>
                <p className="flex items-start gap-2 text-muted-foreground sm:col-span-2">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {r.school_address}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Package className="w-4 h-4 text-primary shrink-0" />
                  Qty: <strong className="text-foreground">{r.quantity}</strong>
                </p>
                {r.matched_centre_name && (
                  <p className="text-muted-foreground">
                    Suggested centre: <strong className="text-foreground">{r.matched_centre_name}</strong>
                  </p>
                )}
              </div>

              {(r.materials || []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.materials.map((m) => (
                    <span
                      key={m}
                      className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/12 text-primary"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}

              {r.notes && (
                <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap border-t border-border pt-3">
                  {r.notes}
                </p>
              )}

              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <label htmlFor={`status-${r.id}`} className="text-xs font-semibold text-muted-foreground">
                  Update status:
                </label>
                <select
                  id={`status-${r.id}`}
                  value={r.status || "pending"}
                  disabled={updating === r.id}
                  onChange={(e) => setStatus(r.id, e.target.value)}
                  className="h-10 px-3 rounded-2xl bg-background border border-border text-sm font-medium focus:border-primary"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s} className="capitalize">
                      {s}
                    </option>
                  ))}
                </select>
                {updating === r.id && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => (replyTo === r.id ? setReplyTo(null) : openReply(r))}
                  className="h-10 px-4 rounded-full bg-primary/10 text-primary text-sm font-semibold inline-flex items-center gap-2 hover:bg-primary/20 transition"
                >
                  <Reply className="w-4 h-4" /> Reply by email
                </button>
                <a
                  href={waLink(r)}
                  target="_blank"
                  rel="noreferrer"
                  className="h-10 px-4 rounded-full glass text-sm font-semibold inline-flex items-center gap-2 hover:bg-primary/10 transition"
                  title="Chat on WhatsApp (free, from your WhatsApp account)"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
                <a
                  href={`mailto:${r.contact_email}?subject=${encodeURIComponent(`Recycling pickup for ${r.school_name} — RecycleConnect`)}`}
                  className="h-10 px-4 rounded-full glass text-sm font-semibold inline-flex items-center gap-2 hover:bg-primary/10 transition"
                  title="Open in your mail app (free, from your own email)"
                >
                  <Mail className="w-4 h-4" /> Mail app
                </a>
              </div>

              {replyTo === r.id && (
                <div className="mt-3 p-4 rounded-2xl border border-border bg-background space-y-3">
                  <label className="block text-xs font-semibold text-muted-foreground" htmlFor={`rs-${r.id}`}>
                    Subject
                  </label>
                  <input
                    id={`rs-${r.id}`}
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    className="w-full h-11 px-4 rounded-2xl bg-background border border-border focus:border-primary text-sm"
                  />
                  <label className="block text-xs font-semibold text-muted-foreground" htmlFor={`rt-${r.id}`}>
                    Message to {r.contact_email}
                  </label>
                  <textarea
                    id={`rt-${r.id}`}
                    rows={7}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-background border border-border focus:border-primary text-sm"
                  />
                  {replyResult === "sent" && (
                    <p className="text-sm text-primary">Reply sent — status set to contacted.</p>
                  )}
                  {replyResult.startsWith("fail") && (
                    <p className="text-sm text-destructive">
                      {replyResult}. {replyResult.includes("RESEND_API_KEY") && "Add RESEND_API_KEY in Vercel env vars, or use WhatsApp / Mail app instead (both free)."}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={replyBusy || !replySubject.trim() || !replyText.trim()}
                      onClick={() => sendReply(r)}
                      className="h-11 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 hover:brightness-110 transition disabled:opacity-60"
                    >
                      {replyBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {replyBusy ? "Sending…" : "Send reply"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyTo(null)}
                      className="h-11 px-5 rounded-full glass text-sm font-semibold hover:bg-primary/10 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
