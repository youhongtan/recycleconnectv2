import React from "react";
import { MapPin, Clock, Phone, Navigation, Coins, Star, Truck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function CentreCard({ centre, highlight = false }) {
  const { t } = useI18n();
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${centre.name} ${centre.address}`
  )}`;
  return (
    <article
      className={`glass orbital soft-shadow p-6 h-full flex flex-col hover:-translate-y-1 transition-transform duration-500 ${
        highlight ? "ring-2 ring-primary" : ""
      }`}
    >
      <h3 className="text-xl font-semibold tracking-tight">{centre.name}</h3>
      <p className="mt-2 text-sm text-muted-foreground flex gap-2">
        <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary" aria-hidden="true" />
        {centre.address}
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground flex gap-2">
        <Clock className="w-4 h-4 shrink-0 mt-0.5 text-primary" aria-hidden="true" />
        {centre.hours}
      </p>
      {centre.contact && (
        <a href={`tel:${centre.contact.replace(/\s/g, "")}`} className="mt-1.5 text-sm text-muted-foreground flex gap-2 hover:text-primary">
          <Phone className="w-4 h-4 shrink-0 mt-0.5 text-primary" aria-hidden="true" />
          {centre.contact}
        </a>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {(centre.materials || []).map((m) => (
          <span key={m} className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/12 text-primary">
            {m}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {centre.pays_cash && <span className="inline-flex items-center gap-1"><Coins className="w-3.5 h-3.5" /> {t("ccCash")}</span>}
        {centre.reward_points && <span className="inline-flex items-center gap-1"><Star className="w-3.5 h-3.5" /> {t("ccPoints")}</span>}
        {centre.home_collection && <span className="inline-flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> {t("ccHome")}</span>}
      </div>

      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-6 h-12 rounded-full bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition"
      >
        <Navigation className="w-4 h-4" /> {t("ccNav")}
      </a>
    </article>
  );
}