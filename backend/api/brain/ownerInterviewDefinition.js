'use strict';

const APPLICABILITY = Object.freeze([
  'general_food_industry',
  'twin_cities',
  'local_effort',
]);

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
    allowedScope = APPLICABILITY,
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
    id: 'decision-calibration',
    title: 'Decision heuristics and calibration',
    description: 'Capture how consequential choices are made, tested, and revised without turning recollection into universal truth.',
    questions: [
      question('decision-binding-constraint', 'Recall a recent consequential operating decision. What constraint determined the choice?', 'Preserve the binding constraint behind a decision for later comparison with outcomes.', ['What alternatives were still feasible?', 'What evidence identified the constraint?']),
      question('decision-threshold', 'What threshold currently causes you to accept, change, or decline an opportunity?', 'Record a usable decision boundary rather than a general preference.', ['When did this threshold last apply?', 'What would cause the threshold to change?']),
      question('decision-uncertainty', 'When information is incomplete, how do you decide that you know enough to act?', 'Capture an uncertainty-management heuristic for planning and review.', ['What information is most valuable before committing?', 'What uncertainty remains acceptable?']),
      question('decision-counterexample', 'Which operating rule has a memorable counterexample?', 'Retain a boundary case that prevents a heuristic from becoming false authority.', ['What context made the rule fail?', 'How should the rule be qualified now?']),
      question('decision-reversal-evidence', 'What evidence would make you reverse a current high-confidence operating belief?', 'Make disconfirmation criteria explicit before future results are known.', ['How would that evidence be observed?', 'When should the belief be reviewed?']),
      question('decision-calibration-review', 'Which past prediction most changed how you judge your own confidence?', 'Connect confidence language to an observed calibration lesson.', ['What did you expect at the time?', 'How do you express similar uncertainty now?']),
    ],
  },
  {
    id: 'ingredient-quality-transformation',
    title: 'Ingredient quality, transformation, yield, and substitution',
    description: 'Capture Local Effort observations about usable yield, quality states, transformations, and functional substitutions.',
    questions: [
      question('ingredient-receiving-quality', 'For a consequential ingredient, what received-state signal best predicts usable quality?', 'Identify an early quality signal that can support receiving and purchasing review.', ['How is the signal assessed?', 'When has the signal been misleading?']),
      question('ingredient-yield-variance', 'Which ingredient has the most decision-relevant usable-yield variation?', 'Prioritize longitudinal yield measurement where variation affects cost or capacity.', ['What contexts produce the range?', 'What records could corroborate the range?']),
      question('ingredient-trim-endpoint', 'How do you recognize the correct trim or preparation endpoint for a high-loss ingredient?', 'Preserve a sensory or measurable endpoint without replacing a production specification.', ['What indicates stopping too early?', 'What indicates going too far?']),
      question('ingredient-transformation-loss', 'Which transformation creates a loss that is commonly underestimated?', 'Surface hidden loss for costing and experiment design.', ['Where in the transformation does loss occur?', 'How would you measure it next time?']),
      question('ingredient-functional-substitution', 'What functional property determines whether a substitution will work in a specific use?', 'Capture substitution reasoning based on function rather than ingredient name.', ['How is the property evaluated?', 'What failure reveals a poor substitute?']),
      question('ingredient-substitution-boundary', 'When should a technically workable substitution still be rejected?', 'Record a quality or operating boundary for substitution decisions.', ['What evidence supports that boundary?', 'Does the boundary vary by channel or occasion?']),
      question('ingredient-seasonal-change', 'What seasonal ingredient change most affects how you buy or use the ingredient?', 'Preserve a time-scoped local observation for procurement and recipe review.', ['How do you recognize the change?', 'What is the current as-of season?'], { allowedScope: ['twin_cities', 'local_effort'], reviewIntervalMonths: 6, reviewTrigger: 'Review at the next relevant local season or when the source changes.' }),
    ],
  },
  {
    id: 'recipe-process-scale-holding',
    title: 'Recipe, process, scale, and holding',
    description: 'Capture the process windows and scale effects that recipe text alone does not explain.',
    questions: [
      question('recipe-critical-checkpoint', 'Which checkpoint most reliably tells you whether a process is on track?', 'Identify a teachable process observation for later validation.', ['How is the checkpoint assessed?', 'At what stage does it appear?']),
      question('recipe-recovery-signal', 'What early process signal tells you that recovery is still possible?', 'Capture a bounded recovery cue without automating a production decision.', ['What recovery action has worked?', 'What signal means recovery is no longer appropriate?']),
      question('recipe-nonlinear-scale', 'Which recipe or component stops behaving linearly when batch size changes?', 'Identify a scale-up risk for structured trials and costing.', ['At what scale does behavior change?', 'What mechanism do you believe causes the change?']),
      question('recipe-equipment-dependence', 'Which process outcome depends most on a specific equipment characteristic?', 'Separate equipment-dependent knowledge from a universal recipe claim.', ['What characteristic matters?', 'What happens on different equipment?']),
      question('recipe-holding-window', 'For one important component, what observation defines the end of its acceptable holding window?', 'Capture an evidence-based holding boundary for review against food-safety authority and quality records.', ['How does the component change before that point?', 'What context changes the window?']),
      question('recipe-transport-change', 'Which component changes most during transport?', 'Surface a transport-sensitive quality risk for event planning.', ['When is the change first noticeable?', 'What mitigation has been observed to help?']),
      question('recipe-version-change', 'Which recent recipe change produced the most useful operational learning?', 'Link a recipe-version decision to its observed result and retained uncertainty.', ['What prompted the change?', 'What should be measured if it is repeated?']),
    ],
  },
  {
    id: 'vendors-procurement-local-sourcing',
    title: 'Vendors, procurement, and local sourcing',
    description: 'Capture supplier experience, item resolution, contingency value, and time-sensitive local sourcing knowledge.',
    questions: [
      question('vendor-selection-criterion', 'For a frequently purchased item, what criterion most often determines the vendor choice?', 'Record the actual vendor-selection driver for later comparison with landed cost and performance.', ['When does another criterion override it?', 'What native record could corroborate the choice?']),
      question('vendor-premium-value', 'When has paying a supplier premium produced enough value to justify it?', 'Capture one owner-attributed value mechanism for future purchasing analysis.', ['How was the value observed?', 'Under what conditions would the premium not be justified?']),
      question('vendor-reliability-signal', 'What early signal best predicts a supplier fulfillment problem?', 'Identify a testable supplier-risk signal.', ['How often has the signal been wrong?', 'What action follows the signal?']),
      question('vendor-substitution-response', 'Recall a supplier substitution that materially changed the result. What made the change consequential?', 'Preserve a substitution episode that can inform item mapping and contingency planning.', ['How was the consequence detected?', 'What rule changed afterward?']),
      question('vendor-recovery-quality', 'What behavior distinguishes a strong supplier recovery from a weak one?', 'Capture a bounded supplier-performance heuristic beyond on-time delivery.', ['What evidence should be retained?', 'Does the standard vary by failure severity?']),
      question('vendor-real-option', 'Which supplier relationship currently provides the most valuable contingency option?', 'Document relationship option value without exposing unnecessary personal details.', ['What capability creates the option?', 'What keeps the option available?'], { allowedScope: ['twin_cities', 'local_effort'], reviewIntervalMonths: 6, reviewTrigger: 'Review when relationship terms, contacts, or service capability change.' }),
      question('local-source-season-window', 'For one Minnesota source, what observation marks the practical opening of its buying season?', 'Capture local season timing as a revisable observation rather than a fixed calendar rule.', ['What marks the end of the useful window?', 'How variable has the timing been?'], { allowedScope: ['twin_cities', 'local_effort'], reviewIntervalMonths: 6, reviewTrigger: 'Review during each relevant Minnesota season.' }),
    ],
  },
  {
    id: 'production-capacity-labor',
    title: 'Production, capacity, and labor',
    description: 'Capture constraints, workload shapes, sequencing, and tacit judgment that affect feasible output.',
    questions: [
      question('capacity-first-constraint', 'At current normal volume, which resource becomes constrained first?', 'Identify the present production constraint for capacity decisions.', ['What signal shows the constraint is binding?', 'What condition moves the constraint elsewhere?']),
      question('capacity-step-change', 'Which unit of work causes the largest step change in labor or capacity?', 'Capture a non-linear workload driver for quotes and staffing analysis.', ['Where does the step occur?', 'What evidence could quantify it?']),
      question('production-sequence-dependency', 'Which production sequence dependency is easiest to overlook?', 'Preserve a sequencing constraint that can guide checklists and planning.', ['What downstream work does it affect?', 'How is the dependency detected early?']),
      question('labor-minimum-functional', 'What task currently determines the minimum functional staffing level?', 'Document the task behind a staffing floor without turning it into labor policy.', ['When does the floor change?', 'What happens below it?']),
      question('production-bad-day-signal', 'What early signal most reliably predicts a disrupted production day?', 'Capture a testable early-warning observation.', ['What diagnostic step should follow?', 'When has the signal been a false alarm?']),
      question('production-tacit-judgment', 'Which production decision still requires the most tacit judgment?', 'Identify where a checklist is insufficient and examples should be gathered.', ['What cues inform the judgment?', 'What would make the decision teachable?']),
      question('founder-time-constraint', 'Which recurring activity consumes owner time that is hardest to replace?', 'Surface a constrained resource for make, delegate, and software decisions.', ['What makes substitution difficult?', 'What evidence would show that the constraint has eased?'], { allowedScope: ['local_effort'], reviewIntervalMonths: 6, reviewTrigger: 'Review when roles, staffing, or operating model change.' }),
    ],
  },
  {
    id: 'menus-offers-pricing-channels',
    title: 'Menus, offers, pricing, and channels',
    description: 'Capture decision logic and observed behavior around offers without overwriting accounting or published-price records.',
    questions: [
      question('offer-customer-job', 'For a current offer, what customer job is it actually hired to do?', 'Record an owner hypothesis or experience about occasion fit for later outcome comparison.', ['What observed behavior supports this?', 'What behavior would contradict it?']),
      question('offer-contribution-constraint', 'Which cost or capacity component most often changes whether an offer is worth selling?', 'Identify the contribution driver that deserves native-data analysis.', ['How does the component vary?', 'Which system holds the actual value?']),
      question('price-floor-signal', 'What signal tells you that a price or minimum is too low for the work required?', 'Capture a pricing diagnostic without writing an authoritative price.', ['When did the signal last appear?', 'What alternative explanation should be checked?']),
      question('willingness-to-pay-observation', 'Which observed behavior provides the strongest evidence of willingness to pay?', 'Distinguish behavioral evidence from compliments or hypothetical interest.', ['What is the sample basis?', 'What behavior would weaken the inference?']),
      question('channel-hidden-load', 'Which channel creates the most easily missed operating load?', 'Surface channel-specific labor, packaging, delivery, or working-capital work for measurement.', ['Where does the load appear?', 'How could it be measured?']),
      question('offer-retirement-trigger', 'What condition should trigger review of whether to retire an offer?', 'Make an offer lifecycle trigger explicit for later evidence review.', ['What native results matter?', 'What condition would justify keeping it?']),
      question('channel-fit-difference', 'Which offer behaves most differently across sales channels?', 'Identify a channel interaction for structured comparison.', ['What outcome differs?', 'What contextual factor may explain the difference?']),
    ],
  },
  {
    id: 'events-venues-logistics-hospitality',
    title: 'Events, venues, logistics, and hospitality',
    description: 'Capture quote-critical complexity, venue constraints, transport, and service recovery without named guest data.',
    questions: [
      question('event-complexity-driver', 'Holding guest count constant, what factor most increases event complexity?', 'Identify a complexity driver for inquiry and quote review.', ['How can it be detected during inquiry?', 'When has the factor not increased complexity?']),
      question('venue-plan-changing-fact', 'What venue fact has most often forced a material plan change?', 'Prioritize a venue constraint for pre-event discovery.', ['How was it discovered?', 'What should verify it before a return visit?'], { allowedScope: ['twin_cities', 'local_effort'], reviewIntervalMonths: 6, reviewTrigger: 'Reverify before each venue reuse or when venue operations change.' }),
      question('event-access-buffer', 'Which access condition most affects the buffer needed before service?', 'Capture a logistics assumption for later actual-versus-quote analysis.', ['How much evidence supports the pattern?', 'What circumstance changes the buffer?']),
      question('event-cold-chain-friction', 'Where does cold-chain handling create the greatest event logistics friction?', 'Surface a workflow risk for corroboration with governed food-safety procedures.', ['What observable condition signals the friction?', 'Which official procedure remains authoritative?']),
      question('event-quote-miss', 'Which recent event had the largest gap between quoted and actual effort?', 'Create an owner-attributed postmortem entry point for labor and contribution analysis.', ['Where did the gap first appear?', 'What assumption should change?']),
      question('event-decline-condition', 'What event condition most clearly indicates that Local Effort should decline the work?', 'Capture a refusal boundary tied to feasibility or risk.', ['What evidence supports the boundary?', 'Could a changed scope make the work feasible?'], { allowedScope: ['local_effort'], reviewIntervalMonths: 12 }),
      question('hospitality-recovery-decision', 'What service failure cue determines the appropriate level of recovery?', 'Preserve a hospitality judgment for review without storing customer identity.', ['What outcome indicates the recovery was sufficient?', 'When should the issue be escalated?']),
    ],
  },
  {
    id: 'guest-occasion-learning',
    title: 'Anonymized guest and occasion learning',
    description: 'Capture aggregate patterns only; named guests, contact details, and dietary or health data remain in authorized systems.',
    questions: [
      question('occasion-need-state', 'Which anonymous occasion type has the most distinct underlying need?', 'Capture an occasion-level pattern for offer design without customer PII.', ['What repeated behavior supports the pattern?', 'What cases do not fit?']),
      question('guest-objection-pattern', 'Which anonymized objection most often signals a mismatch rather than a solvable concern?', 'Distinguish offer mismatch from an addressable objection.', ['What response behavior supports this?', 'How broad is the sample?']),
      question('guest-preference-generalization', 'What standard do you use before treating an individual preference as a broader pattern?', 'Set a boundary against overgeneralizing CRM observations.', ['What sample basis is sufficient?', 'What must remain an individual record?']),
      question('occasion-repeat-signal', 'Which anonymized behavior best predicts that an occasion will recur?', 'Capture a testable retention signal for aggregate learning.', ['Where is the behavior recorded?', 'What competing explanation exists?']),
      question('hospitality-value-signal', 'What guest behavior best indicates that a hospitality detail created value?', 'Identify observable feedback beyond direct praise.', ['How consistently has it appeared?', 'What would weaken the interpretation?']),
      question('guest-learning-boundary', 'Which guest learning should never be generalized beyond the individual record?', 'Make the privacy and authority boundary explicit for future data use.', ['Why is generalization unsafe?', 'Which authorized system should retain the individual record?']),
    ],
  },
  {
    id: 'twin-cities-demand-ecosystem',
    title: 'Twin Cities demand and ecosystem',
    description: 'Capture time-bounded regional experience about demand, relationships, events, and local operating friction.',
    questions: [
      question('tc-demand-rhythm', 'Which Twin Cities calendar rhythm most consistently changes demand for Local Effort?', 'Record a regional demand hypothesis for comparison with native outcomes.', ['Which channel or occasion changes?', 'What years or observations support it?'], { allowedScope: ['twin_cities', 'local_effort'], reviewIntervalMonths: 6, reviewTrigger: 'Review before the next relevant calendar period and after material demand shifts.' }),
      question('tc-weather-transition', 'Which local weather transition produces the clearest demand change?', 'Capture a weather-response hypothesis for forecast testing.', ['When is the response absent?', 'Which native metric could test it?'], { allowedScope: ['twin_cities', 'local_effort'], reviewIntervalMonths: 6 }),
      question('tc-event-signal', 'What early signal indicates that a local event will affect inquiries or operations?', 'Preserve a leading regional signal and its uncertainty.', ['How often has the signal been wrong?', 'How far ahead does it appear?'], { allowedScope: ['twin_cities', 'local_effort'], reviewIntervalMonths: 6 }),
      question('tc-neighborhood-logistics', 'Which Twin Cities neighborhood condition most changes delivery or event logistics?', 'Capture local friction for route and quote review without asserting a permanent neighborhood fact.', ['When was it last observed?', 'What should be rechecked for a new job?'], { allowedScope: ['twin_cities', 'local_effort'], reviewIntervalMonths: 6 }),
      question('tc-relationship-norm', 'Which local relationship norm most affects how opportunities develop?', 'Record owner experience about regional business development with explicit boundaries.', ['What paired case supports the norm?', 'Where has the norm failed?'], { allowedScope: ['twin_cities', 'local_effort'], reviewIntervalMonths: 12 }),
      question('tc-ecosystem-gap', 'What current gap in the Twin Cities food ecosystem creates the most relevant opportunity for Local Effort?', 'Capture a dated market hypothesis rather than a durable market fact.', ['What evidence indicates the gap?', 'What development would close it?'], { allowedScope: ['twin_cities', 'local_effort'], reviewIntervalMonths: 6 }),
      question('tc-outsider-misread', 'What Twin Cities operating condition is most often misunderstood by people new to the market?', 'Preserve a regional heuristic with an explicit counterexample path.', ['What observed case demonstrates it?', 'When does the interpretation not apply?'], { allowedScope: ['twin_cities', 'local_effort'], reviewIntervalMonths: 12 }),
    ],
  },
  {
    id: 'facilities-equipment-regulatory',
    title: 'Facilities, equipment, and regulatory navigation',
    description: 'Capture operating experience and revalidation needs; official sources and qualified professionals remain authoritative.',
    questions: [
      question('facility-layout-constraint', 'Which facility layout feature most constrains current throughput?', 'Identify a physical constraint for capacity investigation.', ['What work accumulates around it?', 'What observation would show improvement?']),
      question('equipment-failure-cue', 'What equipment cue has been the most useful early warning of failure?', 'Capture an owner observation for maintenance review, not a safety override.', ['How is the cue observed?', 'When should a qualified technician be involved?']),
      question('equipment-purchase-criterion', 'What criterion most often determines whether equipment earns its space?', 'Record a constrained-space investment heuristic.', ['How is the criterion measured?', 'What counterexample changed your view?']),
      question('facility-workaround-cost', 'Which facility workaround creates the greatest hidden operating cost?', 'Surface friction for measurement and facility planning.', ['Where does the cost appear?', 'Which native record could corroborate it?']),
      question('regulatory-navigation-surprise', 'Which regulatory or permitting interaction produced the most reusable process lesson?', 'Capture dated navigation experience while requiring official revalidation.', ['Which official source applies?', 'What must be reverified before reuse?'], { allowedScope: ['twin_cities', 'local_effort'], reviewIntervalMonths: 6, reviewTrigger: 'Reverify against the current official source before any compliance decision.' }),
      question('inspection-preparation-friction', 'What part of preparing for an inspection or review creates the most avoidable friction?', 'Identify a checklist opportunity without replacing regulated records or professional advice.', ['What evidence shows the friction?', 'Which authority defines the actual requirement?'], { allowedScope: ['twin_cities', 'local_effort'], reviewIntervalMonths: 6, reviewTrigger: 'Reverify whenever the authority, facility, or applicable rule changes.' }),
    ],
  },
  {
    id: 'local-effort-operating-data',
    title: 'Local Effort operating knowledge and data definitions',
    description: 'Clarify Local Effort-specific language, system boundaries, metrics, and recurring operating rules.',
    questions: [
      question('le-business-line-boundary', 'What observation determines which Local Effort business line owns an opportunity?', 'Clarify a Local Effort routing concept for later structured rules.', ['What ambiguous case tests the boundary?', 'Where is the final assignment recorded?'], { allowedScope: ['local_effort'], reviewIntervalMonths: 12 }),
      question('le-qualified-inquiry', 'What makes an inquiry operationally qualified for Local Effort?', 'Define a business-specific term without mutating lead records.', ['What disqualifying evidence matters?', 'Which system records qualification?'], { allowedScope: ['local_effort'], reviewIntervalMonths: 6 }),
      question('le-capacity-unit', 'What unit best represents usable capacity for the current Local Effort operating model?', 'Identify a candidate capacity definition for measurement.', ['Why is a simpler unit misleading?', 'What data could calculate the unit?'], { allowedScope: ['local_effort'], reviewIntervalMonths: 6 }),
      question('le-contribution-definition', 'Which contribution measure is most useful for comparing unlike Local Effort opportunities?', 'Capture the intended decision metric while leaving accounting truth in its source system.', ['Which costs belong in the comparison?', 'What constrained resource should be included?'], { allowedScope: ['local_effort'], reviewIntervalMonths: 6 }),
      question('le-service-standard', 'Which Local Effort service standard is hardest to infer from existing records?', 'Identify an operating standard that may need explicit governance.', ['What observable behavior represents it?', 'Who or what can verify it?'], { allowedScope: ['local_effort'], reviewIntervalMonths: 12 }),
      question('le-source-of-truth-gap', 'Which recurring decision is most harmed by uncertainty about the system of record?', 'Prioritize a data-definition or integration gap.', ['Which systems currently disagree?', 'Who resolves the discrepancy today?'], { allowedScope: ['local_effort'], reviewIntervalMonths: 6 }),
      question('le-operating-rule-expiry', 'Which current Local Effort operating rule is most likely to become stale soon?', 'Make a near-term rule review trigger explicit.', ['What change would make it stale?', 'When should it be reviewed?'], { allowedScope: ['local_effort'], reviewIntervalMonths: 3, reviewTrigger: 'Review on the stated trigger or within three months, whichever comes first.' }),
    ],
  },
  {
    id: 'data-software-rule-review',
    title: 'Data, software opportunities, and rule review',
    description: 'Identify useful instrumentation and automation while preserving human authority and system-of-record boundaries.',
    questions: [
      question('data-retyping-waste', 'Which recurring decision currently requires the most avoidable manual data gathering?', 'Prioritize an integration or reporting opportunity around a real decision.', ['Where does the data originate?', 'What decision would improve if it were available?']),
      question('software-feedback-loop', 'Which operating belief would benefit most from a prediction-and-outcome feedback loop?', 'Identify a calibration opportunity before proposing automation.', ['What prediction would be frozen in advance?', 'Which native outcome would evaluate it?']),
      question('automation-human-gate', 'Which proposed automation should always require an owner decision before acting?', 'Record an explicit human-authority boundary.', ['What harm could an automatic action cause?', 'What evidence should the owner review?']),
      question('data-capture-trigger', 'What event should trigger a small knowledge-capture prompt instead of another standing form?', 'Design lower-burden longitudinal capture around meaningful events.', ['Who observes the trigger?', 'What is the smallest useful record?']),
      question('rule-review-signal', 'What signal should cause a stored operating rule to return for review?', 'Define a correction and staleness trigger for future governed knowledge.', ['How could the signal be detected?', 'What happens while review is pending?']),
      question('data-do-not-centralize', 'Which data should not be copied into the Brain even if it could improve a decision?', 'Document minimization, confidentiality, licensing, or system-of-record boundaries.', ['Where should the data remain?', 'Can a content-free reference meet the need?']),
    ],
  },
];

const OWNER_INTERVIEW_DEFINITION = Object.freeze({
  interviewKey: 'restaurateur-knowledge',
  version: 1,
  title: 'Restaurateur Knowledge Interview',
  description: 'A private, owner-authored record of decision context, operating experience, and uncertainty for later review.',
  privacyNotice: 'Private draft evidence · not Brain truth. Do not enter named customer details, contact information, health or dietary details, credentials, payment data, or licensed source text.',
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
