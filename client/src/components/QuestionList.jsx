import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { surveyAPI, questionAPI, exportAPI } from '../services/api';

const QuestionList = () => {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [surveyData, questionsData] = await Promise.all([
        surveyAPI.getById(surveyId),
        questionAPI.getAll(surveyId)
      ]);
      setSurvey(surveyData);
      setQuestions(questionsData);
      setError(null);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (questionId) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await questionAPI.delete(surveyId, questionId);
        loadData();
      } catch (err) {
        alert('Failed to delete question');
        console.error(err);
      }
    }
  };

  const handleDuplicate = async (questionId) => {
    try {
      const duplicatedQuestion = await questionAPI.duplicate(surveyId, questionId);
      loadData();
      alert(`Question duplicated successfully as ${duplicatedQuestion.questionId}`);
      // Navigate to edit the duplicated question
      navigate(`/surveys/${surveyId}/questions/${duplicatedQuestion.questionId}/edit`);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to duplicate question';
      alert(errorMessage);
      console.error(err);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportAPI.download(surveyId);
      alert('Excel file downloaded successfully');
    } catch (err) {
      alert('Failed to export survey');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!survey) {
    return <div className="error-message">Survey not found</div>;
  }

  // Sort questions by ID (parent questions first, then child questions)
  const sortedQuestions = [...questions].sort((a, b) => {
    const aIsChild = a.questionId.includes('.');
    const bIsChild = b.questionId.includes('.');
    
    if (aIsChild && !bIsChild) return 1;
    if (!aIsChild && bIsChild) return -1;
    
    // Natural sort for IDs like Q1, Q2, Q10
    const aNum = parseFloat(a.questionId.replace('Q', ''));
    const bNum = parseFloat(b.questionId.replace('Q', ''));
    return aNum - bNum;
  });

  return (
    <div className="question-list-container">
      <div className="list-header">
        <div>
          <h2>Question Master</h2>
          <p className="survey-id-display">Survey: {survey.surveyName} (ID: {survey.surveyId})</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            Back to Surveys
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate(`/surveys/${surveyId}/preview`)}
            disabled={questions.length === 0}
          >
            Preview Survey
          </button>
          <button 
            className="btn btn-success"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Export to Excel'}
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => navigate(`/surveys/${surveyId}/questions/new`)}
          >
            Add Question
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {questions.length === 0 ? (
        <div className="empty-state">
          <p>No questions added yet. Click "Add Question" to get started.</p>
        </div>
      ) : (
        <div className="question-list">
          {sortedQuestions.map(question => (
            <div 
              key={question.questionId} 
              className={`question-card ${question.questionId.includes('.') ? 'child-question' : ''}`}
            >
              <div className="question-header">
                <div>
                  <span className="question-id">{question.questionId}</span>
                  <span className="question-type">{question.questionType}</span>
                  {question.sourceQuestion && (
                    <span className="source-question">Child of {question.sourceQuestion}</span>
                  )}
                </div>
                <div className="question-actions">
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => navigate(`/surveys/${surveyId}/questions/${question.questionId}/edit`)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleDuplicate(question.questionId)}
                  >
                    Duplicate
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(question.questionId)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="question-body">
                <p className="question-text">{question.questionDescription}</p>
                {question.questionDescriptionInEnglish && 
                 question.questionDescriptionInEnglish !== question.questionDescription && (
                  <p className="question-text-english">
                    <em>(English: {question.questionDescriptionInEnglish})</em>
                  </p>
                )}
                {question.options && question.options.length > 0 && (
                  <div className="question-options">
                    <strong>Options:</strong>
                    <ul>
                      {question.options.map((opt, idx) => (
                        <li key={idx}>
                          {opt.text}
                          {opt.children && <span className="option-children"> → {opt.children}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {question.tableQuestionValue && (
                  <div className="table-info">
                    <strong>Table Questions:</strong>
                    <pre>{question.tableQuestionValue}</pre>
                  </div>
                )}
                <div className="question-meta">
                  {question.isMandatory === 'Yes' && <span className="badge badge-mandatory">Mandatory</span>}
                  {question.medium && <span className="badge">Lang: {question.medium}</span>}
                  {question.textInputType && question.textInputType !== 'None' && (
                    <span className="badge">Input: {question.textInputType}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionList;
