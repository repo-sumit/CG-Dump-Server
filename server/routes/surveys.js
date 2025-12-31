const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const validator = require('../services/validator');

const STORE_PATH = path.join(__dirname, '../data/store.json');

// Initialize store if it doesn't exist
async function initStore() {
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify({ surveys: [], questions: [] }, null, 2));
  }
}

// Read store
async function readStore() {
  await initStore();
  const data = await fs.readFile(STORE_PATH, 'utf8');
  return JSON.parse(data);
}

// Write store
async function writeStore(data) {
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2));
}

// GET /api/surveys - List all surveys
router.get('/', async (req, res) => {
  try {
    const store = await readStore();
    res.json(store.surveys);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch surveys', message: error.message });
  }
});

// GET /api/surveys/:id - Get survey by ID
router.get('/:id', async (req, res) => {
  try {
    const store = await readStore();
    const survey = store.surveys.find(s => s.surveyId === req.params.id);
    
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    res.json(survey);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch survey', message: error.message });
  }
});

// POST /api/surveys - Create new survey
router.post('/', async (req, res) => {
  try {
    const surveyData = req.body;
    
    // Validate survey data
    const validation = validator.validateSurvey(surveyData);
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }
    
    const store = await readStore();
    
    // Check if survey ID already exists
    if (store.surveys.find(s => s.surveyId === surveyData.surveyId)) {
      return res.status(400).json({ error: 'Survey ID already exists' });
    }
    
    // Add survey
    store.surveys.push(surveyData);
    await writeStore(store);
    
    res.status(201).json(surveyData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create survey', message: error.message });
  }
});

