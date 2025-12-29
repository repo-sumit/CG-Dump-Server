const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const ExcelJS = require('exceljs');
const validationEngine = require('../validation/validationEngine');
const fs = require('fs').promises;
const path = require('path');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  }
});

const STORE_PATH = path.join(__dirname, '../data/store.json');

// Read store to get existing surveys for cross-validation
async function readStore() {
  try {
    const data = await fs.readFile(STORE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { surveys: [], questions: [] };
  }
}

/**
 * POST /api/validate-upload
 * Query params: schema=survey|question|both
 * Body: multipart/form-data with file
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const schema = req.query.schema || 'both';
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    let surveyData = [];
    let questionData = [];

    // Parse file based on type
    if (fileExt === '.csv') {
      const csvContent = req.file.buffer.toString('utf-8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      // Determine if CSV is survey or question data based on columns
      if (records.length > 0) {
        const firstRecord = records[0];
        if (firstRecord['Survey ID'] || firstRecord['surveyId']) {
          surveyData = records.map((record, index) => {
            const normalized = normalizeKeys(record);
            normalized._excelRow = index + 2; // +2 for header row and 0-index
            normalized._sheetName = 'CSV';
            return normalized;
          });
        } else if (firstRecord['Question ID'] || firstRecord['questionId']) {
          questionData = records.map((record, index) => {
            const normalized = normalizeKeys(record);
            normalized._excelRow = index + 2; // +2 for header row and 0-index
            normalized._sheetName = 'CSV';
            return normalized;
          });
        }
      }
    } else if (fileExt === '.xlsx' || fileExt === '.xls') {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);

      // Check for SurveyMaster sheet (case insensitive, various formats)
      const surveySheet = workbook.worksheets.find(ws => 
        ws.name.toLowerCase().replace(/\s+/g, '') === 'surveymaster' ||
        ws.name.toLowerCase().replace(/\s+/g, '') === 'survey'
      );
      
      if (surveySheet) {
        surveyData = parseExcelSheet(surveySheet, surveySheet.name);
      }

      // Check for QuestionMaster sheet (case insensitive, various formats)
      const questionSheet = workbook.worksheets.find(ws => 
        ws.name.toLowerCase().replace(/\s+/g, '') === 'questionmaster' ||
        ws.name.toLowerCase().replace(/\s+/g, '') === 'question'
      );
      
      if (questionSheet) {
        questionData = parseExcelSheet(questionSheet, questionSheet.name);
      }

      // Ignore Access sheet and Designation mapping tabs as per requirements
      // These sheets will not be processed or validated
    }

    // Get existing data for cross-validation
    const store = await readStore();
    
    // Validate based on schema parameter
    let allErrors = [];
    let totalRows = 0;

    if (schema === 'survey' || schema === 'both') {
      if (surveyData.length > 0) {
        totalRows += surveyData.length;
        const surveyErrors = validationEngine.validateBulkSurveys(surveyData);
        // Update errors with Excel row numbers if available
        surveyErrors.forEach(error => {
          const record = surveyData[error.row - 2]; // error.row is already +2 from array index
          if (record && record._excelRow) {
            error.row = record._excelRow; // Use actual Excel row number
          }
          if (record && record._sheetName) {
            error.sheet = record._sheetName; // Use actual sheet name
          }
        });
        allErrors = allErrors.concat(surveyErrors);
      }
    }

    if (schema === 'question' || schema === 'both') {
      if (questionData.length > 0) {
        totalRows += questionData.length;
        const questionErrors = validationEngine.validateBulkQuestions(questionData, store.surveys);
        // Update errors with Excel row numbers if available
        questionErrors.forEach(error => {
          const record = questionData[error.row - 2]; // error.row is already +2 from array index
          if (record && record._excelRow) {
            error.row = record._excelRow; // Use actual Excel row number
          }
          if (record && record._sheetName) {
            error.sheet = record._sheetName; // Use actual sheet name
          }
        });
        allErrors = allErrors.concat(questionErrors);
      }
    }

    // Calculate summary
    const errorRows = new Set(allErrors.map(e => e.row)).size;
    const summary = {
      totalRows,
      errorRows,
      totalErrors: allErrors.length
    };

    res.json({
      isValid: allErrors.length === 0,
      summary,
      errors: allErrors
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ 
      error: 'Failed to validate upload', 
      message: error.message 
    });
  }
});

/**
 * Parse Excel sheet to array of objects
 */
function parseExcelSheet(sheet, sheetName) {
  const data = [];
  const headers = [];

  // Get headers from first row
  const firstRow = sheet.getRow(1);
  firstRow.eachCell((cell, colNumber) => {
    headers[colNumber] = cell.value;
  });

  // Parse data rows
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row

    const record = {};
    let hasData = false;
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        record[header] = cell.value;
        if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
          hasData = true;
        }
      }
    });

    // Only add non-empty rows, and include the Excel row number and sheet name
    if (hasData) {
      const normalized = normalizeKeys(record);
      normalized._excelRow = rowNumber; // Track the Excel row number
      normalized._sheetName = sheetName; // Track the sheet name
      data.push(normalized);
    }
  });

  return data;
}

