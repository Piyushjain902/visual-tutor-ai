# Visual Tutor AI

Visual Tutor AI is a physics learning app that combines interactive PhET simulations with AI-powered tutoring. The app helps learners explore physics concepts visually, ask questions in natural language, and receive guided explanations with reflection prompts.

The project currently focuses on electromagnetic induction and Faraday's Law, but the backend is structured to detect simulation-specific topics and provide contextual tutoring.

## Overview

This project contains two main parts:

- Frontend: React + Vite app for the chat interface and simulation panel
- Backend: Express API that sends student questions to AWS Bedrock and shapes the tutoring response

The experience is designed around a learning loop:

1. The student interacts with a simulation
2. The app detects the concept or simulation context
3. The backend builds a tutor prompt using simulation metadata and domain knowledge
4. The AI responds with explanations, guided steps, and a reflection question
5. The student continues the conversation while the session keeps context

## Features

- Interactive physics simulations using PhET HTML assets
- AI-guided tutoring through AWS Bedrock
- Simulation-aware prompts for Faraday's Law and related concepts
- Structured 4-step guided exploration flow
- Reflection questions to reinforce understanding
- Session-based conversational memory
- Live health checks and simulation metadata endpoints
- Static frontend deployment to S3 and backend hosting via Node.js-compatible infrastructure

## Tech Stack

### Frontend
- React
- Vite
- CSS modules and custom styling
- Browser-based simulation embedding

### Backend
- Node.js
- Express
- AWS SDK for Bedrock Runtime
- dotenv-based configuration
- JSON-based tutoring API

### AI / Cloud
- Amazon Bedrock
- Model used in the backend: google.gemma-3-12b-it
- AWS S3 for frontend hosting

## Project Structure

```text
visual-tutor-ai/
├── README.md
├── package.json               # Root deployment script
├── deploy.js                  # S3 deployment helper
├── .gitignore
├── backend/
│   ├── package.json
│   ├── server.js              # Express API and Bedrock integration
│   ├── simulations.js         # Simulation registry and physics context
│   └── simulation-knowledge/
│       └── faraday-knowledge.json
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   │   └── phet/              # PhET simulation assets
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       └── components/
│           ├── ChatPanel.jsx
│           ├── SimulationPanel.jsx
│           ├── GuidedStepsPanel.jsx
│           ├── LearningResponse.jsx
│           └── ...
└── package-lock.json
```

## Prerequisites

Before running the project, make sure you have:

- Node.js 18+ recommended
- npm
- An AWS account with access to Amazon Bedrock
- AWS credentials configured locally

## Local Setup

### 1. Install dependencies

From the project root:

```bash
npm install
```

Backend dependencies:

```bash
cd backend
npm install
```

Frontend dependencies:

```bash
cd frontend
npm install
```

### 2. Configure environment variables

Create a file named `.env` in the `backend` folder:

```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
PORT=3000
```

These values are used by the backend to initialize the Bedrock client.

### 3. Start the backend

```bash
cd backend
npm start
```

The backend runs on `http://localhost:3000` by default and exposes health and tutoring endpoints.

### 4. Start the frontend

```bash
cd frontend
npm run dev
```

Then open the local Vite URL shown in the terminal (usually `http://localhost:5173`).

## Important Note for Local Frontend Testing

The frontend currently sends requests to a deployed backend URL in `frontend/src/components/ChatPanel.jsx`.

If you want to test locally, change the fetch URL to your local backend, for example:

```js
fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: userMessage, guidedMode: true, sessionId })
})
```

This is the main place to update when switching between production and local development.

## API Endpoints

### Backend health

```bash
GET /health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-03-08T00:00:00.000Z"
}
```

### Chat API

```bash
POST /api/chat
```

Request body:

```json
{
  "message": "Explain electromagnetic induction in simple terms",
  "sessionId": "student-session-123",
  "guidedMode": true
}
```

Response:

```json
{
  "explanation": "When a magnetic field through a loop changes...",
  "guided_steps": [
    "Turn on the voltmeter and keep the magnet still near the coil.\nNotice that no voltage appears when the magnet is not moving.",
    "Slowly push the magnet into the coil and pull it out.\nObserve how the voltmeter deflects and the bulb lights briefly."
  ],
  "reflection_question": "Why does the voltage change when the magnet moves faster?"
}
```

### Simulation list

```bash
GET /api/simulations
```

Returns a list of simulation metadata used by the frontend.

## Deployment

### Frontend to AWS S3

The project includes a root deployment script:

```bash
npm run deploy
```

This script builds the frontend and uploads the generated files to an S3 bucket configured with public website hosting.

### Backend deployment

The backend is a standard Node.js Express service and can be deployed to AWS Elastic Beanstalk or any hosting platform that supports Node.js.

Typical steps:

1. Zip the `backend` folder
2. Upload it to Elastic Beanstalk or another Node.js-compatible service
3. Ensure environment variables are configured in the deployment environment
4. Point the frontend to the deployed backend URL

## Current Scope

The current implementation is focused on:

- Electromagnetic induction
- Faraday's Law exploration
- Guided learning with a practical simulation experience

The domain logic and prompt structure are designed to be expanded to additional physics topics in the future.

## License

This project is currently distributed without a formal license declaration in the repository metadata. If you plan to reuse it publicly, add a license file and update this section accordingly.

