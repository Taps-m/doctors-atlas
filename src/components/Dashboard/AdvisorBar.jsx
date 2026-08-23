import React, { useState } from "react";
import { Sparkles, Search, Send } from "lucide-react";
import { advisorPrompts } from "./data";

/**
 * AdvisorBar
 * Quick-ask chips + free-text input for the AI Advisor - the product's
 * headline feature, so it gets its own fully self-contained styling
 * (scoped class names + an inline <style> block) rather than leaning
 * on whatever ".advisor-bar" happens to mean in the shared stylesheet.
 * `onAsk(question)` fires for both chip clicks and manual submission.
 */
export default function AdvisorBar({ onAsk }) {
  const [question, setQuestion] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!question.trim()) return;
    onAsk && onAsk(question.trim());
    setQuestion("");
  }

  return (
    <div className="atlas-advisor">
      <style>{`
        .atlas-advisor {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          padding: 18px 22px;
          background: linear-gradient(135deg, #4338ca 0%, #6a5cf0 45%, #8b5cf6 100%);
          box-shadow: 0 8px 24px rgba(99, 91, 240, 0.28);
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 12px;
        }
        .atlas-advisor::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 85% -20%, rgba(255,255,255,0.35), transparent 55%);
          pointer-events: none;
        }
        .atlas-advisor__title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.04em;
          color: #fff;
          white-space: nowrap;
        }
        .atlas-advisor__badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.22);
          color: #fff;
          animation: atlas-pulse 2.4s ease-in-out infinite;
        }
        @keyframes atlas-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.35); }
          50% { box-shadow: 0 0 0 6px rgba(255,255,255,0); }
        }
        .atlas-advisor__title span {
          font-weight: 500;
          color: rgba(255, 255, 255, 0.85);
          letter-spacing: normal;
        }
        .atlas-advisor__chip {
          font-size: 12.5px;
          font-weight: 600;
          color: #fff;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.28);
          border-radius: 999px;
          padding: 7px 14px;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.15s ease;
          white-space: nowrap;
        }
        .atlas-advisor__chip:hover {
          background: rgba(255, 255, 255, 0.28);
          transform: translateY(-1px);
        }
        .atlas-advisor__form {
          flex: 1 1 260px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border-radius: 999px;
          padding: 9px 16px;
          box-shadow: 0 2px 10px rgba(30, 20, 80, 0.12);
        }
        .atlas-advisor__form input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 13.5px;
          color: #222;
          background: transparent;
        }
        .atlas-advisor__form input::placeholder {
          color: #94a0b4;
        }
        .atlas-advisor__send {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #4338ca, #8b5cf6);
          color: #fff;
          cursor: pointer;
          flex-shrink: 0;
          transition: transform 0.15s ease;
        }
        .atlas-advisor__send:hover {
          transform: scale(1.08);
        }
        @media (max-width: 640px) {
          .atlas-advisor { padding: 14px; }
          .atlas-advisor__form { flex-basis: 100%; }
        }
      `}</style>

      <div className="atlas-advisor__title">
        <span className="atlas-advisor__badge">
          <Sparkles size={14} />
        </span>
        AI ADVISOR <span>— ask anything about your practice</span>
      </div>

      {advisorPrompts.map((prompt) => (
        <button
          key={prompt}
          className="atlas-advisor__chip"
          type="button"
          onClick={() => onAsk && onAsk(prompt)}
        >
          {prompt}
        </button>
      ))}

      <form className="atlas-advisor__form" onSubmit={handleSubmit}>
        <Search size={14} color="#94a0b4" />
        <input
          placeholder="Type your question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button type="submit" className="atlas-advisor__send" aria-label="Send question">
          <Send size={13} />
        </button>
      </form>
    </div>
  );
}