/**
 * Normalize CSV/Excel keys to match internal format
 * Converts "Survey ID" -> "surveyId", handles various formats
 */
function normalizeKeys(record) {
  const normalized = {};
  
  const keyMap = {
    'Survey ID': 'surveyId',
    'Survey Name': 'surveyName',
    'Survey Description': 'surveyDescription',
    'available_mediums': 'availableMediums',
    'Available Mediums': 'availableMediums',
    'Hierarchial Access Level': 'hierarchicalAccessLevel',
    'Hierarchical Access Level': 'hierarchicalAccessLevel',
    'Public': 'public',
    'In School': 'inSchool',
    'Accept multiple Entries': 'acceptMultipleEntries',
    'Accept Multiple Entries': 'acceptMultipleEntries',
    'Launch Date': 'launchDate',
    'Close Date': 'closeDate',
    'Mode': 'mode',
    'visible_on_report_bot': 'visibleOnReportBot',
    'Visible on Report Bot': 'visibleOnReportBot',
    'Is Active?': 'isActive',
    'Is Active': 'isActive',
    'Download_response': 'downloadResponse',
    'Download Response': 'downloadResponse',
    'Geo Fencing': 'geoFencing',
    'Geo Tagging': 'geoTagging',
    'Test Survey': 'testSurvey',
    
    // Question fields
    'Question ID': 'questionId',
    'Medium': 'medium',
    'Question Type': 'questionType',
    'Question Description': 'questionDescription',
    'Text_input_type': 'textInputType',
    'Text Input Type': 'textInputType',
    'Is Mandatory': 'isMandatory',
    'Is_Mandatory': 'isMandatory',
    'Options': 'options',
    'Source_Question': 'sourceQuestion',
    'Source Question': 'sourceQuestion',
    'Table_Header_value': 'tableHeaderValue',
    'Table Header Value': 'tableHeaderValue',
    'Table_Question_value': 'tableQuestionValue',
    'Table Question Value': 'tableQuestionValue',
    'Question_Media_Type': 'questionMediaType',
    'Question Media Type': 'questionMediaType',
    'Question_Media_Link': 'questionMediaLink',
    'Question Media Link': 'questionMediaLink'
  };

  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = keyMap[key] || key;
    
    // Handle array fields
    if (normalizedKey === 'options' && typeof value === 'string') {
      normalized[normalizedKey] = value.split(',').map(o => o.trim()).filter(o => o);
    } else if (normalizedKey === 'availableMediums' && typeof value === 'string') {
      // Keep as string for validation
      normalized[normalizedKey] = value;
    } else {
      // Convert to string and trim
      normalized[normalizedKey] = value !== null && value !== undefined ? String(value).trim() : '';
    }
  }

  return normalized;
}

module.exports = router;
