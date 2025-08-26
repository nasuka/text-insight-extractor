# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CSV Insight Extractor is a React-based web application that uses Google's Gemini AI to analyze CSV data. The app provides two main analysis features:
- **Keyword Extraction**: Extracts key terms from selected CSV columns
- **Topic Analysis**: Identifies main topics with sub-topics and assigns them to each data entry

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture & Key Components

### Frontend (React + TypeScript)
- **App.tsx**: Main component managing CSV parsing, analysis state, and UI flow
- **services/geminiService.ts**: Gemini AI integration layer with three key functions:
  - `extractKeywordsFromText`: Extracts up to 15 keywords from text
  - `extractTopicsAndSubtopics`: Identifies 5 main topics with 3-5 sub-topics each
  - `assignTopicsToData`: Batch processes texts to assign topics (20 items per batch)

### Configuration
- **vite.config.ts**: Defines environment variable mapping for API keys
- **tsconfig.json**: Strict TypeScript configuration with path aliases (@/* → ./*)
- **.env.local**: Contains GEMINI_API_KEY (must be set before running)

### Key Implementation Details

1. **CSV Processing**: Client-side parsing with UTF-8 support in App.tsx:43-74
2. **Batch Processing**: Topic assignment uses parallel API calls with progress tracking (geminiService.ts:152-244)
3. **Error Handling**: Comprehensive error states for API failures and data validation
4. **UI State Management**: React hooks for analysis type, loading states, and filtering
5. **Environment Variables**: API key accessed via `process.env.API_KEY` (mapped from GEMINI_API_KEY)

## Important Notes

- The Gemini API key must be set in `.env.local` as `GEMINI_API_KEY`
- Text analysis is limited to 15,000 characters for keywords and 20,000 for topics
- The app uses Gemini 2.5 Flash model with JSON response schemas
- All text processing happens client-side; only API calls go to Gemini