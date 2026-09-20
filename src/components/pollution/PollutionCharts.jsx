import React from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from "recharts";
import Reveal from "@/components/common/Reveal";
import { WASTE_COMPOSITION } from "@/lib/recycleData";
import { useI18n } from "@/lib/i18n";
import { Recycle } from "lucide-react";

const COLORS = ["#2E7D32", "#2196F3", "#81C784", "#90A4AE", "#66BB6A", "#1976D2"];

const COMP_KEY = {
  "Food waste": "compFood",
  Plastic: "compPlastic",
  Paper: "compPaper",
  Others: "compOther",
  Garden: "compGarden",
  "Metal & Glass": "compMetal",
};

export default function PollutionCharts() {
  const { t } = useI18n();
  const compData = WASTE_COMPOSITION.map((c) => ({ ...c, label: t(COMP_KEY[c.name] || c.name) }));

  return (
    <div className="mt-16 grid lg:grid-cols-2 gap-6">
      <Reveal>
        <div className="glass orbital soft-shadow p-8">
          <h3 className="text-xl font-semibold">{t("polPieT")}</h3>
          <p className="text-sm text-muted-foreground">{t("polPieS")}</p>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={compData} dataKey="value" nameKey="label" innerRadius={60} outerRadius={100} paddingAngle={3}>
                  {compData.map((entry, i) => (
                    <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v}%`, n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="glass orbital soft-shadow p-8 flex flex-col items-center justify-center text-center h-full min-h-[24rem]">
          <span className="h-14 w-14 rounded-2xl bg-primary/12 grid place-items-center">
            <Recycle className="w-7 h-7 text-primary" aria-hidden="true" />
          </span>
          <p className="mt-6 text-6xl sm:text-7xl font-bold tracking-tight text-primary">37.9%</p>
          <h3 className="mt-3 text-xl font-semibold">{t("polRateT")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("polRateS")}</p>
        </div>
      </Reveal>
    </div>
  );
}
