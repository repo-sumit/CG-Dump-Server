import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { questionAPI, surveyAPI } from '../services/api';
import { useValidation } from '../hooks/useValidation';
import { questionTypes, textInputTypes, questionMediaTypes, yesNoOptions, getFieldsForQuestionType } from '../schemas/questionTypeSchema';
import TranslationPanel from './TranslationPanel';

const QuestionForm = () => {
  const navigate = useNavigate();
  const { surveyId, questionId } = useParams();
  const isEdit = Boolean(questionId);
  const { errors, validateQuestion, setErrors } = useValidation();

  const [survey, setSurvey] = useState(null);
  const [formData, setFormData] = useState({
    questionId: '',
    questionType: '',
    isDynamic: 'No',
    questionDescriptionOptional: '',
    maxValue: '',
    minValue: '',
    isMandatory: 'Yes',
    sourceQuestion: '',
    textInputType: 'None',
    textLimitCharacters: '',
    mode: 'None',
    questionMediaLink: '',
    questionMediaType: 'None',
    correctAnswerOptional: '',
    childrenQuestions: '',
    outcomeDescription: '',
    translations: {} // New field for multi-language support
  });

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [fieldConfig, setFieldConfig] = useState({});
  const [surveyLanguages, setSurveyLanguages] = useState(['English']);

  useEffect(() => {
    loadSurvey();
    if (isEdit) {
      loadQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId, questionId]);

  useEffect(() => {
    if (formData.questionType) {
      const config = getFieldsForQuestionType(formData.questionType);
      setFieldConfig(config);
      
      // Auto-set values based on question type constraints
      const updates = {};
      if (config.textInputTypeValue) {
        updates.textInputType = config.textInputTypeValue;
      }
      if (config.questionMediaTypeValue) {
        updates.questionMediaType = config.questionMediaTypeValue;
      }
      if (config.isDynamic) {
        updates.isDynamic = config.isDynamic;
      }
      
      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
    }
  }, [formData.questionType]);
  
  // Clear questionMediaLink when questionMediaType is None
  useEffect(() => {
    if (formData.questionMediaType === 'None' && formData.questionMediaLink) {
      setFormData(prev => ({ ...prev, questionMediaLink: '' }));
    }
  }, [formData.questionMediaType, formData.questionMediaLink]);

  const loadSurvey = async () => {
    try {
      const data = await surveyAPI.getById(surveyId);
      setSurvey(data);
      
      // Parse available languages from survey
      const languages = typeof data.availableMediums === 'string' 
        ? data.availableMediums.split(',').map(l => l.trim()).filter(l => l)
        : (data.availableMediums || ['English']);
      
      setSurveyLanguages(languages);
      
      // Initialize translations for all languages if creating new question
      if (!isEdit) {
        const initialTranslations = {};
        languages.forEach(lang => {
          initialTranslations[lang] = {
            questionDescription: '',
            options: [],
            tableHeaderValue: '',
            tableQuestionValue: ''
          };
        });
        setFormData(prev => ({ ...prev, translations: initialTranslations }));
      }
    } catch (err) {
      alert('Failed to load survey');
      navigate('/');
    }
  };

  const loadQuestion = async () => {
    try {
      const questions = await questionAPI.getAll(surveyId);
      const question = questions.find(q => q.questionId === questionId);
      if (question) {
        // If question doesn't have translations, create them from old format
        if (!question.translations) {
          const languages = surveyLanguages.length > 0 ? surveyLanguages : ['English'];
          const translations = {};
          
          languages.forEach(lang => {
            translations[lang] = {
              questionDescription: question.questionDescription || '',
              options: question.options || [],
              tableHeaderValue: question.tableHeaderValue || '',
              tableQuestionValue: question.tableQuestionValue || ''
            };
          });
          
          question.translations = translations;
        }
        
        setFormData(question);
      }
    } catch (err) {
      alert('Failed to load question');
      navigate(`/surveys/${surveyId}/questions`);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleTranslationsChange = (updatedTranslations) => {
    setFormData(prev => ({
      ...prev,
      translations: updatedTranslations
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate that all languages have required translations
    let hasAllTranslations = true;
    let missingLanguages = [];
    
    surveyLanguages.forEach(lang => {
      const translation = formData.translations[lang];
      if (!translation || !translation.questionDescription) {
        hasAllTranslations = false;
        missingLanguages.push(lang);
      }
      
      if (fieldConfig.showTableFields) {
        if (!translation?.tableHeaderValue || !translation?.tableQuestionValue) {
          hasAllTranslations = false;
          if (!missingLanguages.includes(lang)) {
            missingLanguages.push(lang);
          }
        }
      }
      
      if (fieldConfig.showOptions) {
        if (!translation?.options || translation.options.length < 2) {
          hasAllTranslations = false;
          if (!missingLanguages.includes(lang)) {
            missingLanguages.push(lang);
          }
        }
      }
    });
    
    if (!hasAllTranslations) {
      setSubmitError(`Missing required translations for: ${missingLanguages.join(', ')}`);
      return;
    }

    if (!validateQuestion(formData, formData.questionType)) {
      return;
    }

    try {
      setLoading(true);
      if (isEdit) {
        await questionAPI.update(surveyId, questionId, formData);
        alert('Question updated successfully');
      } else {
        await questionAPI.create(surveyId, formData);
        alert('Question created successfully');
      }
      navigate(`/surveys/${surveyId}/questions`);
    } catch (err) {
      const errorMsg = err.response?.data?.errors 
        ? err.response.data.errors.join(', ')
        : err.response?.data?.error || 'Failed to save question';
      setSubmitError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!survey) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <h2>{isEdit ? 'Edit Question' : 'Add New Question'}</h2>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate(`/surveys/${surveyId}/questions`)}
        >
          Back to Questions
        </button>
      </div>

      {submitError && <div className="error-message">{submitError}</div>}

      <form onSubmit={handleSubmit} className="question-form">
        <div className="form-section">
          <h3>Basic Information</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="questionId">
                Question ID <span className="required">*</span>
              </label>
              <input
                type="text"
                id="questionId"
                name="questionId"
                value={formData.questionId}
                onChange={handleChange}
                disabled={isEdit}
                placeholder="e.g., Q1, Q1.1, Q2"
                className={errors.questionId ? 'error' : ''}
              />
              {errors.questionId && <span className="error-text">{errors.questionId}</span>}
              <small>Format: Q1, Q2, or Q1.1 for child questions</small>
            </div>

            <div className="form-group">
              <label htmlFor="questionType">
                Question Type <span className="required">*</span>
              </label>
              <select
                id="questionType"
                name="questionType"
                value={formData.questionType}
                onChange={handleChange}
                className={errors.questionType ? 'error' : ''}
              >
                <option value="">Select Question Type</option>
                {questionTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.questionType && <span className="error-text">{errors.questionType}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="questionDescriptionOptional">Question Description Optional</label>
            <input
              type="text"
              id="questionDescriptionOptional"
              name="questionDescriptionOptional"
              value={formData.questionDescriptionOptional}
              onChange={handleChange}
              maxLength="256"
              placeholder="Optional description (max 256 characters)"
            />
          </div>
        </div>

        {/* Parent/Child Question Settings */}
        <div className="form-section">
          <h3>Question Relationship</h3>
          
          <div className="form-group">
            <label htmlFor="sourceQuestion">Source Question (Parent)</label>
            <input
              type="text"
              id="sourceQuestion"
              name="sourceQuestion"
              value={formData.sourceQuestion}
              onChange={handleChange}
              placeholder="e.g., Q1 (for child questions)"
            />
            <small>Only required for child questions (e.g., Q1.1, Q1.2)</small>
          </div>
        </div>

        {/* Multi-Language Translations */}
        {formData.questionType && surveyLanguages.length > 0 && (
          <div className="form-section">
            <h3>Translations ({surveyLanguages.length} {surveyLanguages.length === 1 ? 'language' : 'languages'})</h3>
            <TranslationPanel
              languages={surveyLanguages}
              translations={formData.translations}
              onChange={handleTranslationsChange}
              questionType={formData.questionType}
              fieldConfig={fieldConfig}
            />
          </div>
        )}

        {/* Settings */}
        <div className="form-section">
          <h3>Settings</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="isMandatory">Is Mandatory</label>
              <select
                id="isMandatory"
                name="isMandatory"
                value={formData.isMandatory}
                onChange={handleChange}
              >
                {yesNoOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="isDynamic">Is Dynamic</label>
              <select
                id="isDynamic"
                name="isDynamic"
                value={formData.isDynamic}
                onChange={handleChange}
                disabled={fieldConfig.isDynamic !== undefined}
              >
                {yesNoOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {fieldConfig.isDynamic && <small>Auto-set based on question type</small>}
            </div>

            <div className="form-group">
              <label htmlFor="mode">Mode</label>
              <select
                id="mode"
                name="mode"
                value={formData.mode}
                onChange={handleChange}
              >
                <option value="None">None</option>
                <option value="New Data">New Data</option>
                <option value="Correction">Correction</option>
                <option value="Delete Data">Delete Data</option>
              </select>
            </div>
          </div>

          {fieldConfig.showTextInputType && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="textInputType">Text Input Type</label>
                <select
                  id="textInputType"
                  name="textInputType"
                  value={formData.textInputType}
                  onChange={handleChange}
                  disabled={fieldConfig.textInputTypeValue}
                >
                  {textInputTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {fieldConfig.showTextLimit && (
                <div className="form-group">
                  <label htmlFor="textLimitCharacters">Text Limit (Characters)</label>
                  <input
                    type="number"
                    id="textLimitCharacters"
                    name="textLimitCharacters"
                    value={formData.textLimitCharacters}
                    onChange={handleChange}
                    placeholder="Default: 1024"
                  />
                </div>
              )}
            </div>
          )}

          {fieldConfig.showMaxMin && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="minValue">Min Value</label>
                <input
                  type="text"
                  id="minValue"
                  name="minValue"
                  value={formData.minValue}
                  onChange={handleChange}
                  placeholder="Minimum value"
                />
              </div>
              <div className="form-group">
                <label htmlFor="maxValue">Max Value</label>
                <input
                  type="text"
                  id="maxValue"
                  name="maxValue"
                  value={formData.maxValue}
                  onChange={handleChange}
                  placeholder="Maximum value"
                />
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="questionMediaType">Question Media Type</label>
              <select
                id="questionMediaType"
                name="questionMediaType"
                value={formData.questionMediaType}
                onChange={handleChange}
                disabled={fieldConfig.questionMediaTypeValue}
              >
                {questionMediaTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="questionMediaLink">Question Media Link</label>
              <input
                type="text"
                id="questionMediaLink"
                name="questionMediaLink"
                value={formData.questionMediaLink}
                onChange={handleChange}
                placeholder="URL to media file"
                disabled={formData.questionMediaType === 'None'}
              />
              {formData.questionMediaType === 'None' && (
                <small>Disabled when Media Type is None</small>
              )}
            </div>
          </div>
        </div>

        {/* Additional Fields */}
        <div className="form-section">
          <h3>Additional Information</h3>
          
          <div className="form-group">
            <label htmlFor="correctAnswerOptional">Correct Answer (Optional)</label>
            <input
              type="text"
              id="correctAnswerOptional"
              name="correctAnswerOptional"
              value={formData.correctAnswerOptional}
              onChange={handleChange}
              placeholder="Optional correct answer"
            />
          </div>

          <div className="form-group">
            <label htmlFor="childrenQuestions">Children Questions</label>
            <input
              type="text"
              id="childrenQuestions"
              name="childrenQuestions"
              value={formData.childrenQuestions}
              onChange={handleChange}
              placeholder="Comma-separated child question IDs"
            />
          </div>

          <div className="form-group">
            <label htmlFor="outcomeDescription">Outcome Description</label>
            <textarea
              id="outcomeDescription"
              name="outcomeDescription"
              value={formData.outcomeDescription}
              onChange={handleChange}
              rows="2"
              placeholder="Description of outcome"
            />
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate(`/surveys/${surveyId}/questions`)}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : (isEdit ? 'Update Question' : 'Add Question')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuestionForm;
