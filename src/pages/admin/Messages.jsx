import React, { useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Mail, Trash2, RefreshCw, Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const fetch = async () => {
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
    if (err) setError(err.message);
    else if (data) setMessages(data);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const remove = async (id) => {
    await supabase.from('feedback').delete().eq('id', id);
    setMessages((m) => m.filter((x) => x.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground mt-1">Contact form submissions</p>
        </div>
        <button onClick={fetch} className="h-10 px-4 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 hover:brightness-110">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : error ? (
        <div className="text-center py-20 text-destructive">{error}</div>
      ) : messages.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">No messages yet.</div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className="glass orbital p-5 rounded-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{m.name}</span>
                    <a href={`mailto:${m.email}`} className="text-sm text-primary hover:underline truncate">{m.email}</a>
                  </div>
                  {m.subject && <p className="text-sm font-medium text-foreground/80">{m.subject}</p>}
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{m.message}</p>
                  <p className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</p>
                </div>
                <button onClick={() => remove(m.id)} aria-label="Delete" className="h-8 w-8 shrink-0 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive grid place-items-center">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
