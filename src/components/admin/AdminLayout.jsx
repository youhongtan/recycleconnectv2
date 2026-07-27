import React from "react";
import { Outlet, Link, NavLink } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { Leaf, LayoutDashboard, Users, MapPin, QrCode, Mail, ArrowLeft, ShieldAlert, Loader2 } from "lucide-react";

const NAV = [
  { to: "/admin", key: "dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", key: "userMgmt", icon: Users },
  { to: "/admin/centres", key: "centreMgmt", icon: MapPin },
  { to: "/admin/messages", key: "messages", icon: Mail },
  { to: "/admin/qr", key: "qrCodes", icon: QrCode },
];

function AdminContent() {
  const { t } = useI18n();
  const { isLoadingAuth, role, user } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || role !== "admin") {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div className="text-center max-w-md">
          <ShieldAlert className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You need administrator privileges to view this page.</p>
          <Link to="/" className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-primary text-primary-foreground font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex">
      <aside className="w-64 shrink-0 border-r border-border bg-card p-4 flex flex-col">
        <Link to="/" className="flex items-center gap-2 px-2 py-3 mb-4">
          <span className="h-9 w-9 rounded-2xl bg-primary grid place-items-center">
            <Leaf className="w-5 h-5 text-primary-foreground" />
          </span>
          <span className="font-bold tracking-tight">RecycleConnect</span>
        </Link>
        <nav className="space-y-1 flex-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-colors ${
                  isActive ? "bg-primary/12 text-primary" : "hover:bg-primary/8 text-foreground/80"
                }`
              }
            >
              <n.icon className="w-4 h-4" />
              {t(n.key)}
            </NavLink>
          ))}
        </nav>
        <Link to="/" className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-sm font-medium text-muted-foreground hover:bg-primary/8">
          <ArrowLeft className="w-4 h-4" />
          {t("backToSite")}
        </Link>
      </aside>
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <I18nProvider>
      <AdminContent />
    </I18nProvider>
  );
}
