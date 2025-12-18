import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { questionAPI, surveyAPI } from '../services/api';
import { useValidation } from '../hooks/useValidation';
import { questionTypes, textInputTypes, questionMediaTypes, yesNoOptions, getFieldsForQuestionType } from '../schemas/questionTypeSchema';

const QuestionForm = () => {
  const navigate = useNavigate();
  const { surveyId, questionId } = useParams();
  const isEdit = Boolean(questionId);
  const { errors, validateQuestion, setErrors } = useValidation();

  const [survey, setSurvey] = useState(null);
  const [formData, setFormData] = useState({
    questionId: '',
    questionType: '',
    medium: 'English',
    mediumInEnglish: 'English',
    isDynamic: 'No',
    questionDescriptionOptional: '',
    maxValue: '',
    minValue: '',
    isMandatory: 'Yes',
    tableHeaderValue: '',
    tableQuestionValue: '',
    sourceQuestion: '',
    textInputType: 'None',
    textLimitCharacters: '',
    mode: 'None',
    questionMediaLink: '',
    questionMediaType: 'None',
    questionDescription: '',
    questionDescriptionInEnglish: '',
    options: [],
    correctAnswerOptional: '',
    childrenQuestions: '',
    outcomeDescription: ''
  });

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [fieldConfig, setFieldConfig] = useState({});

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
      if (config.textInputTypeValue) {
        setFormData(prev => ({ ...prev, textInputType: config.textInputTypeValue }));
      }
      if (config.questionMediaTypeValue) {
        setFormData(prev => ({ ...prev, questionMediaType: config.questionMediaTypeValue }));
      }
    }
  }, [formData.questionType]);

  const loadSurvey = async () => {
    try {
      const data = await surveyAPI.getById(surveyId);
      setSurvey(data);
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
        setFormData(question);
      }
    } catch (err) {
      alert('Failed to load question');
      navigate(`/surveys/${surveyId}/questions`);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updates = { [name]: value };
    
    // Auto-fill mediumInEnglish when medium changes
    if (name === 'medium') {
      updates.mediumInEnglish = value;
    }
    
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...formData.options];
    if (!newOptions[index]) {
      newOptions[index] = { text: '', textInEnglish: '', children: '' };
    }
    newOptions[index][field] = value;
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { text: '', textInEnglish: '', children: '' }]
    }));
  };

  const removeOption = (index) => {
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

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

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="medium">Medium (Language)</label>
              <select
                id="medium"
                name="medium"
                value={formData.medium}
                onChange={handleChange}
              >
                <option value="">Select Medium</option>
                {survey.availableMediums && (typeof survey.availableMediums === 'string' 
                  ? survey.availableMediums.split(',').filter(m => m.trim())
                  : survey.availableMediums
                ).map(medium => (
                  <option key={medium} value={medium.trim()}>{medium.trim()}</option>
                ))}
              </select>
              <small>Select from survey's available languages</small>
            </div>

            <div className="form-group">
              <label htmlFor="mediumInEnglish">Medium in English</label>
              <input
                type="text"
                id="mediumInEnglish"
                name="mediumInEnglish"
                value={formData.mediumInEnglish}
                onChange={handleChange}
                placeholder="Auto-filled from Medium"
                readOnly
                style={{ backgroundColor: '#f0f0f0' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="questionDescription">
              Question Description <span className="required">*</span>
            </label>
            <textarea
              id="questionDescription"
              name="questionDescription"
              value={formData.questionDescription}
              onChange={handleChange}
              rows="3"
              placeholder="Enter the question text in regional language"
              className={errors.questionDescription ? 'error' : ''}
            />
            {errors.questionDescription && <span className="error-text">{errors.questionDescription}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="questionDescriptionInEnglish">Question Description in English</label>
            <textarea
              id="questionDescriptionInEnglish"
              name="questionDescriptionInEnglish"
              value={formData.questionDescriptionInEnglish}
              onChange={handleChange}
              rows="3"
              placeholder="Enter the question text in English"
            />
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

        {/* Table Fields for Tabular question types */}
        {fieldConfig.showTableFields && (
          <div className="form-section">
            <h3>Table Configuration</h3>
            
            <div className="form-group">
              <label htmlFor="tableHeaderValue">
                Table Header Value <span className="required">*</span>
              </label>
              <input
                type="text"
                id="tableHeaderValue"
                name="tableHeaderValue"
                value={formData.tableHeaderValue}
                onChange={handleChange}
                placeholder="e.g., Classroom category,Classroom count (in number)"
                className={errors.tableHeaderValue ? 'error' : ''}
              />
              {errors.tableHeaderValue && <span className="error-text">{errors.tableHeaderValue}</span>}
              <small>Comma-separated column headers</small>
            </div>

            <div className="form-group">
              <label htmlFor="tableQuestionValue">
                Table Question Value <span className="required">*</span>
              </label>
              <textarea
                id="tableQuestionValue"
                name="tableQuestionValue"
                value={formData.tableQuestionValue}
                onChange={handleChange}
                rows="4"
                placeholder="a:Question 1&#10;b:Question 2&#10;c:Question 3"
                className={errors.tableQuestionValue ? 'error' : ''}
              />
              {errors.tableQuestionValue && <span className="error-text">{errors.tableQuestionValue}</span>}
              <small>Format: a:Question 1\nb:Question 2 (max 20 questions, 100 chars each)</small>
            </div>
          </div>
        )}

        {/* Options for Multiple Choice and Dropdown types */}
        {fieldConfig.showOptions && (
          <div className="form-section">
            <h3>Options</h3>
            
            {formData.options.map((option, index) => (
              <div key={index} className="option-group">
                <div className="option-header">
                  <h4>Option {index + 1}</h4>
                  <button 
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => removeOption(index)}
                  >
                    Remove
                  </button>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Option Text (Regional Language)</label>
                    <input
                      type="text"
                      value={option.text || ''}
                      onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                      placeholder="Option text"
                    />
                  </div>
                  <div className="form-group">
                    <label>Option Text in English</label>
                    <input
                      type="text"
                      value={option.textInEnglish || ''}
                      onChange={(e) => handleOptionChange(index, 'textInEnglish', e.target.value)}
                      placeholder="Option text in English"
                    />
                  </div>
                  {fieldConfig.showOptionChildren && (
                    <div className="form-group">
                      <label>Child Questions (comma-separated)</label>
                      <input
                        type="text"
                        value={option.children || ''}
                        onChange={(e) => handleOptionChange(index, 'children', e.target.value)}
                        placeholder="e.g., Q1.1,Q1.2"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {errors.options && <span className="error-text">{errors.options}</span>}
            
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={addOption}
            >
              Add Option
            </button>
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
              >
                {yesNoOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
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
              />
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
