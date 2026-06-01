import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MEAL_PREP_INTAKE_QUESTIONS as QUESTIONS } from '../data/mealPrepIntakeQuestions';
import '../styles/meal-prep-intake.css';

const PROTEIN_SUB_OPTIONS = {
  Pork: ['Bacon', 'Pork Belly', 'Sausage', 'Pulled Pork'],
  Beef: ['Meatballs', 'Ground Beef', 'Carne Asada', 'Stew Meat'],
  'Fish/Seafood': ['Salmon', 'Trout', 'Smoked Fish', 'Walleye', 'Shrimp'],
};

const optionKey = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const formatLabel = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const formatDisplayValue = (value) => {
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'None selected';
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, nestedValue]) => `${formatLabel(key)}: ${formatDisplayValue(nestedValue)}`)
      .join('; ');
  }
  return String(value || '-');
};

const MealPrepIntakePage = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [validationMessage, setValidationMessage] = useState('');

  const currentQuestion = QUESTIONS[stepIndex];
  const totalSteps = QUESTIONS.length - 1;
  const progress = Math.max(0, Math.min(1, stepIndex / totalSteps));

  const answeredEntries = useMemo(
    () => Object.entries(answers).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (value && typeof value === 'object') return Object.keys(value).length > 0;
      return String(value || '').trim().length > 0;
    }),
    [answers],
  );

  const getAnswer = (id, fallback = '') => (answers[id] !== undefined ? answers[id] : fallback);

  const updateAnswer = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setValidationMessage('');
  };

  const toggleAnswer = (id, option) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[id]) ? prev[id] : [];
      const next = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option];
      return { ...prev, [id]: next };
    });
    setValidationMessage('');
  };

  const toggleProtein = (baseId, option) => {
    const selectedKey = `${baseId}_selected`;
    const everydayKey = `${baseId}_everyday`;
    const subKey = `${baseId}_sub_${optionKey(option)}`;

    setAnswers((prev) => {
      const current = Array.isArray(prev[selectedKey]) ? prev[selectedKey] : [];
      const isSelected = current.includes(option);
      if (!isSelected) return { ...prev, [selectedKey]: [...current, option] };

      const everyday = Array.isArray(prev[everydayKey]) ? prev[everydayKey] : [];
      return {
        ...prev,
        [selectedKey]: current.filter((item) => item !== option),
        [everydayKey]: everyday.filter((item) => item !== option),
        [subKey]: [],
      };
    });
    setValidationMessage('');
  };

  const toggleEverydayProtein = (baseId, option) => {
    const everydayKey = `${baseId}_everyday`;
    setAnswers((prev) => {
      const current = Array.isArray(prev[everydayKey]) ? prev[everydayKey] : [];
      const next = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option];
      return { ...prev, [everydayKey]: next };
    });
  };

  const toggleSubOption = (baseId, protein, subOption) => {
    const subKey = `${baseId}_sub_${optionKey(protein)}`;
    setAnswers((prev) => {
      const current = Array.isArray(prev[subKey]) ? prev[subKey] : [];
      const next = current.includes(subOption)
        ? current.filter((item) => item !== subOption)
        : [...current, subOption];
      return { ...prev, [subKey]: next };
    });
  };

  const isValidEmail = (value) => /.+@.+\..+/.test((value || '').trim());

  const isFieldComplete = (field) => {
    if (!field.required) return true;
    const value = getAnswer(field.id, field.type === 'checkbox' ? [] : '');
    if (field.type === 'checkbox') return Array.isArray(value) && value.length > 0;
    if (field.id === 'email') return isValidEmail(value);
    return String(value || '').trim().length > 0;
  };

  const getMissingRequiredLabel = (question) => {
    if (!question || question.type === 'intro') return '';
    if (question.type === 'group') {
      const missing = question.fields.find((field) => !isFieldComplete(field));
      return missing ? missing.label : '';
    }
    return '';
  };

  const submitForm = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch('/api/intake/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...answers,
          intake_type: 'meal-prep-intake',
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || 'Failed to submit intake');
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    const missing = getMissingRequiredLabel(currentQuestion);
    if (missing) {
      setValidationMessage(`${missing} is required before continuing.`);
      return;
    }

    if (stepIndex < QUESTIONS.length - 1) {
      setStepIndex((prev) => prev + 1);
      setValidationMessage('');
    } else {
      submitForm();
    }
  };

  const handleBack = () => {
    if (stepIndex === 0) return;
    setStepIndex((prev) => prev - 1);
    setValidationMessage('');
  };

  const renderField = (field) => {
    const value = getAnswer(field.id, field.type === 'checkbox' ? [] : '');

    switch (field.type) {
      case 'text':
        return (
          <div key={field.id} className="meal-prep-intake-field">
            <label className="meal-prep-intake-label" htmlFor={field.id}>
              {field.label}{field.required ? ' *' : ''}
            </label>
            <input
              id={field.id}
              className="meal-prep-intake-input"
              value={value}
              placeholder={field.placeholder || ''}
              onChange={(event) => updateAnswer(field.id, event.target.value)}
            />
          </div>
        );
      case 'date':
        return (
          <div key={field.id} className="meal-prep-intake-field">
            <label className="meal-prep-intake-label" htmlFor={field.id}>
              {field.label}{field.required ? ' *' : ''}
            </label>
            <input
              id={field.id}
              className="meal-prep-intake-input"
              type="date"
              value={value}
              onChange={(event) => updateAnswer(field.id, event.target.value)}
            />
          </div>
        );
      case 'textarea':
        return (
          <div key={field.id} className="meal-prep-intake-field">
            <label className="meal-prep-intake-label" htmlFor={field.id}>
              {field.label}{field.required ? ' *' : ''}
            </label>
            <textarea
              id={field.id}
              className="meal-prep-intake-textarea"
              rows={3}
              value={value}
              placeholder={field.placeholder || ''}
              onChange={(event) => updateAnswer(field.id, event.target.value)}
            />
          </div>
        );
      case 'radio':
        return (
          <div key={field.id} className="meal-prep-intake-field">
            <div className="meal-prep-intake-label">{field.label}{field.required ? ' *' : ''}</div>
            <div className="meal-prep-intake-choices compact">
              {field.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`meal-prep-intake-choice ${value === option ? 'is-selected' : ''}`}
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
          <div key={field.id} className="meal-prep-intake-field">
            <div className="meal-prep-intake-label">{field.label}{field.required ? ' *' : ''}</div>
            <div className="meal-prep-intake-choices compact">
              {field.options.map((option) => {
                const selected = Array.isArray(value) && value.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    className={`meal-prep-intake-choice ${selected ? 'is-selected' : ''}`}
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

  const renderProteinPicker = (question) => {
    const selected = getAnswer(`${question.id}_selected`, []);
    const everyday = getAnswer(`${question.id}_everyday`, []);

    return (
      <div className="meal-prep-intake-proteins">
        {question.options.map((protein) => {
          const isSelected = Array.isArray(selected) && selected.includes(protein);
          const isEveryday = Array.isArray(everyday) && everyday.includes(protein);
          const subOptions = PROTEIN_SUB_OPTIONS[protein] || [];
          const selectedSubs = getAnswer(`${question.id}_sub_${optionKey(protein)}`, []);

          return (
            <div key={protein} className={`meal-prep-intake-protein ${isSelected ? 'is-selected' : ''}`}>
              <div className="meal-prep-intake-protein-main">
                <button
                  type="button"
                  className={`meal-prep-intake-protein-check ${isSelected ? 'is-checked' : ''}`}
                  onClick={() => toggleProtein(question.id, protein)}
                  aria-pressed={isSelected}
                >
                  <span className="meal-prep-intake-checkbox">{isSelected ? 'x' : ''}</span>
                  <span>{protein}</span>
                </button>
                {isSelected && (
                  <button
                    type="button"
                    className={`meal-prep-intake-everyday ${isEveryday ? 'is-selected' : ''}`}
                    onClick={() => toggleEverydayProtein(question.id, protein)}
                    aria-pressed={isEveryday}
                  >
                    {isEveryday ? 'Everyday staple' : 'Mark as staple'}
                  </button>
                )}
              </div>
              {isSelected && subOptions.length > 0 && (
                <div className="meal-prep-intake-suboptions">
                  {subOptions.map((subOption) => {
                    const isSubSelected = Array.isArray(selectedSubs) && selectedSubs.includes(subOption);
                    return (
                      <button
                        key={subOption}
                        type="button"
                        className={`meal-prep-intake-suboption ${isSubSelected ? 'is-selected' : ''}`}
                        onClick={() => toggleSubOption(question.id, protein, subOption)}
                        aria-pressed={isSubSelected}
                      >
                        {subOption}
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
    if (currentQuestion.type === 'group') {
      return <div className="meal-prep-intake-group">{currentQuestion.fields.map(renderField)}</div>;
    }
    if (currentQuestion.type === 'protein-picker') return renderProteinPicker(currentQuestion);
    return null;
  };

  if (submitted) {
    return (
      <div className="meal-prep-intake">
        <Helmet>
          <title>Meal Prep Intake | Submitted</title>
        </Helmet>
        <div className="meal-prep-intake-shell single">
          <main className="meal-prep-intake-main">
            <div className="meal-prep-intake-card success">
              <div className="meal-prep-intake-tag">Submitted</div>
              <h1>Thanks for the details.</h1>
              {submitError ? (
                <p className="meal-prep-intake-error">
                  We could not send the intake automatically. Your responses are shown below so they can still be recovered.
                </p>
              ) : (
                <p>We have your intake and will follow up with next steps for your first meal plan.</p>
              )}
              <button
                type="button"
                className="meal-prep-intake-primary"
                onClick={() => {
                  setSubmitted(false);
                  setStepIndex(0);
                  setSubmitError(null);
                }}
              >
                Start Over
              </button>
            </div>
            <div className="meal-prep-intake-summary">
              <h2>Your Responses</h2>
              <dl>
                {answeredEntries.map(([key, value]) => (
                  <div key={key} className="meal-prep-intake-response">
                    <dt>{formatLabel(key)}</dt>
                    <dd>{formatDisplayValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="meal-prep-intake">
      <Helmet>
        <title>Meal Prep Intake | Local Effort</title>
        <meta name="description" content="New customer intake form for Local Effort meal prep." />
      </Helmet>

      <div className="meal-prep-intake-shell">
        <aside className="meal-prep-intake-aside">
          <div className="meal-prep-intake-badge">Intake</div>
          <h2>Meal Prep Intake</h2>
          <p>New customer setup for weekly meals, preferences, allergies, delivery, and billing.</p>
          <div className="meal-prep-intake-progress">
            <div className="meal-prep-intake-progress-label">
              Step {Math.min(stepIndex, totalSteps)} of {totalSteps}
            </div>
            <div className="meal-prep-intake-progress-bar">
              <div className="meal-prep-intake-progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
          <div className="meal-prep-intake-note">Required fields are marked with an asterisk.</div>
        </aside>

        <main className="meal-prep-intake-main">
          <div className="meal-prep-intake-card">
            {currentQuestion.type === 'intro' ? (
              <>
                <div className="meal-prep-intake-tag">{currentQuestion.category}</div>
                <h1>{currentQuestion.title}</h1>
                <p>{currentQuestion.prompt}</p>
                <div className="meal-prep-intake-helper">{currentQuestion.helper}</div>
                <button type="button" className="meal-prep-intake-primary" onClick={handleNext}>
                  Start
                </button>
              </>
            ) : (
              <>
                <div className="meal-prep-intake-tag">{currentQuestion.category}</div>
                <div className="meal-prep-intake-question">{currentQuestion.prompt}</div>
                {currentQuestion.helper && (
                  <div className="meal-prep-intake-helper">{currentQuestion.helper}</div>
                )}
                {renderInput()}
                {validationMessage && <div className="meal-prep-intake-validation">{validationMessage}</div>}
                <div className="meal-prep-intake-actions">
                  <button type="button" className="meal-prep-intake-secondary" onClick={handleBack}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="meal-prep-intake-primary"
                    onClick={handleNext}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : stepIndex === QUESTIONS.length - 1 ? 'Submit' : 'Next'}
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MealPrepIntakePage;
