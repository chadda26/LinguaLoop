# LinguaLoop

> **"Learn smarter. Remember longer."**

LinguaLoop is a modern, client-side language-learning web application that combines deterministic spaced-repetition scheduling with an interactive, timed multiple-choice recall experience.

---

## Overview

LinguaLoop helps learners retain vocabulary efficiently through spaced repetition. Instead of passive review, learners are challenged with a 15-second multiple-choice question (MCQ) for each due card before rating their recall difficulty. The application operates completely within the browser—requiring no backend, no cloud database, and no account setup.

---

## Key Features

- **Timed Multiple-Choice Recall**:
  - Each review card presents 4 answer choices (1 correct translation and 3 unique distractors sampled dynamically from your deck or curated vocabulary).
  - A 15-second countdown timer challenges immediate recall, transitioning to an urgent state when $\le 5$ seconds remain.
  - Immediate visual feedback highlights the correct choice, identifies errors, and reveals example sentences.
- **Deterministic Spaced Repetition**:
  - Four calibrated recall ratings: **AGAIN** (reset interval), **HARD** (controlled growth), **GOOD** (standard interval ladder), and **EASY** (accelerated interval growth).
  - Safeguards against interval stagnation on HARD ratings and interval regression on successful reviews.
  - Same-day review protection freezes intervals on repeat study within the same calendar day.
- **Stable Review Queue**:
  - The review queue is frozen on session launch to prevent mid-session card skipping when scheduling updates.
- **Comprehensive Dashboard**:
  - Instant visibility into Total Flashcards, Due Today, Overdue Cards, and Future Reviews.
  - Post-session study summaries aggregate rating distributions and interval forecasts.
- **Deck Management**:
  - Full CRUD capabilities: create, edit, search, filter by review status, and delete vocabulary cards.
  - Safe sample-data reset option to restore educational sample cards on demand.
- **Privacy-First & Offline-Ready**:
  - 100% client-side persistence using browser `localStorage` with runtime schema validation.
  - No external tracking, third-party analytics, or cloud dependencies.
- **Accessible & Responsive**:
  - Full keyboard accessibility: number keys `1`–`4` select MCQ options and submit recall ratings; `Esc` closes modals.
  - Mobile-friendly responsive design.

---

## Technology Stack

- **Framework**: React 19
- **Language**: TypeScript 5.7 (strict mode enabled)
- **Build Tool**: Vite 6
- **Test Runner**: Vitest 3 (115 unit and acceptance tests)
- **Styling**: Pure CSS3 with custom variables and responsive grid layouts
- **Persistence**: Browser `localStorage` API with in-memory fallback adapter

---

## Prerequisites

- **Node.js**: Version 18.0.0 or higher (LTS recommended)
- **npm**: Version 9.0.0 or higher

---

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd LinguaLoop
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173`.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the local Vite development server with Hot Module Replacement (HMR). |
| `npm test` | Runs the full Vitest automated test suite once (`vitest run`). |
| `npm run test:watch` | Runs tests in interactive watch mode for active test-driven development. |
| `npx tsc -p tsconfig.app.json --noEmit` | Runs strict TypeScript compiler type checking without emitting files. |
| `npm run build` | Builds optimized, production-ready static assets into the `dist/` directory. |

---

## Project Structure

```
LinguaLoop/
├── src/
│   ├── components/            # React UI components
│   │   ├── Dashboard.tsx      # Main dashboard with study metrics and quick actions
│   │   ├── DeckList.tsx       # Searchable, filterable vocabulary collection view
│   │   ├── FlashcardForm.tsx  # Add and edit flashcard modal form
│   │   ├── FlashcardItem.tsx  # Individual flashcard card component
│   │   ├── Header.tsx         # Top navigation and due-card counter
│   │   ├── ReviewSession.tsx  # Timed MCQ review flow with rating buttons
│   │   ├── StudySummary.tsx   # Session completion report and schedule forecast
│   │   └── *.test.ts          # Component and integration test suites
│   ├── core/                  # Pure domain logic (decoupled from UI)
│   │   ├── dateUtils.ts       # Local calendar date arithmetic and validation (YYYY-MM-DD)
│   │   ├── mcqUtils.ts        # 4-option MCQ generator with distractor selection
│   │   ├── scheduler.ts       # Spaced-repetition scheduling algorithm and queue generator
│   │   └── *.test.ts          # Core logic unit test suites
│   ├── storage/               # Persistence layer
│   │   ├── localStorage.ts    # Typed storage adapter with runtime schema validation
│   │   ├── sampleData.ts      # Educational default vocabulary cards
│   │   └── localStorage.test.ts # Storage validation and persistence tests
│   ├── types/
│   │   └── flashcard.ts       # Domain TypeScript interfaces and types
│   ├── acceptance.test.ts     # End-to-end user journey acceptance tests
│   ├── App.tsx                # Application root component and state coordinator
│   ├── main.tsx               # DOM mounting entrypoint
│   └── styles.css             # Unified CSS design system
├── index.html                 # Vite HTML entrypoint
├── package.json               # Project manifest, scripts, and dependencies
├── tsconfig.json              # TypeScript root configuration
├── tsconfig.app.json          # Application TypeScript configuration
├── tsconfig.node.json         # Node/Vite build TypeScript configuration
└── vite.config.ts             # Vite bundler configuration
```

---

## Local Data Storage & Privacy

All application data is stored solely in the user's local web browser via `localStorage` under the dedicated key `lingualoop_flashcards`.

- **No Remote Transmission**: No card content, review history, or personal metrics are sent over the network.
- **Device Scoped**: Data is tied to the browser profile on your device. Clearing browser site data will remove stored cards; the application provides a "Reset Sample Cards" button to restore initial sample vocabulary at any time.

---

## Screenshots

<!-- Add visual previews below once screenshots are captured -->

### Dashboard & Metrics
*(Screenshot placeholder: Dashboard displaying study queue, metrics overview, and quick actions)*

### Timed Multiple-Choice Review
*(Screenshot placeholder: Timed 15-second MCQ review session with active countdown and 4 answer choices)*

### Answer Reveal & Spaced Repetition Rating
*(Screenshot placeholder: Revealed card showing feedback, correct translation, example sentence, and AGAIN/HARD/GOOD/EASY buttons)*

### Vocabulary Deck Management
*(Screenshot placeholder: Searchable and filterable flashcard deck with scheduling badges)*

---

## Development Notes

LinguaLoop was developed iteratively using **GitHub Copilot** as an AI pair programming assistant, with continuous verification through automated tests, static analysis, and end-to-end scenario validation.

---

## License

This project is open-source and available under the [MIT License](LICENSE).
