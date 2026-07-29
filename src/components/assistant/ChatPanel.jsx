import React, { useState } from "react";
import { Send, Loader2, Leaf } from "lucide-react";

const SUGGESTIONS = [
  "Can I recycle bubble wrap?",
  "Where do I recycle batteries?",
  "Can pizza boxes be recycled?",
  "How do I dispose of used cooking oil?",
];

export default function ChatPanel() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hi! I'm your Eco Assistant. Ask me anything about recycling in Malaysia." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async (question) => {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120000);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: question }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      if (data.error) {
        setMessages((m) => [...m, { role: "ai", text: "I'm having trouble finding an answer right now. Please try again in a moment." }]);
      } else {
        setMessages((m) => [...m, { role: "ai", text: data.answer }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Still working on it — please wait a moment and try again." }]);
    }
    setLoading(false);
  };

  return (
    <div className="glass orbital soft-shadow p-8 flex flex-col h-[640px]">
      <h2 className="text-2xl font-semibold">Eco Assistant chat</h2>

      <div className="mt-5 flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((m, i) => (
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
            <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => ask(s)} className="text-xs px-3 py-1.5 rounded-full glass hover:bg-primary/10">
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
        className="mt-4 flex gap-2"
      >
        <label htmlFor="chat-input" className="sr-only">Ask a recycling question</label>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a recycling question…"
          className="flex-1 h-13 px-5 py-3 rounded-full bg-background border border-border focus:border-primary"
        />
        <button type="submit" aria-label="Send question" className="h-12 w-12 shrink-0 rounded-full bg-primary text-primary-foreground grid place-items-center hover:brightness-110 active:scale-95 transition">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
