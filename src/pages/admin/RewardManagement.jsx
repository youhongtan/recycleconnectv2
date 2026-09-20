import React, { useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Plus, Pencil, Trash2, X, Loader2, Gift } from "lucide-react";

const EMPTY = {
  name: "",
  description: "",
  eco_points_cost: 100,
  category: "Eco Product",
  available: true,
  reward_kind: "eco",
  impact_note: "",
  tier_min_grams: "",
  stock_total: "",
  stock_left: "",
};
const CATEGORIES = ["Eco Product", "Stationery", "Tech", "Bundle", "Voucher", "Accessory", "Impact", "Trophy"];

const numOrNull = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

export default function RewardManagement() {
  const [rewards, setRewards] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('eco_points_cost', { ascending: true });
    if (!error) setRewards(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    setMsg("");
    const payload = {
      name: editing.name.trim(),
      description: editing.description || null,
      eco_points_cost: Number(editing.eco_points_cost) || 0,
      category: editing.category,
      available: !!editing.available,
      reward_kind: editing.reward_kind,
      impact_note: editing.impact_note || null,
      tier_min_grams: numOrNull(editing.tier_min_grams),
      stock_total: numOrNull(editing.stock_total),
      stock_left: numOrNull(editing.stock_left),
    };
    let error = null;
    if (editing.id) {
      ({ error } = await supabase.from('rewards').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('rewards').insert(payload));
    }
    if (error) setMsg(`Save failed: ${error.message}`);
    setSaving(false);
    setEditing(null);
    load();
  };

  const del = async (r) => {
    if (!window.confirm(`Delete ${r.name}? Past redemptions keep working from history.`)) return;
    const { error } = await supabase.from('rewards').delete().eq('id', r.id);
    if (error) setMsg(`Delete failed: ${error.message}`);
    load();
  };

  const toggleAvailable = async (r) => {
    await supabase.from('rewards').update({ available: !r.available }).eq('id', r.id);
    load();
  };

  const restock = async (r) => {
    await supabase
      .from('rewards')
      .update({ stock_left: r.stock_total ?? 1, holder_name: null, holder_at: null })
      .eq('id', r.id);
    setMsg(`${r.name} re-stocked — a new round is open.`);
    load();
  };

  const field = "w-full h-12 px-4 rounded-2xl border border-border bg-background";
  const numField = "w-full h-12 px-4 rounded-2xl border border-border bg-background";

  if (loading) return <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading rewards…</p>;

  if (editing) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{editing.id ? "Edit Reward" : "Add Reward"}</h1>
          <button onClick={() => setEditing(null)} aria-label="Close" className="h-10 w-10 rounded-full grid place-items-center glass"><X className="w-4 h-4" /></button>
        </div>
        <input className={field} placeholder="Reward name *" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
        <textarea className={field + " h-20 py-3"} placeholder="Description" value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Cost (Eco Points) *</label>
            <input type="number" min="0" className={numField} value={editing.eco_points_cost} onChange={(e) => setEditing({ ...editing, eco_points_cost: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select className={field} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Kind</label>
            <select className={field} value={editing.reward_kind} onChange={(e) => setEditing({ ...editing, reward_kind: e.target.value })}>
              <option value="eco">Eco reward</option>
              <option value="impact">Impact contribution</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm mt-7">
            <input type="checkbox" checked={!!editing.available} onChange={(e) => setEditing({ ...editing, available: e.target.checked })} className="h-5 w-5" />
            Available
          </label>
        </div>
        {editing.reward_kind === "impact" && (
          <textarea className={field + " h-20 py-3"} placeholder="Impact honesty note (shown to users)" value={editing.impact_note || ""} onChange={(e) => setEditing({ ...editing, impact_note: e.target.value })} />
        )}
        <div className="rounded-2xl border border-border p-4 space-y-3">
          <p className="text-sm font-bold">Tier trophy settings <span className="font-normal text-muted-foreground">(leave empty for normal rewards)</span></p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Qualify grams</label>
              <input type="number" min="0" step="1000" className={numField} placeholder="e.g. 100000" value={editing.tier_min_grams ?? ""} onChange={(e) => setEditing({ ...editing, tier_min_grams: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Stock total</label>
              <input type="number" min="0" className={numField} placeholder="1" value={editing.stock_total ?? ""} onChange={(e) => setEditing({ ...editing, stock_total: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Stock left</label>
              <input type="number" min="0" className={numField} placeholder="1" value={editing.stock_left ?? ""} onChange={(e) => setEditing({ ...editing, stock_left: e.target.value })} />
            </div>
          </div>
          {editing.holder_name && (
            <p className="text-xs text-muted-foreground">Currently held by <strong>{editing.holder_name}</strong>{editing.holder_at ? ` since ${new Date(editing.holder_at).toLocaleString()}` : ""}. Set stock left to 1 to open a new round.</p>
          )}
        </div>
        <button onClick={save} disabled={saving || !editing.name.trim()} className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-50">
          {saving ? "Saving…" : "Save Reward"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Reward Management</h1>
          <p className="text-muted-foreground mt-1">Eco rewards, impact contributions and tier trophies</p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} className="h-11 px-5 rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2 hover:brightness-110">
          <Plus className="w-4 h-4" /> Add Reward
        </button>
      </div>
      {msg && <p role="status" className="text-sm text-primary glass orbital p-4">{msg}</p>}
      <div className="space-y-2">
        {rewards.map((r) => (
          <div key={r.id} className="panel-solid orbital p-4 flex items-center gap-3 flex-wrap">
            <span className="h-10 w-10 rounded-2xl bg-primary/12 grid place-items-center shrink-0">
              <Gift className="w-5 h-5 text-primary" />
            </span>
            <div className="flex-1 min-w-[180px]">
              <p className="font-semibold">
                {r.name}{" "}
                <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${r.reward_kind === "impact" ? "bg-amber-500/15 text-amber-600" : r.tier_min_grams != null ? "bg-violet-500/15 text-violet-600" : "bg-primary/12 text-primary"}`}>
                  {r.tier_min_grams != null ? "trophy" : r.reward_kind}
                </span>{" "}
                {!r.available && <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">hidden</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {Number(r.eco_points_cost).toLocaleString()} pts • {r.category}
                {r.tier_min_grams != null && ` • qualifies at ${Number(r.tier_min_grams).toLocaleString()}g`}
                {r.stock_left != null && ` • stock ${r.stock_left}/${r.stock_total ?? "?"}`}
                {r.holder_name && ` • held by ${r.holder_name}`}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => toggleAvailable(r)} title={r.available ? "Hide" : "Show"} className="h-9 px-3 rounded-full text-xs font-semibold border border-border hover:bg-primary/8">
                {r.available ? "Hide" : "Show"}
              </button>
              {r.tier_min_grams != null && (
                <button onClick={() => restock(r)} title="Open a new round (stock to full, clear holder)" className="h-9 px-3 rounded-full text-xs font-semibold border border-border hover:bg-primary/8">
                  Restock
                </button>
              )}
              <button onClick={() => setEditing({ ...EMPTY, ...r })} aria-label="Edit" className="h-9 w-9 rounded-full grid place-items-center border border-border hover:bg-primary/8">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => del(r)} aria-label="Delete" className="h-9 w-9 rounded-full grid place-items-center border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {rewards.length === 0 && <p className="text-center text-muted-foreground py-16">No rewards yet — add the first one.</p>}
      </div>
    </div>
  );
}
