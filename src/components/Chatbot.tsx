import React, { useState, useRef, useEffect } from "react";

const CHATBOT_API = "http://localhost:5000/api/chatbot";

interface Message {
  sender: "user" | "bot";
  text: string;
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  
  const sendMessage = async () => {
    if (!input.trim()) return;
    setMessages((msgs) => [...msgs, { sender: "user", text: input }]);
    setLoading(true);
    try {
      const res = await fetch(CHATBOT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      setMessages((msgs) => [...msgs, { sender: "bot", text: data.response }]);
    } catch (err) {
      setMessages((msgs) => [
        ...msgs,
        { sender: "bot", text: "Shipmate: Error connecting to chatbot API." },
      ]);
    }
    setInput("");
    setLoading(false);
  };

  return (
    <>
      {/* Floating button */}
      <div
        style={{
          position: "fixed",
          top: 24,
          right: 24,
          zIndex: 1000,
        }}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            background: "#0074D9",
            color: "#fff",
            borderRadius: "50%",
            width: 56,
            height: 56,
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            border: "none",
            fontSize: 28,
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          aria-label="Open Shipmate Chatbot"
        >
          💬
        </button>
      </div>

      {/* Chat window */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: 90,
            right: 24,
            width: 350,
            maxHeight: 500,
            background: "rgba(255,255,255,0.98)",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            zIndex: 1001,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "fadeIn 0.3s",
          }}
        >
          <div style={{ padding: "16px 16px 8px 16px", background: "#0074D9", color: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <strong>Shipmate</strong> <span style={{ fontSize: 18 }}>🛳</span>
            <button
              onClick={() => setOpen(false)}
              style={{
                float: "right",
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: 22,
                cursor: "pointer",
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div style={{ flex: 1, padding: 16, overflowY: "auto", background: "#f7f9fa" }}>
            {messages.length === 0 && (
              <div style={{ color: "#888", marginBottom: 12 }}>
                <em>Ask Shipmate about weather, alerts, advice, or history anywhere in the world!</em>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 10, whiteSpace: "pre-line" }}>
                <div
                  style={{
                    background: m.sender === "user" ? "#e3f2fd" : "#d1f7c4",
                    color: "#222",
                    borderRadius: 8,
                    padding: "8px 12px",
                    maxWidth: "80%",
                    alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <strong>{m.sender === "user" ? "You" : "Shipmate"}:</strong> {m.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding: 12, borderTop: "1px solid #eee", background: "#fff" }}>
            <input
              style={{
                width: "75%",
                padding: 8,
                borderRadius: 8,
                border: "1px solid #ccc",
                marginRight: 8,
                color: "#000", // <-- Added this line
              }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message..."
              disabled={loading}
            />

            <button
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                background: "#0074D9",
                color: "#fff",
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
              }}
              onClick={sendMessage}
              disabled={loading}
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
      {/* Simple fade-in animation */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px);}
            to { opacity: 1; transform: translateY(0);}
          }
        `}
      </style>
    </>
  );
}