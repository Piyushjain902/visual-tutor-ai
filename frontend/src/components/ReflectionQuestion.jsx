import React, { useState } from 'react';
import './ReflectionQuestion.css';

const ReflectionQuestion = ({
  question,
  onSubmitAnswer = () => {},
  activeSimulation = null,
  isLoading = false
}) => {
  const [answerText, setAnswerText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  if (!question) return null;

  const handleSubmit = () => {
    if (!answerText.trim()) {
      alert('Please provide an answer to the reflection question.');
      return;
    }

    onSubmitAnswer({
      answer: answerText,
      activeSimulation,
      timestamp: Date.now()
    });

    setSubmitted(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <div className="reflection-question-panel">
      <div className="reflection-header">
        <span className="reflection-icon">Q</span>
        <span className="reflection-title">Reflection and Analysis</span>
      </div>

      <div className="reflection-content">
        <div className="question-box">
          <p className="question-text">{question}</p>
          <p className="question-hint">Think carefully based on what you observed in the simulation.</p>
        </div>

        <div className="answer-input-section">
          <textarea
            className="answer-textarea"
            placeholder="Type your answer here... (Ctrl+Enter to submit)"
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading || submitted}
            rows={4}
          />

          <div className="answer-controls">
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={isLoading || !answerText.trim() || submitted}
            >
              {isLoading ? 'Evaluating...' : submitted ? 'Submitted' : 'Submit Answer'}
            </button>

            {submitted && (
              <button
                className="new-answer-btn"
                onClick={() => {
                  setAnswerText('');
                  setSubmitted(false);
                  setEvaluation(null);
                }}
              >
                Try Again
              </button>
            )}
          </div>

          {evaluation && (
            <div className={`evaluation-feedback ${evaluation.correct ? 'correct' : 'needs-work'}`}>
              <div className="evaluation-header">
                {evaluation.correct ? (
                  <>
                    <span className="eval-icon">OK</span>
                    <span>Excellent thinking</span>
                  </>
                ) : (
                  <>
                    <span className="eval-icon">Hint</span>
                    <span>Refine your understanding</span>
                  </>
                )}
              </div>
              <p className="evaluation-message">{evaluation.feedback}</p>
            </div>
          )}
        </div>
      </div>

      <div className="reflection-footer" />
    </div>
  );
};

export default ReflectionQuestion;
