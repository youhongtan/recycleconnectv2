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
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
