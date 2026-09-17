import React, { useState } from "react";
import { Send, Loader2, Leaf } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const SUGGESTION_KEYS = ["aiSug1", "aiSug2", "aiSug3", "aiSug4"];

export default function ChatPanel() {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState([{ role: "ai", text: t("aiGreeting"), greeted: lang }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // If the user switches language mid-chat, greet in the new language once.
  const visibleMessages =
    messages.length > 0 && messages[0].greeted && messages[0].greeted !== lang
      ? [{ role: "ai", text: t("aiGreeting"), greeted: lang }, ...messages.slice(1)]
      : messages;

  const ask = async (question) => {
    if (!question.trim() || loading) return;
    const useLang = localStorage.getItem("rc-lang") || lang || "en";
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120000);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: question, lang: useLang }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      if (data.error) {
        setMessages((m) => [...m, { role: "ai", text: t("aiErrBusy") }]);
      } else {
        setMessages((m) => [...m, { role: "ai", text: data.answer }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "ai", text: t("aiErrRetry") }]);
    }
    setLoading(false);
  };

  return (
    <div className="glass orbital soft-shadow p-8 flex flex-col h-[640px]">
      <h2 className="text-2xl font-semibold">{t("aiChatTitle")}</h2>

      <div className="mt-5 flex-1 overflow-y-auto space-y-4 pr-1">
        {visibleMessages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "ai" && (
              <span className="h-9 w-9 shrink-0 rounded-2xl bg-primary grid place-items-center">
                <Leaf className="w-4 h-4 text-primary-foreground" />
              </span>
            )}
            <p
              className={`max-w-[80%] rounded-3xl px-5 py-3 text-sm whitespace-pre-line ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {m.text}
            </p>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> {t("aiThinking")}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTION_KEYS.map((k) => (
          <button key={k} type="button" onClick={() => ask(t(k))} className="text-xs px-3 py-1.5 rounded-full glass hover:bg-primary/10">
            {t(k)}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
        className="mt-4 flex gap-2"
      >
        <label htmlFor="chat-input" className="sr-only">{t("aiPlaceholder")}</label>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("aiPlaceholder")}
          className="flex-1 h-13 px-5 py-3 rounded-full bg-background border border-border focus:border-primary"
        />
        <button type="submit" aria-label={t("aiPlaceholder")} className="h-12 w-12 shrink-0 rounded-full bg-primary text-primary-foreground grid place-items-center hover:brightness-110 active:scale-95 transition">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
