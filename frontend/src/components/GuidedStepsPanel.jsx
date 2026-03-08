import React, { useState } from 'react';
import './GuidedStepsPanel.css';

const GuidedStepsPanel = ({ steps = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!steps || steps.length === 0) {
    return null;
  }

  if (!Array.isArray(steps)) {
    console.error('GuidedStepsPanel: steps is not an array', steps);
    return null;
  }

  const parseStep = (step) => {
    if (typeof step === 'string') {
      return { text: step };
    }
    return step;
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="guided-steps-panel">
      <div className="steps-header" onClick={toggleExpand}>
        <div className="steps-title">
          <span className="steps-icon">Steps</span>
          <span>Guided Steps</span>
          <span className="steps-count">({steps.length})</span>
        </div>
        <div className={`expand-arrow ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </div>
      </div>

      {isExpanded && (
        <div className="steps-container">
          {steps.map((step, index) => {
            const parsed = parseStep(step);
            return (
              <div key={index} className="step-item">
                <span className="step-number">{index + 1}</span>
                <span className="step-text">{parsed.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GuidedStepsPanel;
