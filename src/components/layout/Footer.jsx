import React from "react";
import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="max-w-6xl mx-auto px-6 py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-2xl bg-primary grid place-items-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </span>
            <span className="font-bold text-lg">RecycleConnect</span>
          </div>
          <p className="mt-4 text-muted-foreground max-w-sm">{t("mission")}</p>
        </div>
        <div>
          <h3 className="font-semibold mb-3">{t("ftExplore")}</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/learn" className="hover:text-primary">{t("learn")}</Link></li>
            <li><Link to="/finder" className="hover:text-primary">{t("finder")}</Link></li>
            <li><Link to="/assistant" className="hover:text-primary">{t("assistant")}</Link></li>
            <li><Link to="/pollution" className="hover:text-primary">{t("pollution")}</Link></li>
            <li><Link to="/rewards" className="hover:text-primary">{t("rewards")}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3">{t("ftCommunity")}</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/profile" className="hover:text-primary">{t("profile")}</Link></li>
            <li><Link to="/about" className="hover:text-primary">{t("about")}</Link></li>
            <li><Link to="/contact" className="hover:text-primary">{t("contact")}</Link></li>
            <li><Link to="/contact#faq" className="hover:text-primary">{t("ftFaq")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-6 text-center text-sm text-muted-foreground">
        {t("ftMade")} <span className="font-semibold">You Hong Tan</span> &middot; © {new Date().getFullYear()} {t("ftRights")}
      </div>
    </footer>
  );
}