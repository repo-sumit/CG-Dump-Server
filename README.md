# FMB Survey Builder

A modern web app for building, validating, importing, previewing, and exporting multi-language surveys.

## Highlights

- Survey and question management with 12 question types
- Multi-language questions with auto-translation (English as primary)
- Conditional child questions based on selected options
- Real-time preview with validation and navigation
- Import/export to Excel with exact column format
- Upload validation for CSV/XLSX

## Screenshots

Add updated screenshots here:

- `docs/screenshots/dashboard.png`
- `docs/screenshots/question-builder.png`
- `docs/screenshots/translation-panel.png`
- `docs/screenshots/survey-preview.png`
- `docs/screenshots/import-validate.png`

Example usage:

```md
![Dashboard](docs/screenshots/dashboard.png)
```

## Quick Start

### Prerequisites

- Node.js 14+
- npm 6+

### Backend

```bash
cd server
npm install
cp data/store.json.template data/store.json
npm start
```

Backend runs at `http://localhost:5001`.

### Frontend

```bash
cd client
npm install
npm start
```

Frontend runs at `http://localhost:3000`.

## Configuration

### Translation Proxy

Server uses a proxy endpoint for auto-translation:

- `TRANSLATE_API_URL` (default: `https://libretranslate.de/translate`)
- `TRANSLATE_API_KEY` (optional)

Start the server with:

```bash
set TRANSLATE_API_URL=https://libretranslate.de/translate
set TRANSLATE_API_KEY=your_key
npm start
```

## Core Flows

### Create Survey

1. Create a survey and choose available languages.
2. Add questions with translations.
3. Preview and export to Excel.

### Import Survey

- XLSX import requires both `Survey Master` and `Question Master` sheets.
- Existing surveys with the same ID are replaced on import.

### Validate Upload

- Upload CSV/XLSX to validate only the file (no cross-check with existing data).
- Error table includes Survey ID, Question ID, Medium, and Question Type.

## Question Types

- Multiple Choice Single Select
- Multiple Choice Multi Select
- Tabular Text Input
- Tabular Drop Down
- Tabular Check Box
- Text Response
- Image Upload
- Video Upload
- Voice Response
- Likert Scale
- Calendar
- Drop Down

## Export Format

Export generates two sheets:

- Survey Master
- Question Master

Multi-language questions are duplicated per language in Question Master, preserving the required column order.

## API Endpoints

- `GET /api/surveys`
- `POST /api/surveys`
- `PUT /api/surveys/:id`
- `DELETE /api/surveys/:id`
- `GET /api/surveys/:id/questions`
- `POST /api/surveys/:id/questions`
- `PUT /api/surveys/:id/questions/:questionId`
- `DELETE /api/surveys/:id/questions/:questionId`
- `POST /api/import`
- `GET /api/export/:surveyId`
- `POST /api/validate-upload`
- `POST /api/translate`

## Notes

- Storage is JSON file-based for simplicity.
- For production: migrate to a database, add auth, and move Tailwind/Bootstrap to build-time bundles.
