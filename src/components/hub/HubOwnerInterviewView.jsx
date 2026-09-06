import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  RotateCcw,
  Save,
} from 'lucide-react';

const KNOWLEDGE_KINDS = [
  { value: 'observed_fact', label: 'Observed fact', help: 'Something directly measured, recorded, or witnessed.' },
  { value: 'owner_experience', label: 'Owner experience', help: 'What you have learned through repeated work.' },
  { value: 'judgment_heuristic', label: 'Judgment or rule of thumb', help: 'A decision rule with boundaries and exceptions.' },
  { value: 'hypothesis', label: 'Hypothesis', help: 'A possibility that still needs testing or corroboration.' },
  { value: 'external_claim', label: 'External claim', help: 'Something learned from a person, document, or other source.' },
];

const CONFIDENCE_LEVELS = [
  { value: 'firm', label: 'Firm', help: 'You would rely on this now in the stated scope.' },
  { value: 'context_dependent', label: 'Context-dependent', help: 'Usually useful when the named conditions hold.' },
  { value: 'tentative', label: 'Tentative', help: 'Worth retaining, but it needs testing or corroboration.' },
];

const APPLICABILITY_OPTIONS = [
  { value: 'general_food_industry', label: 'General food industry' },
  { value: 'twin_cities', label: 'Twin Cities' },
  { value: 'local_effort', label: 'Local Effort' },
];

const SENSITIVITY_OPTIONS = [
  { value: 'internal', label: 'Internal', help: 'Normal internal working knowledge.' },
  { value: 'confidential_business', label: 'Confidential business', help: 'Private operating knowledge; the safe default.' },
  { value: 'external_shareable', label: 'External-shareable', help: 'Suitable to share outside Local Effort after review.' },
];

function emptyDraft() {
  return {
    responseText: '',
    knowledgeKind: '',
    confidence: '',
    applicability: [],
    asOfDate: '',
    sourceReference: '',
    caveats: '',
    sensitivity: 'confidential_business',
    disposition: 'draft',
  };
}

function answerToDraft(answer) {
  if (!answer) return emptyDraft();
  return {
    responseText: answer.responseText || '',
    knowledgeKind: answer.knowledgeKind || '',
    confidence: answer.confidence || '',
    applicability: Array.isArray(answer.applicability) ? answer.applicability : [],
    asOfDate: answer.asOfDate ? String(answer.asOfDate).slice(0, 10) : '',
    sourceReference: answer.sourceReference || '',
    caveats: answer.caveats || '',
    sensitivity: answer.sensitivity || 'confidential_business',
    disposition: answer.disposition || 'draft',
  };
}

function draftSignature(draft) {
  return JSON.stringify({
    responseText: draft.responseText,
    knowledgeKind: draft.knowledgeKind,
    confidence: draft.confidence,
    applicability: [...draft.applicability].sort(),
    asOfDate: draft.asOfDate,
    sourceReference: draft.sourceReference,
    caveats: draft.caveats,
    sensitivity: draft.sensitivity,
    disposition: draft.disposition,
  });
}

function contentSignature(draft) {
  return JSON.stringify({
    responseText: draft.responseText,
    knowledgeKind: draft.knowledgeKind,
    confidence: draft.confidence,
    applicability: [...draft.applicability].sort(),
    asOfDate: draft.asOfDate,
    sourceReference: draft.sourceReference,
    caveats: draft.caveats,
    sensitivity: draft.sensitivity,
  });
}

function flattenDefinition(definition) {
  return (definition?.modules || []).flatMap((module) =>
    (module.questions || []).map((question) => ({ module, question })),
  );
}

