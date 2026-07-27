import React, { createContext, useContext, useEffect, useState } from "react";

export const LANGS = {
  en: { label: "English", short: "EN" },
  ms: { label: "Bahasa Melayu", short: "BM" },
  zh: { label: "中文", short: "中" },
};

const STRINGS = {
  en: {
    tagline: "Making Recycling Simple, Smart, and Rewarding.",
    mission: "Connecting People for a Greener Tomorrow.",
    getStarted: "Get Started",
    findCentres: "Find Recycling Centres",
    home: "Home",
    learn: "Learn",
    pollution: "Pollution",
    assistant: "AI Assistant",
    finder: "Centre Finder",
    profile: "Profile",
    about: "About",
    contact: "Contact",
    rewards: "Rewards",
    challenges: "Challenges",
    leaderboard: "Leaderboard",
    settings: "Settings",
    admin: "Admin",
    dashboard: "Dashboard",
    userMgmt: "Users",
    centreMgmt: "Centres",
    qrCodes: "QR Codes",
    messages: "Messages",
    backToSite: "Back to Site",
  },
  ms: {
    tagline: "Kitar Semula Jadi Mudah, Pintar dan Berbaloi.",
    mission: "Menghubungkan Rakyat untuk Esok yang Lebih Hijau.",
    getStarted: "Mula Sekarang",
    findCentres: "Cari Pusat Kitar Semula",
    home: "Utama",
    learn: "Belajar",
    pollution: "Pencemaran",
    assistant: "Pembantu AI",
    finder: "Cari Pusat",
    profile: "Profil",
    about: "Tentang",
    contact: "Hubungi",
    rewards: "Ganjaran",
    challenges: "Cabaran",
    leaderboard: "Papan Pendahulu",
    settings: "Tetapan",
    admin: "Admin",
    dashboard: "Papan Pemuka",
    userMgmt: "Pengguna",
    centreMgmt: "Pusat",
    qrCodes: "Kod QR",
    messages: "Mesej",
    backToSite: "Kembali ke Laman",
  },
  zh: {
    tagline: "让回收变得简单、智能、有回报。",
    mission: "携手共创更绿色的明天。",
    getStarted: "立即开始",
    findCentres: "寻找回收中心",
    home: "首页",
    learn: "学习",
    pollution: "污染",
    assistant: "AI 助手",
    finder: "回收中心",
    profile: "个人",
    about: "关于",
    contact: "联系",
    rewards: "奖励",
    challenges: "挑战",
    leaderboard: "排行榜",
    settings: "设置",
    admin: "管理",
    dashboard: "仪表板",
    userMgmt: "用户",
    centreMgmt: "中心",
    qrCodes: "二维码",
    messages: "消息",
    backToSite: "返回网站",
  },
};

const I18nContext = createContext({ lang: "en", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("rc-lang") || "en");
  useEffect(() => {
    localStorage.setItem("rc-lang", lang);
  }, [lang]);
  const t = (key) => STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);