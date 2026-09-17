import React, { useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Search, Shield, User as UserIcon, Loader2 } from "lucide-react";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    (async () => {
      // NOTE: supabase.auth.admin.listUsers() needs the service-role key and
      // can never work from the browser — it silently returned nothing, which
      // is why this page showed "0 registered users". Instead we read
      // eco_profiles (admins can read all rows via RLS) and join user_roles.
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] =
        await Promise.all([
          supabase
            .from('eco_profiles')
            .select('user_id, display_name, email, eco_points, items_recycled, created_at')
            .order('created_at', { ascending: false }),
          supabase.from('user_roles').select('user_id, role'),
        ]);
      if (pErr || rErr) {
        setError(pErr?.message || rErr?.message || "Could not load users.");
      } else {
        setUsers(
          (profiles || []).map((p) => ({
            id: p.user_id,
            email: p.email,
            full_name: p.display_name || '',
            role: (roles || []).find((r) => r.user_id === p.user_id)?.role || 'user',
          }))
        );
      }
      setLoading(false);
    })();
  }, []);

  const filtered = users.filter((u) =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleRole = async (u) => {
    setActionError("");
    const newRole = u.role === "admin" ? "user" : "admin";
    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: u.id, role: newRole }, { onConflict: 'user_id' });
    if (!error) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)));
    } else {
      setActionError(`Could not change role: ${error.message}`);
    }
  };

  if (loading) return <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading users…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground mt-1">{users.length} registered users</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive glass orbital p-4">{error}</p>
      )}
      {actionError && (
        <p role="alert" className="text-sm text-destructive glass orbital p-4">{actionError}</p>
      )}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full h-12 pl-12 pr-4 rounded-2xl border border-border bg-background"
        />
      </div>
      <div className="glass orbital overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr className="text-left text-muted-foreground">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium hidden sm:table-cell">Email</th>
              <th className="p-4 font-medium">Role</th>
              <th className="p-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-border/50 hover:bg-primary/5">
                <td className="p-4 font-medium">{u.full_name || "—"}</td>
                <td className="p-4 hidden sm:table-cell text-muted-foreground">{u.email}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-accent/12 text-accent" : "bg-muted text-muted-foreground"}`}>
                    {u.role || "user"}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => toggleRole(u)}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-xs font-medium border border-border hover:bg-primary/8"
                  >
                    {u.role === "admin" ? <><UserIcon className="w-3 h-3" /> Make User</> : <><Shield className="w-3 h-3" /> Make Admin</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
