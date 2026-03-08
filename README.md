# Visual Tutor AI - Physics Learning Platform

An AI-powered physics tutoring application that combines interactive PhET simulations with conversational AI for enhanced learning experiences.

## Features

- **Interactive Physics Simulations**: Embedded PhET simulations (Faraday's Law - Electromagnetic Induction)
- **AI-Powered Tutoring**: Uses AWS Bedrock (Gemma 3 12B) for intelligent explanations
- **Guided Learning Steps**: Structured 4-step guided exploration for each simulation
- **Quick Questions**: Reflection questions to reinforce understanding
- **Conversational Memory**: Maintains context across the learning session

## Tech Stack

### Frontend
- React + Vite
- CSS3 with modern styling
- Deployed on AWS S3

### Backend
- Node.js + Express
- AWS Bedrock for LLM integration
- Deployed on AWS Elastic Beanstalk

## Project Structure

```
visual-tutor-ai/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatPanel.jsx      # Main chat interface
│   │   │   ├── SimulationPanel.jsx # PhET simulation embed
│   │   │   ├── GuidedStepsPanel.jsx
│   │   │   └── ...
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── public/
│       └── phet/                   # PhET simulation files
│
└── backend/
    ├── server.js                   # Express server with Bedrock integration
    └── package.json
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- AWS Account with Bedrock access
- AWS CLI configured

### Backend Setup
```bash
cd backend
npm install
# Create .env file with AWS credentials
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend (.env)
```
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
```

## Deployment

### Frontend (S3)
```bash
cd frontend
npm run build
# Upload dist/ to S3 bucket
```

### Backend (Elastic Beanstalk)
- Create zip of backend folder
- Upload to Elastic Beanstalk environment

## Live Demo

- **Frontend**: http://visual-tutor-ai-physics.s3-website.ap-south-1.amazonaws.com
- **Backend**: http://visualtutorai-env.eba-xxxxx.ap-south-1.elasticbeanstalk.com

## Author

Piyush Jain

## License

MIT License
