import React, { useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Loader2, Search, CheckCircle2, MapPin, Coins, User } from "lucide-react";

export default function StaffCheckIn() {
  const [centres, setCentres] = useState([]);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedCentre, setSelectedCentre] = useState("");
  const [points, setPoints] = useState(10);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("recycling_centres").select("id, name, city, state").then(({ data }) => setCentres(data || []));
  }, []);

  const search = async (q) => {
    setQuery(q);
    if (q.length < 2) { setUsers([]); return; }
    const { data } = await supabase
      .from("eco_profiles")
      .select("id, display_name, email, eco_points, xp")
      .ilike("email", `%${q}%`);
    setUsers(data || []);
  };

  const submit = async () => {
    if (!selectedUser || !selectedCentre || points < 1) return;
    setBusy(true);
    setError("");
    const centre = centres.find((c) => c.id === selectedCentre);
    try {
      const { error: logErr } = await supabase.from("recycle_logs").insert({
        user_id: selectedUser.id,
        material: "Mixed",
        quantity: 1,
        weight_kg: 0,
        centre_id: selectedCentre,
        centre_name: centre?.name,
        eco_points_earned: points,
        source: "qr_checkin",
      });
      if (logErr) throw logErr;

      const { data: profile } = await supabase
        .from("eco_profiles")
        .select("*")
        .eq("id", selectedUser.id)
        .single();

      const badges = new Set(profile.badges || []);
      badges.add("First Recycling Action");
      if ((profile.items_recycled || 0) + 1 >= 50) badges.add("Earth Guardian");

      const { error: updateErr } = await supabase
        .from("eco_profiles")
        .update({
          xp: (profile.xp || 0) + points * 2,
          eco_points: (profile.eco_points || 0) + points,
          items_recycled: (profile.items_recycled || 0) + 1,
          badges: [...badges],
        })
        .eq("id", selectedUser.id);
      if (updateErr) throw updateErr;

      setDone(true);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const reset = () => {
    setSelectedUser(null);
    setQuery("");
    setUsers([]);
    setPoints(10);
    setDone(false);
    setError("");
  };

  if (done) return (
    <div className="max-w-lg mx-auto text-center py-20">
      <CheckCircle2 className="w-16 h-16 mx-auto text-primary mb-4" />
      <h1 className="text-3xl font-bold mb-2">Points Awarded!</h1>
      <p className="text-muted-foreground mb-2">+{points} Eco Points to {selectedUser.email}</p>
      <p className="text-sm text-muted-foreground mb-6">at {centres.find((c) => c.id === selectedCentre)?.name}</p>
      <button onClick={reset} className="h-12 px-8 rounded-full bg-primary text-primary-foreground font-semibold">
        New Check-In
      </button>
    </div>
  );

  const field = "w-full h-12 px-4 rounded-2xl bg-background border border-border focus:border-primary text-sm";

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User className="w-7 h-7 text-primary" /> Staff Check-In
        </h1>
        <p className="text-muted-foreground mt-1">Award Eco Points to users who recycle at your centre.</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <div className="glass orbital soft-shadow p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold mb-2">Recycling centre</label>
          <select
            className={field}
            value={selectedCentre}
            onChange={(e) => setSelectedCentre(e.target.value)}
          >
            <option value="">Select a centre…</option>
            {centres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.city}, {c.state}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Search user by email</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className="w-full h-12 pl-10 pr-4 rounded-2xl bg-background border border-border focus:border-primary text-sm"
              placeholder="Type email…"
              value={query}
              onChange={(e) => search(e.target.value)}
            />
          </div>
          {users.length > 0 && !selectedUser && (
            <div className="mt-2 rounded-2xl border border-border overflow-hidden">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { setSelectedUser(u); setUsers([]); }}
                  className="w-full px-4 py-3 text-left hover:bg-primary/5 transition text-sm flex items-center justify-between"
                >
                  <span>{u.email}</span>
                  <span className="text-muted-foreground">{u.display_name}</span>
                </button>
              ))}
            </div>
          )}
          {selectedUser && (
            <div className="mt-2 p-3 rounded-2xl bg-primary/8 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{selectedUser.email}</p>
                <p className="text-xs text-muted-foreground">{selectedUser.display_name} · {selectedUser.eco_points} pts</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-xs text-destructive">Change</button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Eco Points to award</label>
          <input
            type="number"
            min="1"
            max="1000"
            className={field}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
          />
        </div>

        <button
          disabled={busy || !selectedUser || !selectedCentre || points < 1}
          onClick={submit}
          className="w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition"
        >
          {busy ? <><Loader2 className="w-5 h-5 animate-spin" /> Awarding…</> : <><Coins className="w-5 h-5" /> Award {points} Eco Points</>}
        </button>
      </div>
    </div>
  );
}
