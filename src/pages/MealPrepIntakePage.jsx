import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const hasSummaryValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') {
    return Object.values(value).some((entry) => hasSummaryValue(entry));
  }
  return String(value || '').trim().length > 0;
};

const formatDeliveryPreference = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  if (value.preference === 'No preference') return 'No preference';
  return [value.day, value.time].filter(Boolean).join(', ');
};

const formatMealRequests = (answers) => {
  const selected = Array.isArray(answers.meal_requests_selected) ? answers.meal_requests_selected : [];
  const details = answers.meal_requests_details && typeof answers.meal_requests_details === 'object'
    ? answers.meal_requests_details
    : {};
  return selected.map((meal) => {
    const detail = String(details[meal] || '').trim();
    return detail ? `${meal}: ${detail}` : meal;
  });
};

const formatProteinSummary = (answers) => {
  const selected = Array.isArray(answers.proteins_selected) ? answers.proteins_selected : [];
  const everyday = Array.isArray(answers.proteins_everyday) ? answers.proteins_everyday : [];
  return selected.map((protein) => {
    const detailKey = `proteins_sub_${optionKey(protein)}`;
    const details = Array.isArray(answers[detailKey]) && answers[detailKey].length
      ? ` (${answers[detailKey].join(', ')})`
      : '';
    const everydayLabel = everyday.includes(protein) ? ' - would eat every day' : '';
    return `${protein}${details}${everydayLabel}`;
  });
};

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const parseFirstNumber = (value) => {
  const match = String(value || '').match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
};

const getHouseholdCount = (value) => {
  const count = parseFirstNumber(value);
  return count && count > 0 ? count : 1;
};

const getRequestedMealDays = (details, meal) => {
  const days = parseFirstNumber(details?.[meal]);
  return days && days > 0 ? days : 1;
};

const calculateMealPrepEstimate = (answers) => {
  const selected = Array.isArray(answers.meal_requests_selected) ? answers.meal_requests_selected : [];
  const details = answers.meal_requests_details && typeof answers.meal_requests_details === 'object'
    ? answers.meal_requests_details
    : {};
  const people = getHouseholdCount(answers.household_size);
  const lines = [];
  const notIncluded = [];

  if (selected.includes('Breakfast')) {
    const days = getRequestedMealDays(details, 'Breakfast');
    const subtotal = people * days * 13.5;
    lines.push({
      id: 'breakfast',
      label: `Breakfast, ${people} ${people === 1 ? 'person' : 'people'} x ${days} ${days === 1 ? 'day' : 'days'} at $13.50/person`,
      subtotal,
    });
  }

  if (selected.includes('Lunch')) {
    const days = getRequestedMealDays(details, 'Lunch');
    const subtotal = people * days * 18;
    lines.push({
      id: 'lunch',
      label: `Lunch, ${people} ${people === 1 ? 'person' : 'people'} x ${days} ${days === 1 ? 'day' : 'days'} at $18/person`,
      subtotal,
    });
  }

  if (selected.includes('Dinner')) {
    const days = getRequestedMealDays(details, 'Dinner');
    let subtotal = days * 24;
    let rateLabel = '$24 for a solo/single person dinner';

    if (people === 2) {
      subtotal = days * 45;
      rateLabel = '$45 for a family of 2 dinner';
    } else if (people >= 3) {
      subtotal = people * days * 18;
      rateLabel = '$18/person for a family dinner';
    }

    lines.push({
      id: 'dinner',
      label: `Dinner, ${people} ${people === 1 ? 'person' : 'people'} x ${days} ${days === 1 ? 'day' : 'days'} at ${rateLabel}`,
      subtotal,
    });
  }

  ['Additional meals', 'Snacks'].forEach((meal) => {
    if (selected.includes(meal)) notIncluded.push(meal);
  });

  lines.push({
    id: 'delivery',
    label: 'Weekly delivery',
    subtotal: 10,
  });

  const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
  return { total, lines, notIncluded };
};