function formatSavedTime(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function humanize(value) {
  return String(value || '').replaceAll('_', ' ');
}

function requestErrorMessage(payload, fallback) {
  if (typeof payload?.error === 'string') return payload.error;
  if (payload?.error?.message) return payload.error.message;
  return fallback;
}

async function interviewRequest(path, accessToken, options = {}) {
  const devApiRoot = import.meta.env.DEV && typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : '';
  const response = await fetch(`${devApiRoot}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(requestErrorMessage(payload, 'The interview request failed.'));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function answerStatus(answer) {
  if (!answer) return 'Not started';
  if (answer.disposition === 'answered') return 'Answered';
  if (answer.disposition === 'deferred') return 'Deferred';
  if (answer.disposition === 'not_known') return 'Not known';
  return 'Draft';
}

function isResolved(answer) {
  return ['answered', 'deferred', 'not_known'].includes(answer?.disposition);
}

function answerExcerpt(answer) {
  const text = String(answer?.responseText || '').trim().replace(/\s+/g, ' ');
  if (!text) {
    if (answer?.disposition === 'deferred') return 'Deferred without a note.';
    if (answer?.disposition === 'not_known') return 'Marked as not known.';
    return 'No response written yet.';
  }
  return text.length > 180 ? `${text.slice(0, 177)}…` : text;
}

function validateAnswered(question, draft) {
  const issues = [];
  const allowedScope = Array.isArray(question?.allowedScope) && question.allowedScope.length
    ? question.allowedScope
    : APPLICABILITY_OPTIONS.map((option) => option.value);

  if (!draft.responseText.trim()) issues.push({ field: 'response', message: 'Write a response before marking this answered.' });
  if (!KNOWLEDGE_KINDS.some((item) => item.value === draft.knowledgeKind)) {
    issues.push({ field: 'knowledge-kind', message: 'Choose what kind of knowledge this is.' });
  }
  if (!CONFIDENCE_LEVELS.some((item) => item.value === draft.confidence)) {
    issues.push({ field: 'confidence', message: 'Choose a confidence level.' });
  }
  if (!draft.applicability.length || draft.applicability.some((item) => !allowedScope.includes(item))) {
    issues.push({ field: 'applicability', message: 'Choose at least one scope allowed for this question.' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.asOfDate)) {
    issues.push({ field: 'as-of-date', message: 'Add the date this answer is current as of.' });
  }
  if (!SENSITIVITY_OPTIONS.some((item) => item.value === draft.sensitivity)) {
    issues.push({ field: 'sensitivity', message: 'Choose a sensitivity level.' });
  }
  if (['observed_fact', 'external_claim'].includes(draft.knowledgeKind) && !draft.sourceReference.trim()) {
    issues.push({ field: 'source-reference', message: 'Name the record, person, document, or source behind this claim.' });
  }
  if (['judgment_heuristic', 'hypothesis'].includes(draft.knowledgeKind) && !draft.caveats.trim()) {
    issues.push({ field: 'caveats', message: 'Describe the boundary, exception, or evidence that would change this view.' });
  }
  return issues;
}

function questionFieldId(questionId, field) {
  return `owner-interview-${String(questionId).replace(/[^a-zA-Z0-9_-]/g, '-')}-${field}`;
}

function ProgressSummary({ definition, answersByQuestion }) {
  const allQuestions = flattenDefinition(definition);
  const resolved = allQuestions.filter(({ question }) => isResolved(answersByQuestion.get(question.id))).length;
  return (
    <div className="hub-interview-overall-progress">
      <progress value={resolved} max={Math.max(allQuestions.length, 1)}>
        {resolved} of {allQuestions.length}
      </progress>
      <span>{resolved} resolved · {Math.max(0, allQuestions.length - resolved)} remaining</span>
    </div>
  );
}

export function OwnerInterviewView({ accessToken }) {
  const [phase, setPhase] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [definition, setDefinition] = useState(null);
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [currentQuestionId, setCurrentQuestionId] = useState('');
  const [draft, setDraft] = useState(emptyDraft);
  const [mode, setMode] = useState('question');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [savedAt, setSavedAt] = useState('');
  const [saveError, setSaveError] = useState(null);
  const [validationIssues, setValidationIssues] = useState([]);
  const [busy, setBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const definitionRef = useRef(null);
  const sessionRef = useRef(null);
  const answersRef = useRef([]);
  const currentQuestionRef = useRef('');
  const draftRef = useRef(emptyDraft());
  const savedSignatureRef = useRef('');
  const savePromiseRef = useRef(null);
  const autosaveBlockedRef = useRef('');
  const saveErrorRef = useRef(null);
  const errorRegionRef = useRef(null);
  const validationRegionRef = useRef(null);

  const allQuestions = useMemo(() => flattenDefinition(definition), [definition]);
  const answersByQuestion = useMemo(
    () => new Map(answers.map((answer) => [answer.questionId, answer])),
    [answers],
  );
  const currentEntry = useMemo(
    () => allQuestions.find(({ question }) => question.id === currentQuestionId) || allQuestions[0] || null,
    [allQuestions, currentQuestionId],
  );
  const currentIndex = currentEntry
    ? allQuestions.findIndex(({ question }) => question.id === currentEntry.question.id)
    : -1;

  const adoptResponse = useCallback((payload) => {
    if (payload.definition) {
      definitionRef.current = payload.definition;
      setDefinition(payload.definition);
    }
    if (payload.session) {
      sessionRef.current = payload.session;
      setSession(payload.session);
    }
    if (Array.isArray(payload.answers)) {
      answersRef.current = payload.answers;
      setAnswers(payload.answers);
    }
  }, []);

  const setQuestionLocally = useCallback((questionId, answerList = answersRef.current, nextDefinition = definitionRef.current) => {
    const entry = flattenDefinition(nextDefinition).find(({ question }) => question.id === questionId);
    if (!entry) return false;
    const answer = answerList.find((item) => item.questionId === questionId);
    const nextDraft = answerToDraft(answer);
    currentQuestionRef.current = questionId;
    draftRef.current = nextDraft;
    savedSignatureRef.current = draftSignature(nextDraft);
    autosaveBlockedRef.current = '';
    saveErrorRef.current = null;
    setCurrentQuestionId(questionId);
    setDraft(nextDraft);
    setSaveError(null);
    setValidationIssues([]);
    setSavedAt(answer?.updatedAt || '');
    setSaveStatus(answer ? 'saved' : 'idle');
    setMode('question');

    const url = new URL(window.location.href);
    url.pathname = '/hub/interview';
    url.searchParams.set('module', entry.module.id);
    url.searchParams.set('question', questionId);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
    return true;
  }, []);

  const loadInterview = useCallback(async () => {
    setPhase('loading');
    setLoadError('');
    setReviewError('');
    try {
      const payload = await interviewRequest('/api/brain/owner-interview/sessions', accessToken, { method: 'POST' });
      adoptResponse(payload);
      const entries = flattenDefinition(payload.definition);
      if (!entries.length) {
        setPhase('empty');
        return;
      }
      setPhase('ready');
      if (payload.session?.status === 'submitted') {
        setMode('receipt');
        return;
      }
      const requestedId = new URLSearchParams(window.location.search).get('question');
      const requestedExists = entries.some(({ question }) => question.id === requestedId);
      const currentExists = entries.some(({ question }) => question.id === payload.session?.currentQuestionId);
      const firstUnresolved = entries.find(({ question }) => {
        const answer = (payload.answers || []).find((item) => item.questionId === question.id);
        return !isResolved(answer);
      });
      const questionId = requestedExists
        ? requestedId
        : currentExists
        ? payload.session.currentQuestionId
        : firstUnresolved?.question.id || entries[0].question.id;
      setQuestionLocally(questionId, payload.answers || [], payload.definition);
    } catch (error) {
      setLoadError(error.message || 'Unable to load the owner interview.');
      setPhase('error');
    }
  }, [accessToken, adoptResponse, setQuestionLocally]);

  useEffect(() => {
    loadInterview();
  }, [loadInterview]);

  useEffect(() => {
    if (phase !== 'ready' || mode !== 'question' || session?.status === 'submitted' || !currentQuestionId) return undefined;
    const signature = draftSignature(draft);
    if (signature === savedSignatureRef.current) return undefined;
    setSaveStatus('unsaved');
    if (autosaveBlockedRef.current) return undefined;
    const timer = window.setTimeout(() => {
      const form = document.getElementById('owner-interview-form');
      if (form) form.dispatchEvent(new CustomEvent('owner-interview-autosave'));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [currentQuestionId, draft, mode, phase, session?.status]);

  useEffect(() => {
    if (!saveError) return;
    errorRegionRef.current?.focus();
  }, [saveError]);

  useEffect(() => {
    if (!validationIssues.length) return;
    validationRegionRef.current?.focus();
  }, [validationIssues]);

  const updateDraft = (field, value) => {
    setDraft((current) => {
      const next = { ...current, [field]: value, disposition: 'draft' };
      draftRef.current = next;
      return next;
    });
    setValidationIssues([]);
    if (autosaveBlockedRef.current !== 'conflict') {
      autosaveBlockedRef.current = '';
      saveErrorRef.current = null;
      setSaveError(null);
    }
  };

  const saveCurrent = useCallback(async (disposition = 'draft', { force = false } = {}) => {
    if (!sessionRef.current || !currentQuestionRef.current) return { ok: false, exact: false };
    if (!force && autosaveBlockedRef.current) return { ok: false, exact: false };

    if (savePromiseRef.current) {
      try { await savePromiseRef.current; } catch (_error) { /* the visible error is handled by its owner */ }
    }

    const questionId = currentQuestionRef.current;
    const sourceDraft = draftRef.current;
    const sourceContentSignature = contentSignature(sourceDraft);
    const body = { ...sourceDraft, disposition, expectedRevision: sessionRef.current.revision };
    setBusy(true);
    setSaveStatus('saving');
    setSaveError(null);
    saveErrorRef.current = null;

    const request = interviewRequest(
      `/api/brain/owner-interview/sessions/${encodeURIComponent(sessionRef.current.id)}/answers/${encodeURIComponent(questionId)}`,
      accessToken,
      { method: 'PUT', body: JSON.stringify(body) },
    );
    savePromiseRef.current = request;

    try {
      const payload = await request;
      adoptResponse(payload);
      autosaveBlockedRef.current = '';
      const savedAnswer = (payload.answers || []).find((answer) => answer.questionId === questionId);
      const normalized = answerToDraft(savedAnswer || { ...body, updatedAt: new Date().toISOString() });
      const exact = currentQuestionRef.current === questionId
        && contentSignature(draftRef.current) === sourceContentSignature;

      if (currentQuestionRef.current === questionId) {
        savedSignatureRef.current = draftSignature(normalized);
        setSavedAt(savedAnswer?.updatedAt || new Date().toISOString());
        if (exact) {
          draftRef.current = normalized;
          setDraft(normalized);
          setSaveStatus('saved');
        } else {
          setSaveStatus('unsaved');
        }
      }
      return { ok: true, exact, payload };
    } catch (error) {
      const conflict = error.status === 409;
      if (conflict && error.payload?.session) {
        sessionRef.current = error.payload.session;
        setSession(error.payload.session);
      }
      const nextError = {
        kind: conflict ? 'conflict' : 'save',
        message: conflict
          ? 'A newer server revision exists. Compare it before deciding which version to keep.'
          : error.message || 'The answer could not be saved.',
        authoritativeAnswer: error.payload?.answer || null,
      };
      autosaveBlockedRef.current = conflict ? 'conflict' : 'error';
      saveErrorRef.current = nextError;
      setSaveError(nextError);
      setSaveStatus('error');
      return { ok: false, exact: false, error };
    } finally {
      if (savePromiseRef.current === request) savePromiseRef.current = null;
      setBusy(false);
    }
  }, [accessToken, adoptResponse]);

  useEffect(() => {
    const form = document.getElementById('owner-interview-form');
    if (!form) return undefined;
    const autosave = () => { saveCurrent('draft'); };
    form.addEventListener('owner-interview-autosave', autosave);
    return () => form.removeEventListener('owner-interview-autosave', autosave);
  }, [mode, saveCurrent]);

  const navigateToQuestion = useCallback(async (questionId, { skipDraftSave = false } = {}) => {
    if (!questionId || questionId === currentQuestionRef.current || busy) return false;
    if (!skipDraftSave && draftSignature(draftRef.current) !== savedSignatureRef.current) {
      const saved = await saveCurrent('draft');
      if (!saved.ok || !saved.exact) return false;
    }

    setBusy(true);
    setReviewError('');
    try {
      const payload = await interviewRequest(
        `/api/brain/owner-interview/sessions/${encodeURIComponent(sessionRef.current.id)}`,
        accessToken,
        {
          method: 'PATCH',
          body: JSON.stringify({
            currentQuestionId: questionId,
            expectedRevision: sessionRef.current.revision,
          }),
        },
      );
      adoptResponse(payload);
      setQuestionLocally(questionId, payload.answers || answersRef.current, payload.definition || definitionRef.current);
      return true;
    } catch (error) {
      if (error.status === 409 && error.payload?.session) {
        sessionRef.current = error.payload.session;
        setSession(error.payload.session);
      }
      const nextError = {
        kind: 'navigation',
        message: error.status === 409
          ? 'The saved interview position changed in another window. Your answer is saved; choose the question again to continue.'
          : error.message || 'The question could not be opened.',
        authoritativeAnswer: null,
      };
      saveErrorRef.current = nextError;
      setSaveError(nextError);
      setSaveStatus('error');
      return false;
    } finally {
      setBusy(false);
    }
  }, [accessToken, adoptResponse, busy, saveCurrent, setQuestionLocally]);

  const continueAfterSave = async (payload) => {
    const latestAnswers = payload?.answers || answersRef.current;
    const currentPosition = flattenDefinition(payload?.definition || definitionRef.current)
      .findIndex(({ question }) => question.id === currentQuestionRef.current);
    const entries = flattenDefinition(payload?.definition || definitionRef.current);
    const nextUnresolved = [
      ...entries.slice(currentPosition + 1),
      ...entries.slice(0, currentPosition),
    ].find(({ question }) => !isResolved(latestAnswers.find((answer) => answer.questionId === question.id)));

    if (nextUnresolved) {
      await navigateToQuestion(nextUnresolved.question.id, { skipDraftSave: true });
    } else {
      setMode('review');
      setReviewError('');
    }
  };

  const submitAnswered = async (event) => {
    event.preventDefault();
    const issues = validateAnswered(currentEntry?.question, draftRef.current);
    if (issues.length) {
      setValidationIssues(issues);
      return;
    }
    const result = await saveCurrent('answered', { force: true });
    if (result.ok && result.exact) await continueAfterSave(result.payload);
  };

  const saveDisposition = async (disposition) => {
    const result = await saveCurrent(disposition, { force: true });
    if (result.ok && result.exact) await continueAfterSave(result.payload);
  };

  const openReview = async () => {
    if (draftSignature(draftRef.current) !== savedSignatureRef.current) {
      const result = await saveCurrent('draft');
      if (!result.ok || !result.exact) return;
    }
    setReviewError('');
    setMode('review');
  };

  const useAuthoritativeAnswer = () => {
    if (saveErrorRef.current?.kind !== 'conflict') return;
    const serverAnswer = saveErrorRef.current.authoritativeAnswer;
    const nextDraft = answerToDraft(serverAnswer);
    const nextAnswers = serverAnswer
      ? [...answersRef.current.filter((answer) => answer.questionId !== serverAnswer.questionId), serverAnswer]
      : answersRef.current.filter((answer) => answer.questionId !== currentQuestionRef.current);
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    draftRef.current = nextDraft;
    savedSignatureRef.current = draftSignature(nextDraft);
    autosaveBlockedRef.current = '';
    saveErrorRef.current = null;
    setDraft(nextDraft);
    setSaveError(null);
    setSaveStatus(serverAnswer ? 'saved' : 'idle');
    setSavedAt(serverAnswer?.updatedAt || '');
  };

  const retrySave = async () => {
    autosaveBlockedRef.current = '';
    await saveCurrent('draft', { force: true });
  };

  const completeInterview = async () => {
    const currentAnswers = answersRef.current;
    const incomplete = flattenDefinition(definitionRef.current)
      .filter(({ question }) => !isResolved(currentAnswers.find((answer) => answer.questionId === question.id)));
    if (incomplete.length) {
      setReviewError(`${incomplete.length} question${incomplete.length === 1 ? '' : 's'} still need an answer, defer, or not-known decision.`);
      return;
    }
    setBusy(true);
    setReviewError('');
    try {
      const payload = await interviewRequest(
        `/api/brain/owner-interview/sessions/${encodeURIComponent(sessionRef.current.id)}/complete`,
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({ expectedRevision: sessionRef.current.revision }),
        },
      );
      adoptResponse(payload);
      setMode('receipt');
    } catch (error) {
      if (error.status === 409 && error.payload?.session) {
        sessionRef.current = error.payload.session;
        setSession(error.payload.session);
      }
      setReviewError(error.status === 409
        ? 'The interview changed in another window. Review the current server revision before submitting again.'
        : error.message || 'The interview could not be submitted.');
    } finally {
      setBusy(false);
    }
  };

  const reopenInterview = async () => {
    setBusy(true);
    setReviewError('');
    try {
      const payload = await interviewRequest(
        `/api/brain/owner-interview/sessions/${encodeURIComponent(sessionRef.current.id)}/reopen`,
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({ expectedRevision: sessionRef.current.revision }),
        },
      );
      adoptResponse(payload);
      const entries = flattenDefinition(payload.definition);
      const questionId = payload.session?.currentQuestionId
        || entries.find(({ question }) => !isResolved((payload.answers || []).find((answer) => answer.questionId === question.id)))?.question.id
        || entries[0]?.question.id;
      if (questionId) setQuestionLocally(questionId, payload.answers || [], payload.definition);
    } catch (error) {
      if (error.status === 409 && error.payload?.session) {
        sessionRef.current = error.payload.session;
        setSession(error.payload.session);
      }
      setReviewError(error.status === 409
        ? 'The interview changed in another window. Reload it before reopening.'
        : error.message || 'The interview could not be reopened.');
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'loading') {
    return (
      <section className="hub-interview-state" aria-live="polite">
        <ClipboardList size={20} aria-hidden="true" />
        <div>
          <strong>Loading your owner interview…</strong>
          <p>Private draft evidence · not Brain truth.</p>
        </div>
      </section>
    );
  }

  if (phase === 'error') {
    return (
      <section className="hub-interview-state hub-interview-state-error" role="alert">
        <AlertTriangle size={20} aria-hidden="true" />
        <div>
          <strong>The owner interview could not be loaded.</strong>
          <p>{loadError}</p>
          <button type="button" onClick={loadInterview}>Try again</button>
        </div>
      </section>
    );
  }

  if (phase === 'empty') {
    return (
      <section className="hub-interview-state">
        <ClipboardList size={20} aria-hidden="true" />
        <div>
          <strong>No interview questions are ready.</strong>
          <p>Nothing was saved or added to Brain. Try again after a reviewed definition is published.</p>
          <button type="button" onClick={loadInterview}>Check again</button>
        </div>
      </section>
    );
  }

  if (mode === 'receipt') {
    const submittedAnswers = answers.filter((answer) => isResolved(answer));
    const answeredCount = answers.filter((answer) => answer.disposition === 'answered').length;
    const deferredCount = answers.filter((answer) => answer.disposition === 'deferred').length;
    const notKnownCount = answers.filter((answer) => answer.disposition === 'not_known').length;
    return (
      <section className="hub-interview">
        <div className="hub-interview-boundary">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>Submitted interview evidence · still not Brain truth</span>
        </div>
        <article className="hub-panel hub-interview-receipt" aria-labelledby="owner-interview-receipt-title">
          <div className="hub-interview-receipt-mark"><Check size={24} aria-hidden="true" /></div>
          <div>
            <p className="hub-interview-kicker">Submission receipt</p>
            <h2 id="owner-interview-receipt-title">Your interview evidence is saved for review.</h2>
            <p>
              {submittedAnswers.length} interview answers saved; {answeredCount} answered; {deferredCount} deferred; {notKnownCount} marked not known.
              {' '}<strong>No Brain assertions were created.</strong>
            </p>
            {session?.submittedAt && <small>Submitted {new Date(session.submittedAt).toLocaleString('en-US')} · definition {session.definitionVersion}</small>}
          </div>
          <div className="hub-interview-receipt-actions">
            <button type="button" onClick={() => setMode('review')}>Review submitted answers</button>
            <button className="hub-primary-button" type="button" onClick={reopenInterview} disabled={busy}>
              <RotateCcw size={15} aria-hidden="true" />
              {busy ? 'Reopening…' : 'Reopen interview'}
            </button>
          </div>
          {reviewError && <p className="hub-interview-inline-error" role="alert">{reviewError}</p>}
        </article>
      </section>
    );
  }

  if (mode === 'review') {
    const resolvedCount = allQuestions.filter(({ question }) => isResolved(answersByQuestion.get(question.id))).length;
    const submitted = session?.status === 'submitted';
    return (
      <section className="hub-interview">
        <div className="hub-interview-boundary">
          <ClipboardList size={18} aria-hidden="true" />
          <span>{submitted ? 'Submitted evidence' : 'Private draft evidence'} · not Brain truth</span>
        </div>
        <article className="hub-panel hub-interview-review" aria-labelledby="owner-interview-review-title">
          <header className="hub-interview-review-head">
            <div>
              <p className="hub-interview-kicker">Review exact answers and provenance</p>
              <h2 id="owner-interview-review-title">Review owner interview</h2>
              <p>{resolvedCount} of {allQuestions.length} questions have a final disposition.</p>
            </div>
            <ProgressSummary definition={definition} answersByQuestion={answersByQuestion} />
          </header>

          <div className="hub-interview-review-list">
            {(definition.modules || []).map((module) => (
              <section key={module.id} className="hub-interview-review-module" aria-labelledby={`review-module-${module.id}`}>
                <h3 id={`review-module-${module.id}`}>{module.title}</h3>
                {(module.questions || []).map((question) => {
                  const answer = answersByQuestion.get(question.id);
                  const issues = answer?.disposition === 'answered'
                    ? validateAnswered(question, answerToDraft(answer))
                    : answer?.disposition === 'draft' || !answer
                    ? [{ message: 'Needs an answer, defer, or not-known decision.' }]
                    : [];
                  return (
                    <div className="hub-interview-review-row" key={question.id}>
                      <div>
                        <strong>{question.prompt}</strong>
                        <p>{answerExcerpt(answer)}</p>
                        <dl>
                          <div><dt>Status</dt><dd>{answerStatus(answer)}</dd></div>
                          {answer?.knowledgeKind && <div><dt>Kind</dt><dd>{KNOWLEDGE_KINDS.find((item) => item.value === answer.knowledgeKind)?.label || humanize(answer.knowledgeKind)}</dd></div>}
                          {answer?.confidence && <div><dt>Confidence</dt><dd>{CONFIDENCE_LEVELS.find((item) => item.value === answer.confidence)?.label || humanize(answer.confidence)}</dd></div>}
                          {answer?.applicability?.length > 0 && <div><dt>Scope</dt><dd>{answer.applicability.map((value) => APPLICABILITY_OPTIONS.find((item) => item.value === value)?.label || humanize(value)).join(', ')}</dd></div>}
                        </dl>
                        {issues.length > 0 && <p className="hub-interview-review-issue">{issues[0].message}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateToQuestion(question.id)}
                        disabled={busy || submitted}
                        aria-label={`Edit: ${question.prompt}`}
                      >
                        Edit <ChevronRight size={14} aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </section>
            ))}
          </div>

          <footer className="hub-interview-review-actions">
            {submitted ? (
              <>
                <p>This receipt remains reviewable. Reopen before changing an answer.</p>
                <button type="button" onClick={() => setMode('receipt')}>Back to receipt</button>
                <button className="hub-primary-button" type="button" onClick={reopenInterview} disabled={busy}>
                  <RotateCcw size={15} aria-hidden="true" /> {busy ? 'Reopening…' : 'Reopen interview'}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setQuestionLocally(currentQuestionRef.current || allQuestions[0]?.question.id)}>Back to questions</button>
                <button className="hub-primary-button" type="button" onClick={completeInterview} disabled={busy || resolvedCount !== allQuestions.length}>
                  {busy ? 'Submitting…' : 'Submit interview evidence'}
                </button>
              </>
            )}
          </footer>
          <p className="hub-interview-submit-note">Submission freezes these answer revisions for review. It does not create facts, assertions, or operational changes.</p>
          {reviewError && <p className="hub-interview-inline-error" role="alert">{reviewError}</p>}
        </article>
      </section>
    );
  }

  if (!currentEntry) return null;

  const { module: currentModule, question } = currentEntry;
  const moduleQuestions = currentModule.questions || [];
  const modulePosition = moduleQuestions.findIndex((item) => item.id === question.id) + 1;
  const moduleAnswers = moduleQuestions.map((item) => answersByQuestion.get(item.id));
  const moduleResolved = moduleAnswers.filter(isResolved).length;
  const moduleDeferred = moduleAnswers.filter((answer) => answer?.disposition === 'deferred').length;
  const moduleRemaining = moduleQuestions.length - moduleResolved;
  const allowedScope = Array.isArray(question.allowedScope) && question.allowedScope.length
    ? APPLICABILITY_OPTIONS.filter((option) => question.allowedScope.includes(option.value))
    : APPLICABILITY_OPTIONS;
  const sourceRequired = ['observed_fact', 'external_claim'].includes(draft.knowledgeKind);
  const caveatsRequired = ['judgment_heuristic', 'hypothesis'].includes(draft.knowledgeKind);
  const saveStatusText = saveStatus === 'saving'
    ? 'Saving…'
    : saveStatus === 'saved'
    ? `Saved${formatSavedTime(savedAt) ? ` ${formatSavedTime(savedAt)}` : ''}`
    : saveStatus === 'error'
    ? 'Error'
    : saveStatus === 'unsaved'
    ? 'Unsaved'
    : 'No draft yet';

  return (
    <section className="hub-interview">
      <div className="hub-interview-boundary">
        <ClipboardList size={18} aria-hidden="true" />
        <span>Private draft evidence · not Brain truth</span>
      </div>

      <form id="owner-interview-form" className="hub-interview-layout" onSubmit={submitAnswered}>
        <aside className="hub-panel hub-interview-rail" aria-label="Interview questions">
          <header>
            <div>
              <strong>{definition.title || 'Owner interview'}</strong>
              <span>Definition {definition.version}</span>
            </div>
            <ProgressSummary definition={definition} answersByQuestion={answersByQuestion} />
          </header>
          <nav aria-label="Modules and questions">
            {(definition.modules || []).map((module) => {
              const resolved = (module.questions || []).filter((item) => isResolved(answersByQuestion.get(item.id))).length;
              return (
                <details key={module.id} open={module.id === currentModule.id}>
                  <summary>
                    <span>{module.title}</span>
                    <small>{resolved}/{module.questions?.length || 0}</small>
                  </summary>
                  <ol>
                    {(module.questions || []).map((item) => {
                      const status = answerStatus(answersByQuestion.get(item.id));
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            className={item.id === question.id ? 'is-active' : ''}
                            onClick={() => navigateToQuestion(item.id)}
                            disabled={busy}
                            aria-current={item.id === question.id ? 'step' : undefined}
                          >
                            <span>{item.prompt}</span>
                            <small>{status}</small>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </details>
              );
            })}
          </nav>
          <button className="hub-interview-review-link" type="button" onClick={openReview} disabled={busy}>
            Review all answers <ChevronRight size={14} aria-hidden="true" />
          </button>
        </aside>

        <article className="hub-panel hub-interview-sheet" aria-labelledby="owner-interview-question-title">
          <header className="hub-interview-question-head">
            <div>
              <p className="hub-interview-kicker">{currentModule.title}</p>
              <p className="hub-interview-position">Question {modulePosition} of {moduleQuestions.length} in this module</p>
            </div>
            <div className="hub-interview-module-progress">
              <progress value={moduleResolved} max={Math.max(moduleQuestions.length, 1)}>
                {moduleResolved} of {moduleQuestions.length}
              </progress>
              <span>{moduleResolved} resolved · {moduleDeferred} deferred · {moduleRemaining} remaining</span>
            </div>
          </header>

          <div className="hub-interview-prompt">
            <h2 id="owner-interview-question-title">{question.prompt}</h2>
            {question.purpose && (
              <div className="hub-interview-purpose">
                <strong>Why this is useful</strong>
                <p>{question.purpose}</p>
              </div>
            )}
            {question.probes?.length > 0 && (
              <details className="hub-interview-probes">
                <summary>Optional prompts if useful</summary>
                <p>Start with what comes to mind. These neutral prompts are here only if you want another way in.</p>
                <ul>
                  {question.probes.map((probe, index) => <li key={`${question.id}-probe-${index}`}>{typeof probe === 'string' ? probe : probe?.prompt || humanize(probe)}</li>)}
                </ul>
              </details>
            )}
          </div>

          <label className="hub-interview-response" htmlFor={questionFieldId(question.id, 'response')}>
            <span>Your exact response</span>
            <textarea
              id={questionFieldId(question.id, 'response')}
              value={draft.responseText}
              onChange={(event) => updateDraft('responseText', event.target.value)}
              placeholder="Write what you know, including context and exceptions."
              rows={12}
              spellCheck="true"
              aria-describedby={`${questionFieldId(question.id, 'response')}-help`}
            />
            <small id={`${questionFieldId(question.id, 'response')}-help`}>Plain text is saved exactly as written. Avoid customer names, health details, contact information, or pasted private records.</small>
          </label>

          {validationIssues.length > 0 && (
            <div className="hub-interview-validation" role="alert" tabIndex="-1" ref={validationRegionRef}>
              <strong>Finish the provenance before continuing.</strong>
              <ul>{validationIssues.map((issue) => <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>)}</ul>
            </div>
          )}

          {saveError && (
            <div className="hub-interview-save-error" role="alert" tabIndex="-1" ref={errorRegionRef}>
              <AlertTriangle size={18} aria-hidden="true" />
              <div>
                <strong>{saveError.kind === 'navigation' ? 'Question not changed.' : 'Not saved. Your text is still here.'}</strong>
                <p>{saveError.message}</p>
                {saveError.kind === 'conflict' && saveError.authoritativeAnswer && (
                  <details>
                    <summary>Compare the current server version</summary>
                    <p>{answerExcerpt(saveError.authoritativeAnswer)}</p>
                    <small>Saved {formatSavedTime(saveError.authoritativeAnswer.updatedAt) || 'on the server'} · {answerStatus(saveError.authoritativeAnswer)}</small>
                  </details>
                )}
                <div>
                  {saveError.kind !== 'navigation' && <button type="button" onClick={retrySave} disabled={busy}>Retry with my text</button>}
                  {saveError.kind === 'conflict' && <button type="button" onClick={useAuthoritativeAnswer} disabled={busy}>Use server version</button>}
                  {saveError.kind === 'navigation' && <button type="button" onClick={() => setSaveError(null)}>Dismiss</button>}
                </div>
              </div>
            </div>
          )}

          <footer className="hub-interview-actions">
            <div className="hub-interview-secondary-actions">
              <button
                type="button"
                onClick={() => navigateToQuestion(allQuestions[currentIndex - 1]?.question.id)}
                disabled={busy || currentIndex <= 0}
              >
                <ArrowLeft size={15} aria-hidden="true" /> Previous
              </button>
              <button type="button" onClick={() => saveDisposition('deferred')} disabled={busy}>Defer</button>
              <button type="button" onClick={() => saveDisposition('not_known')} disabled={busy}>Not something I know</button>
            </div>
            <div className="hub-interview-save-actions">
              <span className={`is-${saveStatus}`} role="status" aria-live="polite">{saveStatusText}</span>
              <button className="hub-primary-button" type="submit" disabled={busy || saveStatus === 'error'}>
                {busy ? <Save size={15} aria-hidden="true" /> : <ArrowRight size={15} aria-hidden="true" />}
                {busy ? 'Saving…' : 'Save and continue'}
              </button>
            </div>
          </footer>
        </article>

        <aside className="hub-panel hub-interview-provenance" aria-label="Provenance and handling">
          <header>
            <strong>Provenance</strong>
            <span>Required to mark answered</span>
          </header>

          <fieldset id={questionFieldId(question.id, 'knowledge-kind')}>
            <legend>What kind of knowledge is this?</legend>
            {KNOWLEDGE_KINDS.map((item) => (
              <label key={item.value}>
                <input
                  type="radio"
                  name={`${question.id}-knowledge-kind`}
                  value={item.value}
                  checked={draft.knowledgeKind === item.value}
                  onChange={() => updateDraft('knowledgeKind', item.value)}
                />
                <span>{item.label}<small>{item.help}</small></span>
              </label>
            ))}
          </fieldset>

          <fieldset id={questionFieldId(question.id, 'confidence')}>
            <legend>How firmly should this be held?</legend>
            {CONFIDENCE_LEVELS.map((item) => (
              <label key={item.value}>
                <input
                  type="radio"
                  name={`${question.id}-confidence`}
                  value={item.value}
                  checked={draft.confidence === item.value}
                  onChange={() => updateDraft('confidence', item.value)}
                />
                <span>{item.label}<small>{item.help}</small></span>
              </label>
            ))}
          </fieldset>

          <fieldset id={questionFieldId(question.id, 'applicability')}>
            <legend>Where does this apply?</legend>
            {allowedScope.map((item) => (
              <label key={item.value}>
                <input
                  type="checkbox"
                  checked={draft.applicability.includes(item.value)}
                  onChange={(event) => updateDraft(
                    'applicability',
                    event.target.checked
                      ? [...draft.applicability, item.value]
                      : draft.applicability.filter((value) => value !== item.value),
                  )}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </fieldset>

          <label className="hub-interview-field" htmlFor={questionFieldId(question.id, 'as-of-date')}>
            <span>Current as of</span>
            <input
              id={questionFieldId(question.id, 'as-of-date')}
              type="date"
              value={draft.asOfDate}
              onChange={(event) => updateDraft('asOfDate', event.target.value)}
            />
            {question.freshness?.reviewIntervalMonths && <small>Review interval: {question.freshness.reviewIntervalMonths} months.</small>}
          </label>

          <label className="hub-interview-field" htmlFor={questionFieldId(question.id, 'source-reference')}>
            <span>Source reference{sourceRequired ? ' · required' : ' · if useful'}</span>
            <input
              id={questionFieldId(question.id, 'source-reference')}
              type="text"
              value={draft.sourceReference}
              onChange={(event) => updateDraft('sourceReference', event.target.value)}
              placeholder="Record, person, document, or URL"
            />
            <small>Reference the source; do not paste sensitive source content.</small>
          </label>

          <label className="hub-interview-field" htmlFor={questionFieldId(question.id, 'caveats')}>
            <span>Boundaries and caveats{caveatsRequired ? ' · required' : ''}</span>
            <textarea
              id={questionFieldId(question.id, 'caveats')}
              value={draft.caveats}
              onChange={(event) => updateDraft('caveats', event.target.value)}
              rows={4}
              placeholder="When does this vary, fail, or need another check?"
            />
          </label>

          <fieldset id={questionFieldId(question.id, 'sensitivity')}>
            <legend>How should this be handled?</legend>
            {SENSITIVITY_OPTIONS.map((item) => (
              <label key={item.value}>
                <input
                  type="radio"
                  name={`${question.id}-sensitivity`}
                  value={item.value}
                  checked={draft.sensitivity === item.value}
                  onChange={() => updateDraft('sensitivity', item.value)}
                />
                <span>{item.label}<small>{item.help}</small></span>
              </label>
            ))}
          </fieldset>
        </aside>
      </form>
    </section>
  );
}
