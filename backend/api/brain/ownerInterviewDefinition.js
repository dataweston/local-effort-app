'use strict';

const APPLICABILITY = Object.freeze(['general_food_industry', 'twin_cities', 'local_effort']);

const ALL_KNOWLEDGE_KINDS = Object.freeze([
  'observed_fact',
  'owner_experience',
  'judgment_heuristic',
  'hypothesis',
  'external_claim',
]);

function question(
  id,
  prompt,
  purpose,
  probes,
  {
    allowedScope = ['local_effort'],
    suggestedKnowledgeKind = 'owner_experience',
    suggestedConfidence = 'context_dependent',
    suggestedApplicability = ['local_effort'],
    reviewIntervalMonths = 12,
    reviewTrigger = 'Review when operating conditions or supporting evidence materially change.',
  } = {}
) {
  return {
    id,
    prompt,
    purpose,
    probes,
    allowedScope: [...allowedScope],
    allowedKnowledgeKinds: [...ALL_KNOWLEDGE_KINDS],
    suggestedKnowledgeKind,
    suggestedConfidence,
    suggestedApplicability: suggestedApplicability.filter((scope) => allowedScope.includes(scope)),
    sensitivityCeiling: 'confidential_business',
    freshness: {
      asOfRequired: true,
      reviewIntervalMonths,
      reviewTrigger,
    },
  };
}

