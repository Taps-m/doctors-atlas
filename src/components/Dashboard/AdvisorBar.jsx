import React, { useState } from "react";
import { Sparkles, Search, Send } from "lucide-react";
import { advisorPrompts } from "./data";

/**
 * AdvisorBar
 * Quick-ask chips + free-text input for the AI advisor.
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
    <div className="advisor-bar">
      <div className="advisor-bar__title">
        <Sparkles size={16} />
        AI ADVISOR – <span>Ask anything about your practice</span>
      </div>

      {advisorPrompts.map((prompt) => (
        <button
          key={prompt}
          className="chip"
          type="button"
          onClick={() => onAsk && onAsk(prompt)}
        >
          {prompt}
        </button>
      ))}

      <form className="ask-input" onSubmit={handleSubmit}>
        <Search size={14} color="#6b7a90" />
        <input
          placeholder="Type your question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button type="submit" aria-label="Send question">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
