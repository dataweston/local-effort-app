import React from 'react';
import { Helmet } from 'react-helmet-async';
import '../styles/intake-for-kara.css';
import { INTAKE_FOR_KARA_QUESTIONS } from '../data/intakeForKaraQuestions';

const IntakeForKaraQuestionsPage = () => {
  return (
    <div className="intake-kara">
      <Helmet>
        <title>Intake For Kara - Questions</title>
        <meta name="description" content="Editable list of intake questions for Kara." />
      </Helmet>

      <div className="intake-kara-shell intake-kara-shell-single">
        <main className="intake-kara-main">
          <div className="intake-kara-card">
            <div className="intake-kara-tag">Temporary Document</div>
            <h1>Intake for Kara: Questions</h1>
            <p>
              Edit the questions in <code>src/data/intakeForKaraQuestions.js</code>. This list mirrors the form.
            </p>
            <ol className="intake-kara-question-list">
              {INTAKE_FOR_KARA_QUESTIONS.map((q, idx) => (
                <li key={q.id} className="intake-kara-question-item">
                  <div className="intake-kara-question-index">{idx + 1}</div>
                  <div className="intake-kara-question-body">
                    <div className="intake-kara-question-title">
                      {q.prompt || q.title}
                    </div>
                    <div className="intake-kara-question-meta">
                      <span>{q.category}</span>
                      <span>{q.type}</span>
                      {q.required ? <span>required</span> : <span>optional</span>}
                    </div>
                    {q.options && (
                      <div className="intake-kara-question-options">
                        {q.options.join(' • ')}
                      </div>
                    )}
                    {q.placeholder && (
                      <div className="intake-kara-question-placeholder">
                        Placeholder: {q.placeholder}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </main>
      </div>
    </div>
  );
};

export default IntakeForKaraQuestionsPage;