const modules = [
  {
    id: 'recent-work',
    title: 'Start with real work',
    description:
      'Use recent examples instead of general rules. Specific stories preserve the context that made a decision work.',
    questions: [
      question(
        'service-success-story',
        'Think about a recent service or event that went unusually well. Walk through what happened and what made the difference.',
        'A concrete success reveals the details worth repeating.',
        ['What was different from a normal day?', 'Which one detail would you deliberately repeat?']
      ),
      question(
        'event-quote-miss',
        'Think of work that took much more or less effort than you expected. What did the quote or plan miss?',
        'This helps future plans account for hidden work without rewriting the original quote.',
        ['Where did the extra work first appear?', 'What would you ask or measure next time?']
      ),
      question(
        'hospitality-recovery-decision',
        'Tell the story of a service problem you recovered well. What did you notice, decide, and do?',
        'A real recovery story captures judgment that a generic service rule misses.',
        [
          'What told you how serious the problem was?',
          'What would have made a different response appropriate?',
        ]
      ),
    ],
  },
  {
    id: 'food-judgment',
    title: 'Food judgment',
    description:
      'Capture what experienced eyes, hands, and taste notice before a recipe or specification can explain it.',
    questions: [
      question(
        'ingredient-receiving-quality',
        'Choose one ingredient where quality varies. What do you look, smell, feel, or listen for when deciding whether it is good enough to use?',
        'This preserves a teachable receiving signal while keeping the underlying record authoritative.',
        ['What does the bad version look like?', 'When has this signal fooled you?']
      ),
      question(
        'recipe-critical-checkpoint',
        'Choose one important preparation. At what moment can you tell it is on track, and what exactly do you notice?',
        'This records the checkpoint that recipe text usually leaves out.',
        [
          'What do you see, feel, smell, hear, or taste?',
          'What can still be corrected at that point?',
        ]
      ),
      question(
        'recipe-recovery-signal',
        'Tell me about a preparation that started going wrong but was still recoverable. How did you know, and what worked?',
        'A bounded example makes recovery knowledge usable without turning it into an automatic instruction.',
        ['What was the first warning?', 'What sign means it is too late to recover?']
      ),
    ],
  },
  {
    id: 'buying-production',
    title: 'Buying and production',
    description:
      'Focus on the variation, supplier behavior, and sequencing that change actual cost or output.',
    questions: [
      question(
        'vendor-reliability-signal',
        'Think of a supplier problem you could see coming. What was the first signal, and what did you do with it?',
        'This captures an early warning grounded in a real supplier episode.',
        ['How often is that signal wrong?', 'What backup option was actually useful?'],
        { allowedScope: ['local_effort', 'twin_cities'], suggestedApplicability: ['local_effort'] }
      ),
      question(
        'ingredient-yield-variance',
        'Which ingredient has surprised you most when purchased quantity became usable quantity? Describe one high-yield and one low-yield case.',
        'Concrete range examples can guide later yield measurement and costing.',
        ['What caused the difference?', 'Where could the usable yield be recorded next time?']
      ),
      question(
        'production-sequence-dependency',
        'Tell me about a day when doing one task too early or too late affected everything after it. What was the dependency?',
        'This makes a hidden production sequence visible for planning and teaching.',
        ['What piled up or had to wait?', 'What cue should determine the sequence?']
      ),
    ],
  },
  {
    id: 'capacity-people',
    title: 'Capacity and people',
    description:
      'Name the work that sets the real ceiling, not the capacity that looks available on paper.',
    questions: [
      question(
        'capacity-first-constraint',
        'On a normal busy day, what runs out first: time, hands, space, equipment, attention, or something else? Describe the moment it becomes limiting.',
        'A witnessed bottleneck is more useful than a theoretical capacity number.',
        ['What waits because of it?', 'What changes the constraint on a different kind of day?']
      ),
      question(
        'le-capacity-unit',
        'If you had to describe one week of genuinely usable capacity, what unit would you use and what would it include?',
        'This gives later planning a candidate unit grounded in how Local Effort actually works.',
        [
          'Why would orders, dollars, or labor hours alone be misleading?',
          'What existing records could calculate it?',
        ]
      ),
      question(
        'founder-time-constraint',
        'Which recurring task still depends most on you personally? Tell me about the last time someone or something else could not carry it.',
        'This separates genuine owner judgment from work that may be teachable, delegable, or supported by software.',
        ['What knowledge was missing?', 'What would make you comfortable handing off part of it?']
      ),
    ],
  },
  {
    id: 'offers-customers',
    title: 'Offers and customers',
    description:
      'Use observed behavior and actual work to explain fit, pricing pressure, and refusal boundaries.',
    questions: [
      question(
        'offer-customer-job',
        'Choose one current offer. What is the customer really trying to make happen when they hire Local Effort for it?',
        'This captures the occasion behind the purchase without storing customer identity.',
        ['What behavior makes you think that?', 'When is this offer the wrong fit?']
      ),
      question(
        'price-floor-signal',
        'Recall a job where the price or minimum was too low for the work. What happened that made the mismatch obvious?',
        'A real mismatch can improve later pricing review without publishing or overwriting prices.',
        ['Which work was easiest to miss?', 'What would you compare before quoting similar work?']
      ),
      question(
        'event-decline-condition',
        'Tell me about an inquiry you declined—or wish you had declined. What fact should have decided it sooner?',
        'This preserves a practical refusal boundary tied to feasibility or risk.',
        ['When did that fact become visible?', 'What exception, if any, would change the decision?']
      ),
    ],
  },
  {
    id: 'decisions-next',
    title: 'Decisions and what comes next',
    description:
      'Finish with the rules, uncertainty, and information gaps that shape the next operating decision.',
    questions: [
      question(
        'decision-threshold',
        'What number, condition, or warning sign currently makes you accept, change, or decline an opportunity? Use the last time it happened.',
        'A recent example turns a preference into a reviewable decision boundary.',
        ['What happened on each side of the threshold?', 'What would cause you to change it?'],
        { suggestedKnowledgeKind: 'judgment_heuristic' }
      ),
      question(
        'decision-uncertainty',
        'Think of a recent decision made with incomplete information. What did you need to know before acting, and what uncertainty did you accept?',
        'This captures how uncertainty is handled without pretending it can be eliminated.',
        [
          'Which missing fact would have changed the decision?',
          'How did the outcome compare with your expectation?',
        ]
      ),
      question(
        'data-retyping-waste',
        'Which recurring decision sends you hunting through messages, spreadsheets, or systems? Walk through the last time you gathered the information.',
        'The actual hunt identifies a useful reporting or software opportunity before anyone proposes automation.',
        [
          'Where did each piece of information come from?',
          'What decision would improve if it were ready in one place?',
        ]
      ),
    ],
  },
];

const OWNER_INTERVIEW_DEFINITION = Object.freeze({
  interviewKey: 'restaurateur-knowledge',
  version: 2,
  title: 'Local Effort Field Interview',
  description:
    'Eighteen focused prompts built around real examples. One specific story is more useful than a polished general rule.',
  privacyNotice:
    'Private working notes, not Brain truth. Do not enter customer identities, contact or health details, credentials, payment data, or licensed source text.',
  modules,
});

function getQuestionIds(definition = OWNER_INTERVIEW_DEFINITION) {
  return definition.modules.flatMap((module) => module.questions.map((item) => item.id));
}

function findQuestion(definition, questionId) {
  for (const module of definition?.modules || []) {
    const found = (module.questions || []).find((item) => item.id === questionId);
    if (found) return found;
  }
  return null;
}

module.exports = {
  APPLICABILITY,
  ALL_KNOWLEDGE_KINDS,
  OWNER_INTERVIEW_DEFINITION,
  findQuestion,
  getQuestionIds,
};
