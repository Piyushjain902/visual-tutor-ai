import React from 'react';
import ExplanationCard from './ExplanationCard';
import GuidedStepsPanel from './GuidedStepsPanel';
import './LearningResponse.css';

const LearningResponse = ({
  response = {}
}) => {
  let explanation = null;
  let guidedSteps = [];
  let reflectionQuestion = null;

  try {
    if (response && typeof response === 'object') {
      explanation = response.explanation || null;
      guidedSteps = Array.isArray(response.guided_steps) ? response.guided_steps : [];
      reflectionQuestion = response.reflection_question || null;
    }
  } catch (e) {
    console.error('Error processing response in LearningResponse:', e);
    return <div className="error-message">Error processing response.</div>;
  }

  if (!explanation && guidedSteps.length === 0 && !reflectionQuestion) {
    return null;
  }

  return (
    <div className="learning-response-container">
      {explanation && <ExplanationCard explanation={explanation} isActive />}

      {guidedSteps.length > 0 && (
        <GuidedStepsPanel steps={guidedSteps} />
      )}

      {reflectionQuestion && (
        <div className="reflection-question-simple">
          <p className="reflection-label">A quick question</p>
          <p className="reflection-text">{reflectionQuestion}</p>
        </div>
      )}
    </div>
  );
};

export default LearningResponse;
