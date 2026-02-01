import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import '../styles/intake-for-kara.css';
import { INTAKE_FOR_KARA_QUESTIONS as QUESTIONS } from '../data/intakeForKaraQuestions';

const IntakeForKaraPage = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = QUESTIONS[stepIndex];
  const totalSteps = QUESTIONS.length - 1;
  const progress = Math.max(0, Math.min(1, stepIndex / totalSteps));

  const isValidEmail = (value) => /.+@.+\..+/.test((value || '').trim());

  const getAnswer = (id, fallback = '') => (answers[id] !== undefined ? answers[id] : fallback);

  const updateAnswer = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const toggleAnswer = (id, option) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[id]) ? prev[id] : [];
      const next = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option];
      return { ...prev, [id]: next };
    });
  };

  const isQuestionComplete = (question) => {
    if (!question || question.type === 'intro') return true;
    const value = getAnswer(question.id, question.type === 'checkbox' ? [] : '');
    if (!question.required) return true;
    if (question.type === 'checkbox') return Array.isArray(value) && value.length > 0;
    if (question.type === 'number') return value !== '' && !Number.isNaN(Number(value));
    if (question.id === 'email') return isValidEmail(value);
    return String(value || '').trim().length > 0;
  };

  const canGoNext = useMemo(() => isQuestionComplete(currentQuestion), [currentQuestion, answers]);

  const handleNext = () => {
    if (!canGoNext) return;
    if (stepIndex < QUESTIONS.length - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      setSubmitted(true);
    }
  };

  const handleBack = () => {
    if (stepIndex === 0) return;
    setStepIndex((prev) => prev - 1);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      if (currentQuestion?.type === 'textarea') return;
      event.preventDefault();
      handleNext();
    }
  };

  const renderInput = () => {
    if (!currentQuestion || currentQuestion.type === 'intro') return null;
    const value = getAnswer(currentQuestion.id, currentQuestion.type === 'checkbox' ? [] : '');

    switch (currentQuestion.type) {
      case 'text':
        return (
          <input
            className="intake-input"
            value={value}
            placeholder={currentQuestion.placeholder || ''}
            onChange={(e) => updateAnswer(currentQuestion.id, e.target.value)}
            onKeyDown={handleKeyDown}
          />
        );
      case 'number':
        return (
          <input
            className="intake-input"
            type="number"
            min={currentQuestion.min}
            value={value}
            placeholder={currentQuestion.placeholder || ''}
            onChange={(e) => updateAnswer(currentQuestion.id, e.target.value)}
            onKeyDown={handleKeyDown}
          />
        );
      case 'textarea':
        return (
          <textarea
            className="intake-textarea"
            rows={4}
            value={value}
            placeholder={currentQuestion.placeholder || ''}
            onChange={(e) => updateAnswer(currentQuestion.id, e.target.value)}
          />
        );
      case 'radio':
        return (
          <div className="intake-choices">
            {currentQuestion.options.map((option) => (
              <button
                key={option}
                type="button"
                className={`intake-choice ${value === option ? 'is-selected' : ''}`}
                onClick={() => updateAnswer(currentQuestion.id, option)}
              >
                {option}
              </button>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="intake-choices">
            {currentQuestion.options.map((option) => {
              const selected = Array.isArray(value) && value.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  className={`intake-choice ${selected ? 'is-selected' : ''}`}
                  onClick={() => toggleAnswer(currentQuestion.id, option)}
                >
                  {option}
                </button>
              );
            })}
          </div>
        );
      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <div className="intake-kara">
        <Helmet>
          <title>Intake For Kara | Done</title>
        </Helmet>
        <div className="intake-kara-shell">
          <div className="intake-kara-card intake-kara-success">
            <h1>Thanks, Kara.</h1>
            <p>Your demo intake is complete. You can update the questions and content anytime.</p>
            <button type="button" className="intake-primary" onClick={() => setSubmitted(false)}>
              Review responses
            </button>
          </div>
          <div className="intake-kara-summary">
            <pre>{JSON.stringify(answers, null, 2)}</pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="intake-kara">
      <Helmet>
        <title>Intake For Kara</title>
        <meta name="description" content="Meal preference and family size intake form." />
      </Helmet>

      <div className="intake-kara-shell">
        <aside className="intake-kara-aside">
          <div className="intake-kara-aside-badge">Intake</div>
          <h2>Meal preferences + family size</h2>
          <p>Single-question flow with quick transitions, inspired by Typeform.</p>
          <div className="intake-kara-progress">
            <div className="intake-kara-progress-label">
              Step {Math.min(stepIndex, totalSteps)} of {totalSteps}
            </div>
            <div className="intake-kara-progress-bar">
              <div
                className="intake-kara-progress-fill"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
          <div className="intake-kara-aside-note">
            Tip: Press Enter to continue on short answers.
          </div>
        </aside>

        <main className="intake-kara-main">
          <div className="intake-kara-card">
            {currentQuestion.type === 'intro' ? (
              <>
                <div className="intake-kara-tag">{currentQuestion.category}</div>
                <h1>{currentQuestion.title}</h1>
                <p>{currentQuestion.prompt}</p>
                <div className="intake-kara-helper">{currentQuestion.helper}</div>
                <button type="button" className="intake-primary" onClick={handleNext}>
                  Start
                </button>
              </>
            ) : (
              <>
                <div className="intake-kara-tag">{currentQuestion.category}</div>
                <div className="intake-kara-question">{currentQuestion.prompt}</div>
                {currentQuestion.helper && (
                  <div className="intake-kara-helper">{currentQuestion.helper}</div>
                )}
                {renderInput()}
                <div className="intake-kara-actions">
                  <button type="button" className="intake-secondary" onClick={handleBack}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="intake-primary"
                    onClick={handleNext}
                    disabled={!canGoNext}
                  >
                    {stepIndex === QUESTIONS.length - 1 ? 'Finish' : 'Next'}
                  </button>
                </div>
                <div className="intake-kara-footnote">
                  {currentQuestion.required ? 'Required' : 'Optional'}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default IntakeForKaraPage;
