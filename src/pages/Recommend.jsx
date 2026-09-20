import React, { useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import SectionHeading from "@/components/common/SectionHeading";
import RecommendForm from "@/components/finder/RecommendForm";
import { useI18n } from "@/lib/i18n";
import { Loader2 } from "lucide-react";

export default function Recommend() {
  const { t } = useI18n();
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('recycling_centres').select('*').then(({ data }) => {
      setCentres(data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 pb-10">
      <SectionHeading
        eyebrow={t("fdRecEyebrow")}
        title={t("fdRecTitle")}
        subtitle={t("fdRecSub")}
      />
      <div className="mt-12">
        {loading ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> {t("loadingDots")}
          </p>
        ) : (
          <RecommendForm centres={centres} />
        )}
      </div>
    </div>
  );
}