// PUT /api/surveys/:id - Update survey
router.put('/:id', async (req, res) => {
  try {
    const surveyData = req.body;
    
    // Validate survey data
    const validation = validator.validateSurvey(surveyData);
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }
    
    const store = await readStore();
    const index = store.surveys.findIndex(s => s.surveyId === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    store.surveys[index] = surveyData;
    await writeStore(store);
    
    res.json(surveyData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update survey', message: error.message });
  }
});

// DELETE /api/surveys/:id - Delete survey
router.delete('/:id', async (req, res) => {
  try {
    const store = await readStore();
    const index = store.surveys.findIndex(s => s.surveyId === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    // Remove survey
    store.surveys.splice(index, 1);
    
    // Remove associated questions
    store.questions = store.questions.filter(q => q.surveyId !== req.params.id);
    
    await writeStore(store);
    
    res.json({ message: 'Survey deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete survey', message: error.message });
  }
});

// GET /api/surveys/:id/questions - Get questions for a survey
router.get('/:id/questions', async (req, res) => {
  try {
    const store = await readStore();
    const questions = store.questions.filter(q => q.surveyId === req.params.id);
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch questions', message: error.message });
  }
});

// POST /api/surveys/:id/questions - Add question to survey
router.post('/:id/questions', async (req, res) => {
  try {
    const questionData = { ...req.body, surveyId: req.params.id };
    
    const store = await readStore();
    
    // Check if survey exists
    const survey = store.surveys.find(s => s.surveyId === req.params.id);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    // Validate question data
    const validation = validator.validateQuestion(questionData, store.questions);
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }
    
    // Check if question ID already exists for this survey
    if (store.questions.find(q => q.surveyId === req.params.id && q.questionId === questionData.questionId)) {
      return res.status(400).json({ error: 'Question ID already exists for this survey' });
    }
    
    // Add question
    store.questions.push(questionData);
    await writeStore(store);
    
    res.status(201).json(questionData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create question', message: error.message });
  }
});

// PUT /api/surveys/:id/questions/:questionId - Update question
router.put('/:id/questions/:questionId', async (req, res) => {
  try {
    const questionData = { ...req.body, surveyId: req.params.id, questionId: req.params.questionId };
    
    // Validate question data
    const store = await readStore();
    const validation = validator.validateQuestion(questionData, store.questions);
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }
    
    const index = store.questions.findIndex(
      q => q.surveyId === req.params.id && q.questionId === req.params.questionId
    );
    
    if (index === -1) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    store.questions[index] = questionData;
    await writeStore(store);
    
    res.json(questionData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update question', message: error.message });
  }
});

// DELETE /api/surveys/:id/questions/:questionId - Delete question
router.delete('/:id/questions/:questionId', async (req, res) => {
  try {
    const store = await readStore();
    const index = store.questions.findIndex(
      q => q.surveyId === req.params.id && q.questionId === req.params.questionId
    );
    
    if (index === -1) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    store.questions.splice(index, 1);
    await writeStore(store);
    
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete question', message: error.message });
  }
});

// POST /api/surveys/:id/duplicate - Duplicate survey
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { newSurveyId } = req.body;
    
    if (!newSurveyId) {
      return res.status(400).json({ error: 'New Survey ID is required' });
    }
    
    const store = await readStore();
    
    // Find original survey
    const originalSurvey = store.surveys.find(s => s.surveyId === req.params.id);
    if (!originalSurvey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    // Check if new survey ID already exists
    if (store.surveys.find(s => s.surveyId === newSurveyId)) {
      return res.status(400).json({ error: 'Survey ID already exists' });
    }
    
    // Create duplicated survey (reset dates)
    const duplicatedSurvey = {
      ...originalSurvey,
      surveyId: newSurveyId,
      launchDate: '',
      closeDate: ''
    };
    
    // Validate duplicated survey
    const validation = validator.validateSurvey(duplicatedSurvey);
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }
    
    // Get all questions for original survey
    const originalQuestions = store.questions.filter(q => q.surveyId === req.params.id);
    
    // Duplicate all questions
    const duplicatedQuestions = originalQuestions.map(q => ({
      ...q,
      surveyId: newSurveyId
    }));
    
    // Add to store
    store.surveys.push(duplicatedSurvey);
    store.questions.push(...duplicatedQuestions);
    await writeStore(store);
    
    res.status(201).json({
      survey: duplicatedSurvey,
      questionsCount: duplicatedQuestions.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to duplicate survey', message: error.message });
  }
});

// POST /api/surveys/:surveyId/questions/:questionId/duplicate - Duplicate question
router.post('/:surveyId/questions/:questionId/duplicate', async (req, res) => {
  try {
    const { surveyId, questionId } = req.params;
    
    const store = await readStore();
    
    // Find original question
    const originalQuestion = store.questions.find(
      q => q.surveyId === surveyId && q.questionId === questionId
    );
    
    if (!originalQuestion) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Generate new question ID
    const surveyQuestions = store.questions.filter(q => q.surveyId === surveyId);
    const questionNumbers = surveyQuestions
      .map(q => {
        const match = q.questionId.match(/^Q(\d+)(?:\.(\d+))?$/);
        if (match) {
          return parseInt(match[1]);
        }
        return 0;
      })
      .filter(n => n > 0);
    
    const maxQuestionNum = questionNumbers.length > 0 ? Math.max(...questionNumbers) : 0;
    const newQuestionId = `Q${maxQuestionNum + 1}`;
    
    // Create duplicated question
    const duplicatedQuestion = {
      ...originalQuestion,
      questionId: newQuestionId,
      sourceQuestion: '', // Reset source question for duplicated question
      optionChildren: originalQuestion.optionChildren || ''
    };
    
    // Check if new question ID already exists (shouldn't happen, but safety check)
    if (store.questions.find(q => q.surveyId === surveyId && q.questionId === newQuestionId)) {
      return res.status(400).json({ error: 'Generated question ID already exists' });
    }
    
    // Validate duplicated question
    const validation = validator.validateQuestion(duplicatedQuestion, store.questions);
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }
    
    // Add to store
    store.questions.push(duplicatedQuestion);
    await writeStore(store);
    
    res.status(201).json(duplicatedQuestion);
  } catch (error) {
    res.status(500).json({ error: 'Failed to duplicate question', message: error.message });
  }
});

module.exports = router;
