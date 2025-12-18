import { useState } from 'react';

export const useValidation = () => {
  const [errors, setErrors] = useState({});

  const validateSurvey = (surveyData) => {
    const newErrors = {};

    // Survey ID validation
    if (!surveyData.surveyId || surveyData.surveyId.trim() === '') {
      newErrors.surveyId = 'Survey ID is required';
    } else if (!/^[A-Za-z0-9_]+$/.test(surveyData.surveyId)) {
      newErrors.surveyId = 'Survey ID must contain only alphanumeric characters and underscores (no spaces)';
    }
    
    // Survey Name validation
    if (!surveyData.surveyName || surveyData.surveyName.trim() === '') {
      newErrors.surveyName = 'Survey Name is required';
    } else if (surveyData.surveyName.length > 99) {
      newErrors.surveyName = 'Survey Name must not exceed 99 characters';
    }
    
    // Survey Description validation
    if (!surveyData.surveyDescription || surveyData.surveyDescription.trim() === '') {
      newErrors.surveyDescription = 'Survey Description is required';
    } else if (surveyData.surveyDescription.length > 256) {
      newErrors.surveyDescription = 'Survey Description must not exceed 256 characters';
    }

    // Validate date format
    if (surveyData.launchDate && !isValidDateFormat(surveyData.launchDate)) {
      newErrors.launchDate = 'Launch Date must be in DD/MM/YYYY HH:MM:SS format';
    }
    if (surveyData.closeDate && !isValidDateFormat(surveyData.closeDate)) {
      newErrors.closeDate = 'Close Date must be in DD/MM/YYYY HH:MM:SS format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateQuestion = (questionData, questionType) => {
    const newErrors = {};

    if (!questionData.questionId || questionData.questionId.trim() === '') {
      newErrors.questionId = 'Question ID is required';
    }
    if (!questionData.questionDescription || questionData.questionDescription.trim() === '') {
      newErrors.questionDescription = 'Question Description is required';
    }

    // Validate based on question type
    const tabularTypes = ['Tabular Text Input', 'Tabular Drop Down', 'Tabular Check Box'];
    if (tabularTypes.includes(questionType)) {
      if (!questionData.tableHeaderValue || questionData.tableHeaderValue.trim() === '') {
        newErrors.tableHeaderValue = 'Table Header Value is required for tabular questions';
      }
      if (!questionData.tableQuestionValue || questionData.tableQuestionValue.trim() === '') {
        newErrors.tableQuestionValue = 'Table Question Value is required for tabular questions';
      } else {
        // Validate format
        if (!validateTableQuestionFormat(questionData.tableQuestionValue)) {
          newErrors.tableQuestionValue = 'Format must be: a:Question 1\\nb:Question 2';
        }
      }
    }

    const multipleChoiceTypes = [
      'Multiple Choice Single Select',
      'Multiple Choice Multi Select',
      'Drop Down',
      'Likert Scale',
      'Tabular Drop Down'
    ];
    if (multipleChoiceTypes.includes(questionType)) {
      if (!questionData.options || questionData.options.length === 0) {
        newErrors.options = 'At least one option is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidDateFormat = (dateString) => {
    const regex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/;
    return regex.test(dateString);
  };

  const validateTableQuestionFormat = (value) => {
    const regex = /^[a-z]:.+(\n[a-z]:.+)*$/;
    return regex.test(value);
  };

  const clearErrors = () => {
    setErrors({});
  };

  return {
    errors,
    validateSurvey,
    validateQuestion,
    clearErrors,
    setErrors
  };
};
