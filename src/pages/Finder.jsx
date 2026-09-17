import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Search, Loader2, Map as MapIcon } from "lucide-react";
import SectionHeading from "@/components/common/SectionHeading";
import Reveal from "@/components/common/Reveal";
import MaterialFilters from "@/components/finder/MaterialFilters";
import CentreCard from "@/components/finder/CentreCard";
import CentreMap from "@/components/finder/CentreMap";
import RecommendForm from "@/components/finder/RecommendForm";
import { useI18n } from "@/lib/i18n";

export default function Finder() {
  const { t } = useI18n();
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState([]);

  useEffect(() => {
    supabase.from('recycling_centres').select('*').then(({ data }) => {
      setCentres(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return centres.filter((c) => {
      const matchesQuery = !query || `${c.name} ${c.address} ${c.city}`.toLowerCase().includes(query.toLowerCase());
      const matchesFilters = filters.every((f) => (c.materials || []).includes(f));
      return matchesQuery && matchesFilters;
    });
  }, [centres, query, filters]);

  const toggle = (m) => setFilters((f) => (f.includes(m) ? f.filter((x) => x !== m) : [...f, m]));

  return (
    <div className="max-w-6xl mx-auto px-6 pb-10">
      <SectionHeading
        eyebrow={t("fdEyebrow")}
        title={t("fdTitle")}
        subtitle={t("fdSub")}
      />

      <Reveal delay={0.05}>
        <div className="mt-12 glass orbital soft-shadow p-6 space-y-5">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <label htmlFor="centre-search" className="sr-only">Search recycling centres</label>
            <input
              id="centre-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("fdSearchPh")}
              className="w-full h-14 pl-14 pr-5 rounded-full bg-background border border-border focus:border-primary"
            />
          </div>
          <MaterialFilters active={filters} onToggle={toggle} />
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="https://www.google.com/maps/search/recycling+center+malaysia/"
              target="_blank"
              rel="noreferrer"
              className="h-11 px-5 rounded-full border border-primary/40 text-sm font-semibold inline-flex items-center gap-2 hover:bg-primary/5 transition"
            >
              <MapIcon className="w-4 h-4" /> {t("fdMapsBtn")}
            </a>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-6">
          <CentreMap centres={filtered} />
        </div>
      </Reveal>

      {loading ? (
        <div className="mt-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("fdLoading")}
        </div>
      ) : (
        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c, i) => (
            <Reveal key={c.id} delay={(i % 3) * 0.06}>
              <CentreCard centre={c} />
            </Reveal>
          ))}
          {filtered.length === 0 && (
            <p className="text-muted-foreground">{t("fdNoMatch")}</p>
          )}
        </div>
      )}

      <section id="recommend" className="mt-24 scroll-mt-32">
        <SectionHeading
          eyebrow={t("fdRecEyebrow")}
          title={t("fdRecTitle")}
          subtitle={t("fdRecSub")}
        />
        <div className="mt-12">
          <RecommendForm centres={centres} />
        </div>
      </section>
    </div>
  );
}
