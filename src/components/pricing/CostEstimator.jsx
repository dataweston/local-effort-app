import React, { useState } from 'react';

export const CostEstimator = () => {
  const [userAnswers, setUserAnswers] = useState({});
  const [currentQuestionKey, setCurrentQuestionKey] = useState('start');
  const [questionPath, setQuestionPath] = useState([]);
  const [finalCost, setFinalCost] = useState(0);
  const [breakdown, setBreakdown] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const questions = {
    start: {
      id: 'serviceType',
      title: 'What kind of service are you looking for?',
      type: 'options',
      options: [
        { text: 'Weekly Meal Plan', value: 'mealPlan' },
        { text: 'Small Event or Party', value: 'smallEvent' },
        { text: 'Intimate Dinner at Home', value: 'dinnerAtHome' },
        { text: 'Pizza Party', value: 'pizzaParty' },
      ],
      next: (answer) => `${answer}_q1`,
    },
    mealPlan_q1: {
      id: 'numPeople',
      title: 'How many people?',
      type: 'number',
      placeholder: 'e.g., 2',
      next: 'mealPlan_q2',
    },
    mealPlan_q2: {
      id: 'meals',
      title: 'Meals per week?',
      type: 'multi_number',
      fields: [
        { id: 'breakfasts', label: 'Breakfasts' },
        { id: 'lunches', label: 'Lunches' },
        { id: 'dinners', label: 'Dinners' },
      ],
      next: 'mealPlan_q3',
    },
    mealPlan_q3: {
      id: 'billing',
      title: 'Billing preference?',
      type: 'options',
      options: [
        { text: 'Weekly', value: 'weekly' },
        { text: 'Monthly (10% off)', value: 'monthly' },
        { text: 'Seasonally (20% off)', value: 'seasonal' },
      ],
      next: 'end',
    },
    smallEvent_q1: {
      id: 'numPeople',
      title: 'How many guests?',
      type: 'number',
      placeholder: 'e.g., 25',
      next: 'smallEvent_q2',
    },
    dinnerAtHome_q1: {
      id: 'numPeople',
      title: 'How many guests?',
      type: 'number',
      placeholder: 'e.g., 4',
      next: 'smallEvent_q2',
    },
    smallEvent_q2: {
      id: 'serviceStyle',
      title: 'Service style?',
      type: 'options',
      options: [
        { text: 'Food Drop-off', value: 'dropoff' },
        { text: 'Passed Appetizers', value: 'passedApps' },
        { text: 'Buffet Style', value: 'buffet' },
        { text: 'Buffet & Passed Apps', value: 'buffetAndPassed' },
        { text: 'Plated Meal', value: 'plated' },
      ],
      next: 'smallEvent_q4',
    },
    smallEvent_q4: {
      id: 'sensitivity',
      title: 'Focus for the event?',
      type: 'options',
      options: [
        { text: 'Premium / Unforgettable', value: 'quality_sensitive' },
        { text: 'Budget-friendly / Impressive', value: 'price_sensitive' },
      ],
      next: 'end',
    },
    pizzaParty_q1: {
      id: 'numPeople',
      title: 'How many people?',
      type: 'number',
      placeholder: 'e.g., 20',
      next: 'pizzaParty_q2',
    },
    pizzaParty_q2: {
      id: 'addons',
      title: 'Add-ons (salads, etc.)?',
      type: 'options',
      options: [
        { text: 'Yes', value: true },
        { text: 'No, just pizza', value: false },
      ],
      next: 'end',
    },
  };

  const calculateCost = (answers) => {
    let totalCost = 0;
    const people = parseInt(answers.numPeople) || 1;
    switch (answers.serviceType) {
      case 'mealPlan':
        totalCost =
          people *
          ((parseInt(answers.breakfasts) || 0) * 15 +
            (parseInt(answers.lunches) || 0) * 20 +
            (parseInt(answers.dinners) || 0) * 25);
        break;
      case 'smallEvent':
        totalCost = people * 75;
        break;
      case 'dinnerAtHome':
        totalCost = people * 120;
        break;
      case 'pizzaParty':
        totalCost = 300 + (people > 15 ? (people - 15) * 18 : 0);
        break;
      default:
        totalCost = 0;
    }
    setFinalCost(totalCost);
    setBreakdown([`Estimated cost for ${people} person(s): $${totalCost.toFixed(2)}`]);
    setShowResults(true);
  };

  const handleAnswer = (question, value) => {
    const newAnswers = { ...userAnswers };
    if (question.type === 'multi_number') {
      Object.assign(newAnswers, value);
    } else {
      newAnswers[question.id] = value;
    }
    setUserAnswers(newAnswers);
    setQuestionPath([...questionPath, currentQuestionKey]);
    let nextKey = typeof question.next === 'function' ? question.next(value) : question.next;
    if (!nextKey || nextKey === 'end') {
      calculateCost(newAnswers);
    } else {
      setCurrentQuestionKey(nextKey);
    }
  };

  const restart = () => {
    setUserAnswers({});
    setCurrentQuestionKey('start');
    setQuestionPath([]);
    setShowResults(false);
  };

  if (showResults) {
    return (
      <div className="border border-gray-900 p-8 text-center">
        <h3 className="text-2xl font-bold">All-Inclusive Ballpark Estimate</h3>
        <p className="text-6xl font-bold my-4">${finalCost.toFixed(2)}</p>
        <div className="bg-gray-200 p-4 text-left mb-6 font-mono text-sm">
          {[`- Based on your selections for a ${userAnswers.serviceType} service.`].map(
            (item, i) => (
              <p key={i}>{item}</p>
            )
          )}
        </div>
        <button onClick={restart} className="mt-6 text-sm underline font-mono">
          Start Over
        </button>
      </div>
    );
  }

  const currentQData = questions[currentQuestionKey];
  return (
    <div className="relative w-full border border-gray-900 p-8 min-h-[400px]">
      <h2 className="text-3xl font-bold mb-6">{currentQData.title}</h2>
      {currentQData.type === 'options' && (
        <div className="space-y-3 font-mono">
          {currentQData.options.map((opt) => (
            <button
              key={opt.value.toString()}
              onClick={() => handleAnswer(currentQData, opt.value)}
              className="w-full text-left p-4 border border-gray-900 hover:bg-gray-200 block"
            >
              {opt.text}
            </button>
          ))}
        </div>
      )}
      {currentQData.type === 'number' && (
        <div>
          <input
            type="number"
            id={`input-${currentQData.id}`}
            placeholder={currentQData.placeholder}
            className="w-full p-4 text-xl border-b-2 border-gray-900 outline-none bg-transparent font-mono"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAnswer(currentQData, e.target.value || '0');
              }
            }}
          />
          <button
            onClick={() =>
              handleAnswer(
                currentQData,
                document.getElementById(`input-${currentQData.id}`).value || '0'
              )
            }
            className="mt-6 bg-gray-900 text-white font-mono py-2 px-4 hover:bg-gray-700"
          >
            OK
          </button>
        </div>
      )}
      {currentQData.type === 'multi_number' && (
        <div className="font-mono space-y-4">
          {currentQData.fields.map((field) => (
            <div key={field.id} className="grid grid-cols-2 items-center gap-4">
              <label htmlFor={`input-${field.id}`} className="text-lg">
                {field.label}
              </label>
              <input
                type="number"
                id={`input-${field.id}`}
                placeholder="0"
                className="p-3 text-lg border-b-2 border-gray-900 outline-none bg-transparent"
              />
            </div>
          ))}
          <button
            onClick={() => {
              const multiValue = {};
              currentQData.fields.forEach((field) => {
                multiValue[field.id] = document.getElementById(`input-${field.id}`).value || '0';
              });
              handleAnswer(currentQData, multiValue);
            }}
            className="mt-6 bg-gray-900 text-white font-mono py-2 px-4 hover:bg-gray-700 !ml-auto !block"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
};
