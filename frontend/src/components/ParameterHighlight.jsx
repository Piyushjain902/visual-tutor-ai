import React, { useEffect, useState } from 'react';
import './ParameterHighlight.css';

const ParameterHighlight = ({ currentStep = null }) => {
  const [parameterHints, setParameterHints] = useState([]);

  useEffect(() => {
    if (!currentStep) {
      setParameterHints([]);
      return;
    }

    const stepText = typeof currentStep === 'string' ? currentStep : currentStep.text || '';
    const hints = [];

    const parameterMap = {
      magnet: {
        icon: 'M',
        label: 'Magnet Position',
        hint: 'Move the magnet in the simulation.',
        color: 'magnetic'
      },
      angle: {
        icon: 'A',
        label: 'Angle Control',
        hint: 'Adjust the angle using the slider.',
        color: 'angle'
      },
      density: {
        icon: 'D',
        label: 'Density Control',
        hint: 'Modify the object density.',
        color: 'density'
      },
      velocity: {
        icon: 'V',
        label: 'Velocity Control',
        hint: 'Adjust the initial velocity.',
        color: 'velocity'
      },
      force: {
        icon: 'F',
        label: 'Force Control',
        hint: 'Increase or decrease applied force.',
        color: 'force'
      },
      rotation: {
        icon: 'R',
        label: 'Rotation Control',
        hint: 'Rotate the object or system.',
        color: 'rotation'
      },
      switch: {
        icon: 'S',
        label: 'Toggle Switch',
        hint: 'Turn the switch on or off.',
        color: 'switch'
      }
    };

    Object.entries(parameterMap).forEach(([key, value]) => {
      if (stepText.toLowerCase().includes(key)) {
        hints.push(value);
      }
    });

    setParameterHints(hints);
  }, [currentStep]);

  if (!parameterHints.length) {
    return null;
  }

  return (
    <div className="parameter-highlight-container">
      <div className="highlight-header">
        <span className="highlight-icon">i</span>
        <span>Controls to interact with</span>
      </div>
      <div className="parameter-hints">
        {parameterHints.map((hint, idx) => (
          <div key={idx} className={`parameter-hint ${hint.color}`}>
            <span className="hint-icon">{hint.icon}</span>
            <div className="hint-content">
              <div className="hint-label">{hint.label}</div>
              <div className="hint-text">{hint.hint}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParameterHighlight;
