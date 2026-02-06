import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import '../styles/intake-for-kara.css';
import { INTAKE_FOR_KARA_QUESTIONS as QUESTIONS } from '../data/intakeForKaraQuestions';

// Sub-options for proteins that have them
const PROTEIN_SUB_OPTIONS = {
  'Pork': ['Bacon', 'Pork Belly', 'Sausage', 'Pulled Pork'],
  'Beef': ['Meatballs', 'Ground Beef', 'Carne Asada', 'Stew Meat'],
  'Fish/Seafood': ['Salmon', 'Trout', 'Smoked Fish', 'Walleye', 'Shrimp'],
};

const IntakeForKaraPage = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

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

  // For protein-picker: toggle selection and handle "everyday" logic
  const toggleProtein = (baseId, option) => {
    const selectedKey = `${baseId}_selected`;
    const everydayKey = `${baseId}_everyday`;
    const subKey = `${baseId}_sub_${option.toLowerCase().replace(/\//g, '_')}`;
    const current = Array.isArray(answers[selectedKey]) ? answers[selectedKey] : [];
    const isSelected = current.includes(option);
    
    if (isSelected) {
      // Remove from selected
      const next = current.filter((item) => item !== option);
      setAnswers((prev) => {
        const updated = { ...prev, [selectedKey]: next };
        // If this was an everyday pick, remove it from everyday array too
        const everydayArr = Array.isArray(prev[everydayKey]) ? prev[everydayKey] : [];
        updated[everydayKey] = everydayArr.filter((item) => item !== option);
        // Clear sub-options for this protein
        updated[subKey] = [];
        return updated;
      });
    } else {
      // Add to selected
      setAnswers((prev) => ({ ...prev, [selectedKey]: [...current, option] }));
    }
  };

  const toggleEverydayProtein = (baseId, option) => {
    const everydayKey = `${baseId}_everyday`;
    setAnswers((prev) => {
      const current = Array.isArray(prev[everydayKey]) ? prev[everydayKey] : [];
      const isEveryday = current.includes(option);
      const next = isEveryday
        ? current.filter((item) => item !== option)
        : [...current, option];
      return { ...prev, [everydayKey]: next };
    });
  };

  // Toggle sub-option for a protein
  const toggleSubOption = (baseId, protein, subOption) => {
    const subKey = `${baseId}_sub_${protein.toLowerCase().replace(/\//g, '_')}`;
    setAnswers((prev) => {
      const current = Array.isArray(prev[subKey]) ? prev[subKey] : [];
      const isSelected = current.includes(subOption);
      const next = isSelected
        ? current.filter((item) => item !== subOption)
        : [...current, subOption];
      return { ...prev, [subKey]: next };
    });
  };

  const isFieldComplete = (field) => {
    if (!field.required) return true;
    const value = getAnswer(field.id, field.type === 'checkbox' ? [] : '');
    if (field.type === 'checkbox') return Array.isArray(value) && value.length > 0;
    if (field.type === 'number') return value !== '' && !Number.isNaN(Number(value));
    if (field.id === 'email') return isValidEmail(value);
    return String(value || '').trim().length > 0;
  };

  const isQuestionComplete = (question) => {
    if (!question || question.type === 'intro') return true;
    
    // Group type: check all required fields
    if (question.type === 'group' && question.fields) {
      return question.fields.every((field) => isFieldComplete(field));
    }
    
    // Protein-picker: must have at least one selected and one everyday
    if (question.type === 'protein-picker') {
      const selected = getAnswer(`${question.id}_selected`, []);
      const everyday = getAnswer(`${question.id}_everyday`, '');
      if (!question.required) return true;
      return Array.isArray(selected) && selected.length > 0 && everyday !== '';
    }
    
    const value = getAnswer(question.id, question.type === 'checkbox' ? [] : '');
    if (!question.required) return true;
    if (question.type === 'checkbox') return Array.isArray(value) && value.length > 0;
    if (question.type === 'number') return value !== '' && !Number.isNaN(Number(value));
    if (question.id === 'email') return isValidEmail(value);
    return String(value || '').trim().length > 0;
  };

  // Allow navigation without restrictions
  const canGoNext = true;

  const submitForm = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch('/api/intake/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit form');
      }
      setSubmitted(true);
    } catch (err) {
      console.error('Form submission error:', err);
      setSubmitError(err.message);
      // Still show submitted state so they can see their answers
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!canGoNext) return;
    if (stepIndex < QUESTIONS.length - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      submitForm();
    }
  };

  const handleBack = () => {
    if (stepIndex === 0) return;
    setStepIndex((prev) => prev - 1);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      if (currentQuestion?.type === 'textarea' || currentQuestion?.type === 'group') return;
      event.preventDefault();
      handleNext();
    }
  };

  // Render a single field (used by group type and standalone)
  const renderField = (field, inGroup = false) => {
    const value = getAnswer(field.id, field.type === 'checkbox' ? [] : '');
    const wrapperClass = inGroup ? 'intake-group-field' : '';

    switch (field.type) {
      case 'text':
        return (
          <div key={field.id} className={wrapperClass}>
            {inGroup && <label className="intake-field-label">{field.label}{field.required && ' *'}</label>}
            <input
              className="intake-input"
              value={value}
              placeholder={field.placeholder || ''}
              onChange={(e) => updateAnswer(field.id, e.target.value)}
            />
          </div>
        );
      case 'date':
        return (
          <div key={field.id} className={wrapperClass}>
            {inGroup && <label className="intake-field-label">{field.label}{field.required && ' *'}</label>}
            <input
              className="intake-input intake-date"
              type="date"
              value={value}
              onChange={(e) => updateAnswer(field.id, e.target.value)}
            />
          </div>
        );
      case 'textarea':
        return (
          <div key={field.id} className={wrapperClass}>
            {inGroup && <label className="intake-field-label">{field.label}{field.required && ' *'}</label>}
            <textarea
              className="intake-textarea"
              rows={3}
              value={value}
              placeholder={field.placeholder || ''}
              onChange={(e) => updateAnswer(field.id, e.target.value)}
            />
          </div>
        );
      case 'radio':
        return (
          <div key={field.id} className={wrapperClass}>
            {inGroup && <label className="intake-field-label">{field.label}{field.required && ' *'}</label>}
            <div className="intake-choices intake-choices-compact">
              {field.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`intake-choice ${value === option ? 'is-selected' : ''}`}
                  onClick={() => updateAnswer(field.id, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );
      case 'checkbox':
        return (
          <div key={field.id} className={wrapperClass}>
            {inGroup && <label className="intake-field-label">{field.label}{field.required && ' *'}</label>}
            <div className="intake-choices intake-choices-compact">
              {field.options.map((option) => {
                const selected = Array.isArray(value) && value.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    className={`intake-choice ${selected ? 'is-selected' : ''}`}
                    onClick={() => toggleAnswer(field.id, option)}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Render protein-picker: checkbox grid with "everyday" toggle (multi-select)
  const renderProteinPicker = (question) => {
    const selectedKey = `${question.id}_selected`;
    const everydayKey = `${question.id}_everyday`;
    const selected = getAnswer(selectedKey, []);
    const everydayArr = getAnswer(everydayKey, []);

    return (
      <div className="intake-protein-picker">
        {question.options.map((protein) => {
          const isChecked = Array.isArray(selected) && selected.includes(protein);
          const isEveryday = Array.isArray(everydayArr) && everydayArr.includes(protein);
          const subOptions = PROTEIN_SUB_OPTIONS[protein];
          const subKey = `${question.id}_sub_${protein.toLowerCase().replace(/\//g, '_')}`;
          const selectedSubs = getAnswer(subKey, []);

          return (
            <div key={protein} className={`intake-protein-row ${isChecked ? 'is-selected' : ''}`}>
              <div className="intake-protein-row-main">
                <button
                  type="button"
                  className={`intake-protein-check ${isChecked ? 'is-checked' : ''}`}
                  onClick={() => toggleProtein(question.id, protein)}
                  aria-pressed={isChecked}
                >
                  <span className="intake-protein-checkbox">{isChecked ? '✓' : ''}</span>
                  <span className="intake-protein-label">{protein}</span>
                </button>
                {isChecked && (
                  <button
                    type="button"
                    className={`intake-protein-everyday ${isEveryday ? 'is-everyday' : ''}`}
                    onClick={() => toggleEverydayProtein(question.id, protein)}
                    aria-pressed={isEveryday}
                  >
                    {isEveryday ? '★ Every day' : '☆ Every day'}
                  </button>
                )}
              </div>
              {isChecked && subOptions && (
                <div className="intake-protein-sub-options">
                  {subOptions.map((sub) => {
                    const isSubSelected = Array.isArray(selectedSubs) && selectedSubs.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        className={`intake-protein-sub ${isSubSelected ? 'is-selected' : ''}`}
                        onClick={() => toggleSubOption(question.id, protein, sub)}
                        aria-pressed={isSubSelected}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderInput = () => {
    if (!currentQuestion || currentQuestion.type === 'intro') return null;

    // Group type: render all fields together
    if (currentQuestion.type === 'group' && currentQuestion.fields) {
      return (
        <div className="intake-group">
          {currentQuestion.fields.map((field) => renderField(field, true))}
        </div>
      );
    }

    // Protein-picker type
    if (currentQuestion.type === 'protein-picker') {
      return renderProteinPicker(currentQuestion);
    }

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
          <title>Meal Plan for Kara | Done</title>
        </Helmet>
        <div className="intake-kara-shell">
          <div className="intake-kara-card intake-kara-success">
            <h1>Thanks, Kara!</h1>
            {submitError ? (
              <p className="intake-kara-error">
                There was an issue sending the form, but your responses are saved below.
                Please email us at dataweston@gmail.com with any questions.
              </p>
            ) : (
              <p>Your intake form has been submitted! We&apos;ll be in touch soon to finalize your meal plan.</p>
            )}
            <button type="button" className="intake-primary" onClick={() => { setSubmitted(false); setStepIndex(0); }}>
              Start Over
            </button>
          </div>
          <div className="intake-kara-summary">
            <h3>Your Responses</h3>
            <pre>{JSON.stringify(answers, null, 2)}</pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="intake-kara">
      <Helmet>
        <title>Meal Plan for Kara</title>
        <meta name="description" content="Meal preference intake form for Kara." />
      </Helmet>

      <div className="intake-kara-shell">
        <aside className="intake-kara-aside">
          <div className="intake-kara-aside-badge">Intake</div>
          <h2>Meal Plan for Kara</h2>
          <p>Getting to know Kara & Dad&apos;s preferences for your first weeks with baby.</p>
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
                    disabled={!canGoNext || submitting}
                  >
                    {submitting ? 'Submitting...' : stepIndex === QUESTIONS.length - 1 ? 'Submit' : 'Next'}
                  </button>
                </div>
                <div className="intake-kara-footnote">Optional</div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default IntakeForKaraPage;