const MealPrepIntakePage = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [validationMessage, setValidationMessage] = useState('');
  const [estimateExpanded, setEstimateExpanded] = useState(false);
  const addressInputRef = useRef(null);

  const currentQuestion = QUESTIONS[stepIndex];
  const totalSteps = QUESTIONS.length - 1;
  const progress = Math.max(0, Math.min(1, stepIndex / totalSteps));
  const hasAddressField = currentQuestion?.fields?.some((field) => field.type === 'address') || false;

  const getAnswer = (id, fallback = '') => (answers[id] !== undefined ? answers[id] : fallback);

  const weeklyEstimate = useMemo(() => calculateMealPrepEstimate(answers), [answers]);

  const summarySections = useMemo(() => {
    const item = (id, label, value = answers[id]) => (
      hasSummaryValue(value) ? { id, label, value } : null
    );

    const sections = [
      {
        id: 'contact',
        title: 'Contact and Delivery',
        items: [
          item('client_name', 'Name'),
          item('email', 'Email'),
          item('phone', 'Phone'),
          item('address', 'Delivery address'),
          item('preferred_start_date', 'Preferred start date'),
          item('delivery_preference', 'Delivery preference', formatDeliveryPreference(answers.delivery_preference)),
        ],
      },
      {
        id: 'meals',
        title: 'Meals',
        items: [
          item('household_size', 'Household'),
          item('meal_requests', 'Meal requests', formatMealRequests(answers)),
        ],
      },
      {
        id: 'proteins',
        title: 'Proteins',
        items: [
          item('proteins', 'Proteins to plan around', formatProteinSummary(answers)),
        ],
      },
      {
        id: 'preferences',
        title: 'Preferences',
        items: [
          item('spice_heat_tolerance', 'Spice/heat tolerance'),
          item('flavor_adventurousness', 'Flavor adventurousness'),
          item('favorite_foods', 'Favorite foods'),
          item('dislikes', 'Foods to avoid'),
          item('allergies', 'Allergies or intolerances'),
          item('nutritional_goals', 'Nutritional goals'),
        ],
      },
      {
        id: 'goals',
        title: 'Goals',
        items: [
          item('meal_priorities', 'Top priorities'),
          item('specific_needs_to_detail', 'Specific needs'),
        ],
      },
    ];

    return sections
      .map((section) => ({ ...section, items: section.items.filter(Boolean) }))
      .filter((section) => section.items.length > 0);
  }, [answers]);

  const updateAnswer = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setValidationMessage('');
  };

  useEffect(() => {
    if (!hasAddressField) return undefined;

    let autocomplete = null;
    let existingScript = null;
    let cancelled = false;

    const setAddressFromPlace = (place) => {
      if (!place) return;
      const formatted = place.formatted_address || place.name || '';
      if (formatted) {
        setAnswers((prev) => ({ ...prev, address: formatted }));
        return;
      }
      if (!Array.isArray(place.address_components)) return;
      const component = (type) => place.address_components.find((entry) => entry.types.includes(type))?.long_name || '';
      const streetNumber = component('street_number');
      const route = component('route');
      const city = component('locality') || component('sublocality') || '';
      const state = component('administrative_area_level_1') || '';
      const postal = component('postal_code') || '';
      const fullAddress = [
        [streetNumber, route].filter(Boolean).join(' '),
        city,
        [state, postal].filter(Boolean).join(' '),
      ].filter(Boolean).join(', ');
      if (fullAddress) setAnswers((prev) => ({ ...prev, address: fullAddress }));
    };

    const initAutocomplete = () => {
      if (cancelled || !addressInputRef.current || !window.google?.maps?.places) return;
      autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
        fields: ['address_components', 'formatted_address', 'name'],
      });
      autocomplete.addListener('place_changed', () => setAddressFromPlace(autocomplete.getPlace()));
    };

    if (window.google?.maps?.places) {
      initAutocomplete();
    } else {
      const apiKey = window.GOOGLE_PLACES_KEY || import.meta?.env?.VITE_GOOGLE_PLACES_KEY;
      if (!apiKey) return undefined;
      existingScript = document.querySelector('script[data-gplaces]');
      if (existingScript) {
        existingScript.addEventListener('load', initAutocomplete);
      } else {
        window.__mealPrepPlacesInit = initAutocomplete;
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=__mealPrepPlacesInit`;
        script.async = true;
        script.dataset.gplaces = 'true';
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (existingScript) existingScript.removeEventListener('load', initAutocomplete);
      if (autocomplete && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
      if (window.__mealPrepPlacesInit === initAutocomplete) {
        try {
          delete window.__mealPrepPlacesInit;
        } catch {
          window.__mealPrepPlacesInit = undefined;
        }
      }
    };
  }, [hasAddressField]);

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

  const updateDeliveryPreference = (id, patch) => {
    setAnswers((prev) => {
      const current = prev[id] && typeof prev[id] === 'object' && !Array.isArray(prev[id])
        ? prev[id]
        : {};
      const next = { ...current, ...patch };
      if (patch.preference === 'No preference') {
        next.day = 'No preference';
        next.time = 'no preference';
      } else if (next.preference === 'No preference' && (patch.day || patch.time)) {
        next.preference = 'Specific';
      } else if (!next.preference) {
        next.preference = 'Specific';
      }
      return { ...prev, [id]: next };
    });
    setValidationMessage('');
  };

  const toggleMealRequest = (id, option) => {
    const selectedKey = `${id}_selected`;
    const detailsKey = `${id}_details`;
    setAnswers((prev) => {
      const selected = Array.isArray(prev[selectedKey]) ? prev[selectedKey] : [];
      const details = prev[detailsKey] && typeof prev[detailsKey] === 'object' ? prev[detailsKey] : {};
      const isSelected = selected.includes(option);
      if (isSelected) {
        const nextDetails = { ...details };
        delete nextDetails[option];
        return {
          ...prev,
          [selectedKey]: selected.filter((item) => item !== option),
          [detailsKey]: nextDetails,
        };
      }
      return {
        ...prev,
        [selectedKey]: [...selected, option],
        [detailsKey]: { ...details, [option]: details[option] || '' },
      };
    });
    setValidationMessage('');
  };

  const updateMealRequestDetail = (id, option, value) => {
    const detailsKey = `${id}_details`;
    setAnswers((prev) => {
      const details = prev[detailsKey] && typeof prev[detailsKey] === 'object' ? prev[detailsKey] : {};
      return {
        ...prev,
        [detailsKey]: { ...details, [option]: value },
      };
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
      case 'address':
        return (
          <div key={field.id} className="meal-prep-intake-field">
            <label className="meal-prep-intake-label" htmlFor={field.id}>
              {field.label}{field.required ? ' *' : ''}
            </label>
            <input
              id={field.id}
              ref={addressInputRef}
              className="meal-prep-intake-input"
              value={value}
              placeholder={field.placeholder || ''}
              autoComplete="street-address"
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
      case 'delivery-window': {
        const preference = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        return (
          <div key={field.id} className="meal-prep-intake-field">
            <div className="meal-prep-intake-label">{field.label}{field.required ? ' *' : ''}</div>
            <div className="meal-prep-intake-choices compact">
              <button
                type="button"
                className={`meal-prep-intake-choice ${preference.preference === 'No preference' ? 'is-selected' : ''}`}
                onClick={() => updateDeliveryPreference(field.id, { preference: 'No preference' })}
              >
                No preference
              </button>
            </div>
            <div className="meal-prep-intake-split-field">
              <div>
                <div className="meal-prep-intake-sub-label">Day of week</div>
                <div className="meal-prep-intake-choices compact">
                  {field.dayOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`meal-prep-intake-choice ${preference.day === option ? 'is-selected' : ''}`}
                      onClick={() => updateDeliveryPreference(field.id, { day: option })}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="meal-prep-intake-sub-label">Time of day</div>
                <div className="meal-prep-intake-choices compact">
                  {field.timeOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`meal-prep-intake-choice ${preference.time === option ? 'is-selected' : ''}`}
                      onClick={() => updateDeliveryPreference(field.id, { time: option })}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }
      case 'meal-request-picker': {
        const selected = getAnswer(`${field.id}_selected`, []);
        const details = getAnswer(`${field.id}_details`, {});
        return (
          <div key={field.id} className="meal-prep-intake-field">
            <div className="meal-prep-intake-label">{field.label}{field.required ? ' *' : ''}</div>
            <div className="meal-prep-intake-meals">
              {field.options.map((option) => {
                const isSelected = Array.isArray(selected) && selected.includes(option);
                return (
                  <div key={option} className={`meal-prep-intake-meal ${isSelected ? 'is-selected' : ''}`}>
                    <button
                      type="button"
                      className={`meal-prep-intake-protein-check ${isSelected ? 'is-checked' : ''}`}
                      onClick={() => toggleMealRequest(field.id, option)}
                      aria-pressed={isSelected}
                    >
                      <span className="meal-prep-intake-checkbox">{isSelected ? 'x' : ''}</span>
                      <span>{option}</span>
                    </button>
                    {isSelected && (
                      <input
                        className="meal-prep-intake-input meal-detail-input"
                        value={details?.[option] || ''}
                        placeholder="how many days?"
                        onChange={(event) => updateMealRequestDetail(field.id, option, event.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
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
                    {isEveryday ? 'Would eat every day' : 'Would eat every day?'}
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

  const renderSummaryValue = (value) => {
    if (Array.isArray(value)) {
      return (
        <ul className="meal-prep-intake-summary-list">
          {value.map((entry, index) => <li key={`${entry}-${index}`}>{entry}</li>)}
        </ul>
      );
    }
    return <span>{formatDisplayValue(value)}</span>;
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
            <section className="meal-prep-intake-estimate" aria-label="Estimated weekly cost">
              <div className="meal-prep-intake-estimate-main">
                <div>
                  <div className="meal-prep-intake-tag">Estimate</div>
                  <h2>the estimated weekly cost is {moneyFormatter.format(weeklyEstimate.total)}</h2>
                </div>
                <button
                  type="button"
                  className="meal-prep-intake-estimate-toggle"
                  onClick={() => setEstimateExpanded((prev) => !prev)}
                  aria-expanded={estimateExpanded}
                >
                  {estimateExpanded ? 'Hide breakdown' : 'Click to expand'}
                </button>
              </div>
              {estimateExpanded && (
                <div className="meal-prep-intake-estimate-breakdown">
                  {weeklyEstimate.lines.map((line) => (
                    <div key={line.id} className="meal-prep-intake-estimate-line">
                      <span>{line.label}</span>
                      <strong>{moneyFormatter.format(line.subtotal)}</strong>
                    </div>
                  ))}
                  {weeklyEstimate.notIncluded.length > 0 && (
                    <div className="meal-prep-intake-estimate-footnote">
                      {weeklyEstimate.notIncluded.join(' and ')} are noted in your profile but not included in this estimate yet.
                    </div>
                  )}
                </div>
              )}
              <p className="meal-prep-intake-estimate-note">
                this might not be your final cost. we'll offer a more finely-tuned price that takes into account your needs and preferences, your portions, and other family-specific details. you can save 8% by switching to monthly billing, and you'll save on fees if you pay by ACH rather than credit. We're happy to explore cost with you to make sure it works with your life.
              </p>
            </section>
            <div className="meal-prep-intake-summary">
              <div className="meal-prep-intake-summary-heading">
                <div className="meal-prep-intake-tag">Review</div>
                <h2>Your meal prep profile</h2>
                <p>Here is what we captured. You can restart the form if anything needs to change.</p>
              </div>
              {summarySections.length > 0 ? (
                <div className="meal-prep-intake-summary-sections">
                  {summarySections.map((section) => (
                    <section key={section.id} className="meal-prep-intake-summary-section">
                      <h3>{section.title}</h3>
                      <dl>
                        {section.items.map((entry) => (
                          <div key={entry.id} className="meal-prep-intake-response">
                            <dt>{entry.label}</dt>
                            <dd>{renderSummaryValue(entry.value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </div>
              ) : (
                <p className="meal-prep-intake-empty-summary">
                  No preferences were entered yet. We will follow up to fill in the details.
                </p>
              )}
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
                {!currentQuestion.hidePrompt && (
                  <>
                    <div className="meal-prep-intake-tag">{currentQuestion.category}</div>
                    <div className="meal-prep-intake-question">{currentQuestion.prompt}</div>
                    {currentQuestion.helper && (
                      <div className="meal-prep-intake-helper">{currentQuestion.helper}</div>
                    )}
                  </>
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
