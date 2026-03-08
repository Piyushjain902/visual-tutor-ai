import React, { useState, useRef, useEffect } from 'react';
import LearningResponse from './LearningResponse';
import './ChatPanel.css';

const ChatPanel = ({ onSendMessage, messages = [], onReflectionAnswer = () => {} }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random()}`);
  const chatBodyRef = useRef(null);

  useEffect(() => {
    // Intentionally no auto-scroll for guided reading flow.
  }, [messages]);

  const simulationKeywords = {
    faraday: {
      keywords: ['electromagnetic induction', 'faraday', "faraday's law", 'magnetic field', 'induced current', 'emf'],
      url: '/phet/faradays-law_en.html',
      name: "Faraday's Law"
    },
    buoyancy: {
      keywords: ['buoyancy', 'buoyant force', 'density', 'archimedes', 'floating', 'sinking', 'fluid'],
      url: '/phet/buoyancy-basics_en.html',
      name: 'Buoyancy Basics'
    },
    kepler: {
      keywords: ['kepler', "kepler's law", 'planetary motion', 'orbits', 'orbital mechanics', 'planet', 'celestial'],
      url: '/phet/keplers-laws_en.html',
      name: "Kepler's Laws"
    }
  };

  const detectSimulation = (userMessage) => {
    const lowerMessage = userMessage.toLowerCase();

    for (const sim of Object.values(simulationKeywords)) {
      for (const keyword of sim.keywords) {
        if (lowerMessage.includes(keyword)) {
          return sim;
        }
      }
    }

    return null;
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);

    const userMessage = input;
    const detectedSim = detectSimulation(input);

    try {
      const res = await fetch('http://visualtutorai-env.eba-2gf3fan7.ap-southeast-2.elasticbeanstalk.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, guidedMode: true, sessionId })
      });

      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`API Error ${res.status}: ${errorData}`);
      }

      const data = await res.json();
      if (onSendMessage) {
        onSendMessage(userMessage, data, detectedSim);
      }
    } catch (e) {
      console.error('Chat error:', e);
      const errorMessage = e.message || 'Failed to fetch response from server.';
      if (onSendMessage) {
        onSendMessage(userMessage, { error: errorMessage, details: e.toString() }, detectedSim);
      }
    }

    setLoading(false);
    setInput('');
  };

  return (
    <div className="chat-panel-modern">
      <div className="chat-header">
        <div className="chat-header-left">
          <span className="chat-title">Visual Tutor AI</span>
          <span className="chat-subtitle">Guided concept learning with simulations</span>
        </div>
      </div>

      <div className="chat-body" ref={chatBodyRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={msg.type === 'user' ? 'user-message' : 'bot-message'}>
            {msg.type === 'user' ? (
              <div className="message-content user-message-text">{msg.content}</div>
            ) : msg.content ? (
              msg.content.explanation || msg.content.guided_steps ? (
                <LearningResponse
                  response={msg.content}
                  activeSimulation={msg.content.simulation}
                  onReflectionAnswer={onReflectionAnswer}
                  sessionId={sessionId}
                />
              ) : (
                <div className="plain-response">
                  {msg.content.error
                    ? msg.content.error
                    : msg.content.response ||
                      msg.content.overview ||
                      (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2))}
                </div>
              )
            ) : (
              <div className="plain-response">Unknown response</div>
            )}
          </div>
        ))}
      </div>

      <div className="chat-input-row">
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the simulation..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          disabled={loading}
        />
        <button className="send-btn" onClick={handleSend} disabled={loading}>
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
