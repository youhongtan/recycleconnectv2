import React from "react";
import { Link } from "react-router-dom";
import { Leaf, Instagram, Facebook, Youtube, Mail } from "lucide-react";
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
          <div className="mt-5 flex gap-3">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="h-10 w-10 rounded-full glass grid place-items-center hover:bg-primary/10">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="h-10 w-10 rounded-full glass grid place-items-center hover:bg-primary/10">
              <Facebook className="w-4 h-4" />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube" className="h-10 w-10 rounded-full glass grid place-items-center hover:bg-primary/10">
              <Youtube className="w-4 h-4" />
            </a>
            <a href="mailto:hello@recycleconnect.my" aria-label="Email us" className="h-10 w-10 rounded-full glass grid place-items-center hover:bg-primary/10">
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-3">Explore</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/learn" className="hover:text-primary">Learn</Link></li>
            <li><Link to="/finder" className="hover:text-primary">Centre Finder</Link></li>
            <li><Link to="/assistant" className="hover:text-primary">AI Assistant</Link></li>
            <li><Link to="/pollution" className="hover:text-primary">Malaysia Pollution</Link></li>
            <li><Link to="/rewards" className="hover:text-primary">Eco Rewards</Link></li>
            <li><Link to="/challenges" className="hover:text-primary">Challenges</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3">Community</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/profile" className="hover:text-primary">My Profile</Link></li>
            <li><Link to="/about" className="hover:text-primary">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-primary">Contact</Link></li>
            <li><Link to="/contact#faq" className="hover:text-primary">FAQ</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-6 text-center text-sm text-muted-foreground">
        Made by <span className="font-semibold">You Hong Tan</span> &middot; © {new Date().getFullYear()} RecycleConnect Malaysia. Built for a greener tomorrow.
      </div>
    </footer>
  );
}