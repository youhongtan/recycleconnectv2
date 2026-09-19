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
  Truck,
  Send,
  MessageCircle,
  Pencil,
  CheckCircle2,
} from "lucide-react";

const STATUSES = ["pending", "contacted", "scheduled", "completed", "cancelled"];

const STATUS_STYLE = {
  pending: "bg-amber-500/15 text-amber-600",
  contacted: "bg-sky-500/15 text-sky-600",
  scheduled: "bg-violet-500/15 text-violet-600",
  completed: "bg-primary/12 text-primary",
  cancelled: "bg-muted text-muted-foreground",
};

const STATUS_MAIL = {
  pending: "Your request is pending review. We will get back to you within 3 days.",
  contacted: "Thanks — we've received your request and will arrange the pickup details with you shortly.",
  scheduled: "Good news — your bulk pickup is scheduled. We'll confirm the exact time with you soon.",
  completed: "Your bulk recycling pickup is marked completed. Thank you for recycling with RecycleConnect!",
  cancelled: "Your pickup request has been marked cancelled. Reply to this email if you'd like to rebook.",
};

async function emailSchool({ to, subject, text }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "reply", to, subject, text, accessToken: session?.access_token }),
  });
  return res.json();
}

function AdminThread({ request }) {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null); // {ok, text}

  const load = async () => {
    const { data } = await supabase
      .from("school_pickup_messages")
      .select("*")
      .eq("request_id", request.id)
      .order("created_at", { ascending: true });
    setMsgs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id]);

  const sendReply = async () => {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setNote(null);
    // 1. Save FIRST — the message is never lost, even if email fails.
    const { data: saved, error } = await supabase
      .from("school_pickup_messages")
      .insert({ request_id: request.id, sender: "admin", message: body })
      .select()
      .single();
    if (error) {
      setNote({ ok: false, text: `Could not save reply: ${error.message}` });
      setBusy(false);
      return;
    }
    // 2. Display immediately.
    setMsgs((m) => [...m, saved]);
    setDraft("");
    // 3. Email notification afterward — strictly non-blocking.
    try {
      const data = await emailSchool({
        to: request.contact_email,
        subject: `Recycling pickup update — ${request.school_name}`,
        text: `Hi ${request.contact_person},\n\n${body}\n\n— RecycleConnect team`,
      });
      setNote(
        data.notified
          ? { ok: true, text: "Reply saved and emailed to the school." }
          : {
              ok: false,
              text: `Reply saved. Email notification is not configured yet.${
                data.error ? ` (${typeof data.error === "string" ? data.error : "Resend error"})` : ""
              }`,
            }
      );
    } catch {
      setNote({ ok: false, text: "Reply saved. Email notification is not configured yet." });
    }
    setBusy(false);
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <p className="text-sm font-bold mb-3">Messages</p>
      {loading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </p>
      ) : msgs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No messages yet.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {msgs.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.sender === "admin"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.message}</p>
              <p className={`text-[11px] mt-1 ${m.sender === "admin" ? "opacity-70" : "text-muted-foreground"}`}>
                {m.sender === "admin" ? "You (admin)" : request.contact_person} •{" "}
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
          onKeyDown={(e) => e.key === "Enter" && sendReply()}
          placeholder="Reply to the school…"
          className="flex-1 h-11 px-4 rounded-2xl bg-background border border-border focus:border-primary text-sm"
        />
        <button
          type="button"
          disabled={busy || !draft.trim()}
          onClick={sendReply}
          className="h-11 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 hover:brightness-110 transition disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send
        </button>
      </div>
      {note && (
        <p className={`mt-2 text-xs ${note.ok ? "text-primary" : "text-amber-600"}`}>{note.text}</p>
      )}
    </div>
  );
}

