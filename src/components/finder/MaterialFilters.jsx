import React from "react";
import { MATERIALS, MATERIAL_KEY } from "@/lib/recycleData";
import { useI18n } from "@/lib/i18n";

export default function MaterialFilters({ active, onToggle }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by material">
      {MATERIALS.map((m) => {
        const on = active.includes(m);
        return (
          <button
            key={m}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(m)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              on
                ? "bg-primary text-primary-foreground soft-shadow"
                : "glass hover:bg-primary/10"
            }`}
          >
            {t(MATERIAL_KEY[m] || m)}
          </button>
        );
      })}
    </div>
  );
}