const {
  questionTypes,
  textInputTypes,
  questionMediaTypes,
  modes,
  yesNoValues,
  validationRules,
  childQuestionRules
} = require('../schemas/validationRules');

class Validator {
  // Validate survey data
  validateSurvey(surveyData) {
    const errors = [];

    // Survey ID validation
    if (!surveyData.surveyId || surveyData.surveyId.trim() === '') {
      errors.push('Survey ID is required');
    } else if (!/^[A-Za-z0-9_]+$/.test(surveyData.surveyId)) {
      errors.push('Survey ID must contain only alphanumeric characters and underscores (no spaces)');
    }
    
    // Survey Name validation
    if (!surveyData.surveyName || surveyData.surveyName.trim() === '') {
      errors.push('Survey Name is required');
    } else if (surveyData.surveyName.length > 99) {
      errors.push('Survey Name must not exceed 99 characters');
    }
    
    // Survey Description validation
    if (!surveyData.surveyDescription || surveyData.surveyDescription.trim() === '') {
      errors.push('Survey Description is required');
    } else if (surveyData.surveyDescription.length > 256) {
      errors.push('Survey Description must not exceed 256 characters');
    }

    // Validate Yes/No fields
    const yesNoFields = [
      'public', 'inSchool', 'acceptMultipleEntries', 'visibleOnReportBot',
      'isActive', 'downloadResponse', 'geoFencing', 'geoTagging', 'testSurvey'
    ];
    
    yesNoFields.forEach(field => {
      if (surveyData[field] && !yesNoValues.includes(surveyData[field])) {
        errors.push(`${field} must be 'Yes' or 'No'`);
      }
    });

    // Validate mode
    if (surveyData.mode && !modes.includes(surveyData.mode)) {
      errors.push(`Mode must be one of: ${modes.join(', ')}`);
    }

    // Validate date formats
    if (surveyData.launchDate) {
      if (!this.isValidDate(surveyData.launchDate)) {
        errors.push('Launch Date must be in DD/MM/YYYY HH:MM:SS format');
      }
    }
    if (surveyData.closeDate) {
      if (!this.isValidDate(surveyData.closeDate)) {
        errors.push('Close Date must be in DD/MM/YYYY HH:MM:SS format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate question data
  validateQuestion(questionData, existingQuestions = []) {
    const errors = [];
    const questionType = questionData.questionType;

    // Required fields
    if (!questionData.questionId || questionData.questionId.trim() === '') {
      errors.push('Question ID is required');
    }
    if (!questionType || !questionTypes.includes(questionType)) {
      errors.push(`Question Type must be one of: ${questionTypes.join(', ')}`);
    }
    if (!questionData.questionDescription || questionData.questionDescription.trim() === '') {
      errors.push('Question Description is required');
    }

    // Validate child question format
    if (questionData.questionId && questionData.questionId.includes('.')) {
      if (!childQuestionRules.formatRegex.test(questionData.questionId)) {
        errors.push('Child Question ID must be in format Q1.1, Q1.2, etc.');
      }
      if (!questionData.sourceQuestion) {
        errors.push('Child questions must have a Source Question');
      }
    }

    // Validate based on question type
    if (questionType && validationRules[questionType]) {
      const rules = validationRules[questionType];

      // Check required fields
      rules.required.forEach(field => {
        if (field === 'options') {
          if (!questionData.options || questionData.options.length === 0) {
            errors.push(`${questionType} requires at least one option`);
          }
        } else if (!questionData[field]) {
          errors.push(`${field} is required for ${questionType}`);
        }
      });

      // Check constraints
      if (rules.constraints) {
        // Text input type constraints
        if (rules.constraints.textInputType && questionData.textInputType !== rules.constraints.textInputType) {
          errors.push(`textInputType must be '${rules.constraints.textInputType}' for ${questionType}`);
        }

        // Question media type constraints
        if (rules.constraints.questionMediaType && questionData.questionMediaType !== rules.constraints.questionMediaType) {
          errors.push(`questionMediaType must be '${rules.constraints.questionMediaType}' for ${questionType}`);
        }

        // Options count constraints
        if (questionData.options && questionData.options.length > 0) {
          if (rules.constraints.maxOptions && questionData.options.length > rules.constraints.maxOptions) {
            errors.push(`Maximum ${rules.constraints.maxOptions} options allowed for ${questionType}`);
          }
          if (rules.constraints.minOptions && questionData.options.length < rules.constraints.minOptions) {
            errors.push(`Minimum ${rules.constraints.minOptions} options required for ${questionType}`);
          }
        }

        // Table question value format validation
        if (rules.constraints.tableQuestionValue && questionData.tableQuestionValue) {
          const format = rules.constraints.tableQuestionValue.format;
          if (!format.test(questionData.tableQuestionValue)) {
            errors.push('tableQuestionValue must be in format: a:Question 1\\nb:Question 2');
          }
          
          // Check number of questions
          const questions = questionData.tableQuestionValue.split('\n');
          if (questions.length > rules.constraints.tableQuestionValue.maxQuestions) {
            errors.push(`Maximum ${rules.constraints.tableQuestionValue.maxQuestions} questions allowed in tableQuestionValue`);
          }

          // Check character limit per question
          questions.forEach((q, idx) => {
            const questionText = q.split(':')[1];
            if (questionText && questionText.length > rules.constraints.tableQuestionValue.maxCharsPerQuestion) {
              errors.push(`Question ${idx + 1} in tableQuestionValue exceeds ${rules.constraints.tableQuestionValue.maxCharsPerQuestion} characters`);
            }
          });
        }
      }
    }

    // Validate text input type
    if (questionData.textInputType && !textInputTypes.includes(questionData.textInputType)) {
      errors.push(`Text_input_type must be one of: ${textInputTypes.join(', ')}`);
    }

    // Validate question media type
    if (questionData.questionMediaType && !questionMediaTypes.includes(questionData.questionMediaType)) {
      errors.push(`Question_Media_Type must be one of: ${questionMediaTypes.join(', ')}`);
    }

    // Validate Yes/No fields
    if (questionData.isMandatory && !yesNoValues.includes(questionData.isMandatory)) {
      errors.push('Is Mandatory must be \'Yes\' or \'No\'');
    }
    if (questionData.isDynamic && !yesNoValues.includes(questionData.isDynamic)) {
      errors.push('IsDynamic must be \'Yes\' or \'No\'');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate date format DD/MM/YYYY HH:MM:SS
  isValidDate(dateString) {
    const regex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/;
    if (!regex.test(dateString)) {
      return false;
    }
    
    const [datePart, timePart] = dateString.split(' ');
    const [day, month, year] = datePart.split('/').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);
    
    // Basic validation
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (hours < 0 || hours > 23) return false;
    if (minutes < 0 || minutes > 59) return false;
    if (seconds < 0 || seconds > 59) return false;
    
    return true;
  }
}

module.exports = new Validator();