function CentreOverride({ request, onSaved }) {
  const [centres, setCentres] = useState([]);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState(null);
  const [note, setNote] = useState(request.admin_note || "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("recycling_centres")
        .select("id,name,city,state,materials,home_collection")
        .order("name", { ascending: true })
        .limit(500);
      setCentres(data || []);
    })();
  }, []);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return centres
      .filter((c) => `${c.name} ${c.city || ""} ${c.state || ""}`.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [centres, q]);

  const save = async () => {
    if (!picked || busy) return;
    setBusy(true);
    const { error } = await supabase
      .from("school_pickup_requests")
      .update({
        matched_centre_id: picked.id,
        matched_centre_name: picked.name,
        centre_source: "admin",
        rec_source: "admin",
        rec_at: new Date().toISOString(),
        rec_matched_materials: (picked.materials || []).filter((m) =>
          (request.materials || []).includes(m)
        ),
        rec_pickup_verified: picked.home_collection === true,
        rec_verified: false,
        admin_note: note.trim() || null,
      })
      .eq("id", request.id);
    if (!error) {
      setDone("Recommendation updated (Admin selected).");
      onSaved();
    }
    setBusy(false);
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <p className="text-sm font-bold mb-2 flex items-center gap-2">
        <Pencil className="w-4 h-4 text-primary" /> Change recommended centre
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search verified centres…"
        className="w-full h-11 px-4 rounded-2xl bg-background border border-border focus:border-primary text-sm"
      />
      {matches.length > 0 && (
        <div className="mt-2 rounded-2xl border border-border bg-background overflow-hidden">
          {matches.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setPicked(c);
                setQ(c.name);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition ${
                picked?.id === c.id ? "bg-primary/10 font-semibold" : ""
              }`}
            >
              {c.name}
              <span className="text-muted-foreground"> — {[c.city, c.state].filter(Boolean).join(", ")}</span>
            </button>
          ))}
        </div>
      )}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Note for requester (why this centre)…"
        className="mt-2 w-full p-3 rounded-2xl bg-background border border-border focus:border-primary text-sm"
      />
      <button
        type="button"
        disabled={!picked || busy}
        onClick={save}
        className="mt-2 h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition disabled:opacity-50 inline-flex items-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        Save changes
      </button>
      {done && <p className="mt-2 text-xs text-primary">{done}</p>}
    </div>
  );
}

export default function SchoolRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [missingTable, setMissingTable] = useState(false);
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [mailNote, setMailNote] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    setMissingTable(false);
    const { data, error: err } = await supabase
      .from("school_pickup_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) {
      if (err.code === "42P01" || /relation .* does not exist/i.test(err.message || "")) {
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
    const r = requests.find((x) => x.id === id);
    if (r && r.status === status) return;
    setUpdating(id);
    setMailNote(null);
    const { error: err } = await supabase
      .from("school_pickup_requests")
      .update({ status })
      .eq("id", id);
    if (!err) {
      setRequests((rs) => rs.map((x) => (x.id === id ? { ...x, status } : x)));
      try {
        const data = await emailSchool({
          to: r.contact_email,
          subject: `Recycling pickup ${status} — ${r.school_name}`,
          text: `Hi ${r.contact_person},\n\n${STATUS_MAIL[status] || ""}\n\nRequest: ${(r.materials || []).join(", ")} (${r.quantity}).\n\n— RecycleConnect team`,
        });
        setMailNote(
          data.notified
            ? { id, ok: true, text: `Status saved. School emailed about “${status}”.` }
            : {
                id,
                ok: false,
                text: `Status saved. Email notification is not configured yet.${
                  typeof data.error === "string" ? ` (${data.error})` : ""
                }`,
              }
        );
      } catch {
        setMailNote({ id, ok: false, text: "Status saved. Email notification is not configured yet." });
      }
    }
    setUpdating(null);
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this school pickup request?")) return;
    await supabase.from("school_pickup_requests").delete().eq("id", id);
    setRequests((rs) => rs.filter((r) => r.id !== id));
  };

  const waLink = (r) => {
    const digits = (r.contact_phone || "").replace(/\D/g, "");
    return `https://wa.me/${digits}?text=${encodeURIComponent(
      `Hi ${r.contact_person}, this is RecycleConnect about your bulk recycling pickup request for ${r.school_name}.`
    )}`;
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
        <div className="panel-solid orbital soft-shadow p-8 text-center max-w-xl mx-auto">
          <School className="w-10 h-10 mx-auto text-primary mb-3" />
          <h2 className="text-xl font-bold">Table not set up yet</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Run <code className="font-mono">supabase/migration_school_pickup.sql</code> then{" "}
            <code className="font-mono">supabase/migration_v3_grams_points.sql</code> in your
            Supabase SQL Editor.
          </p>
        </div>
      ) : error ? (
        <div className="text-center py-20 text-destructive">{error}</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No school pickup requests{filter !== "all" ? ` with status “${filter}”` : ""} yet.
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((r) => {
            const open = openId === r.id;
            return (
              <article key={r.id} className="panel-solid orbital soft-shadow p-5 sm:p-6">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : r.id)}
                  aria-expanded={open}
                  className="w-full text-left flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg">
                      #{r.id.slice(0, 8).toUpperCase()} • {r.school_name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : ""} •{" "}
                      {r.quantity} • {r.vehicle_size || "vehicle?"}
                      {open ? " ▲" : " ▼ More"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-bold uppercase px-3 py-1.5 rounded-full capitalize ${STATUS_STYLE[r.status] || STATUS_STYLE.pending}`}
                    >
                      {r.status}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="Delete request"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(r.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") remove(r.id);
                      }}
                      className="h-8 w-8 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive grid place-items-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </span>
                  </div>
                </button>

                {open && (
                  <div className="mt-4 pt-4 border-t border-border space-y-4">
                    {/* Admin review fields */}
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <p><strong>Request ID:</strong> <code className="text-xs">{r.id}</code></p>
                      <p><strong>Status:</strong> <span className="capitalize">{r.status}</span></p>
                      <p className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                        <span><strong>Pickup location:</strong> {r.school_address}</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <Package className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                        <span><strong>Materials:</strong> {(r.materials || []).join(" · ")}</span>
                      </p>
                      <p><strong>Est. weight:</strong> {r.est_weight_kg != null ? `${Number(r.est_weight_kg).toLocaleString()} kg` : r.weight_unknown ? `Unknown (${r.volume_desc || "no description"})` : r.quantity}</p>
                      <p className="flex items-start gap-2">
                        <Truck className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                        <span><strong>Vehicle:</strong> {r.vehicle_size || "—"}</span>
                      </p>
                      <p><strong>Pickup:</strong> {r.pickup_preference === "weekday" ? "Weekdays only (Mon–Fri)" : r.pickup_preference === "weekend" ? "Weekends only (Sat–Sun)" : (r.pickup_date || "—")}</p>
                      <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4 shrink-0 text-primary" />
                        <a href={`tel:${(r.contact_phone || "").replace(/\s/g, "")}`} className="hover:text-primary">{r.contact_phone}</a>
                        <span className="text-muted-foreground">({r.contact_person})</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Mail className="w-4 h-4 shrink-0 text-primary" />
                        <a href={`mailto:${r.contact_email}`} className="text-primary hover:underline truncate">{r.contact_email}</a>
                      </p>
                      <p className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 shrink-0 text-primary" />
                        {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
                      </p>
                    </div>

                    {r.photo_url && (
                      <a href={r.photo_url} target="_blank" rel="noreferrer" className="inline-block group">
                        <img src={r.photo_url} alt={`Bulk recyclables at ${r.school_name}`} className="h-36 rounded-2xl border border-border object-cover group-hover:opacity-90 transition" />
                      </a>
                    )}
                    {r.notes && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-2xl bg-card border border-border p-4">{r.notes}</p>
                    )}

                    {/* Recommendation + source + verification */}
                    <div className="rounded-2xl bg-card border border-border p-4 text-sm space-y-1">
                      <p><strong>Recommended centre:</strong> {r.matched_centre_name || "—"}</p>
                      <p><strong>Source:</strong> {r.centre_source === "admin" ? "Admin selected" : "Automatic"}</p>
                      <p>
                        <strong>Verification:</strong>{" "}
                        {r.rec_pickup_verified
                          ? "Pickup service listed by centre."
                          : "Pickup NOT verified — confirm before promising pickup."}{" "}
                        Capacity not verified — administrator review required.
                      </p>
                      {(r.rec_matched_materials || []).length > 0 && (
                        <p><strong>Matched materials:</strong> {r.rec_matched_materials.join(" · ")}</p>
                      )}
                      {r.admin_note && (
                        <p><strong>Admin note:</strong> {r.admin_note}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <a href={waLink(r)} target="_blank" rel="noreferrer" className="h-10 px-4 rounded-full bg-card border border-border text-sm font-semibold inline-flex items-center gap-2 hover:bg-primary/10 transition">
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                      </a>
                      <label htmlFor={`status-${r.id}`} className="text-xs font-semibold text-muted-foreground ml-2">
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
                          <option key={s} value={s} className="capitalize">{s}</option>
                        ))}
                      </select>
                      {updating === r.id && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                    </div>
                    {mailNote?.id === r.id && (
                      <p className={`text-xs ${mailNote.ok ? "text-primary" : "text-amber-600"}`}>{mailNote.text}</p>
                    )}

                    <AdminThread request={r} />
                    <CentreOverride request={r} onSaved={load} />
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
