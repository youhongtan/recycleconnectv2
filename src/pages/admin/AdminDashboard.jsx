import React, { useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Users, Recycle, Coins, MapPin, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import StatCard from "@/components/admin/StatCard";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, actions: 0, ecoPoints: 0, centres: 0 });
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Parallel, column-pruned queries: exact counts stay accurate at any
      // scale, and the chart reads at most 1000 material values.
      const [
        { count: usersCount },
        { count: actionsCount },
        { data: logs },
        { data: profiles },
        { count: centresCount },
      ] = await Promise.all([
        supabase.from('user_roles').select('*', { count: 'exact', head: true }),
        supabase.from('recycle_logs').select('*', { count: 'exact', head: true }),
        supabase.from('recycle_logs').select('material').limit(1000),
        supabase.from('eco_profiles').select('eco_points'),
        supabase.from('recycling_centres').select('*', { count: 'exact', head: true }),
      ]);
      const matCount = {};
      (logs || []).forEach((l) => { matCount[l.material] = (matCount[l.material] || 0) + 1; });
      setStats({
        users: usersCount || 0,
        actions: actionsCount || 0,
        ecoPoints: (profiles || []).reduce((s, p) => s + (p.eco_points || 0), 0),
        centres: centresCount || 0,
      });
      setMaterials(Object.entries(matCount).map(([name, count]) => ({ name, count })));
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-muted-foreground">Loading analytics…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and recycling analytics</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.users} color="primary" />
        <StatCard icon={Recycle} label="Recycling Actions" value={stats.actions} color="accent" />
        <StatCard icon={Coins} label="Eco Points Issued" value={stats.ecoPoints} color="amber" />
        <StatCard icon={MapPin} label="Recycling Centres" value={stats.centres} color="rose" />
      </div>
      <div className="glass orbital p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Recycling by Material</h2>
        </div>
        {materials.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={materials}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground py-12 text-center">No recycling data yet.</p>
        )}
      </div>
    </div>
  );
}
