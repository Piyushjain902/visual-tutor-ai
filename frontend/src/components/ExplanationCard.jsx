import React, { useState, useEffect } from 'react';
import StreamingText from './StreamingText';
import './ExplanationCard.css';

const ExplanationCard = ({ explanation }) => {
  const [formattedExplanation, setFormattedExplanation] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      if (!explanation) return;

      let formatted = explanation;
      // Force paragraph-style explanation (no bullet list rendering)
      formatted = formatted
        .replace(/^[\s]*[•*-]\s+/gm, '')
        .replace(/^\s*\d+[\.)]\s+/gm, '')
        .trim();

      if (typeof formatted === 'string') {
        formatted = formatted.split(/\\n|[\n]/).join('\n');

        // Convert to readable scan blocks: exactly 3 lines, then 2, then 2.
        const sentences = formatted
          .replace(/\s+/g, ' ')
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.trim())
          .filter(Boolean);

        if (sentences.length > 0) {
          const blocks = [];
          const patterns = [3, 2, 2];
          const limited = sentences.slice(0, 7);
          let cursor = 0;

          for (const size of patterns) {
            if (cursor >= limited.length) break;
            const chunk = limited.slice(cursor, cursor + size);
            blocks.push(chunk.join('  \n'));
            cursor += size;
          }

          formatted = blocks.join('\n\n');
        }
      }

      setFormattedExplanation(formatted);
    } catch (e) {
      console.error('Error in ExplanationCard:', e);
      setError(`Error formatting explanation: ${e.message}`);
    }
  }, [explanation]);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!explanation) return null;

  return (
    <div className="explanation-card">
      <StreamingText text={formattedExplanation} />
    </div>
  );
};

export default ExplanationCard;
