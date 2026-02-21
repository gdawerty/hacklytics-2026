# Hacklytics 2026

A full-stack application with Flask backend and React TypeScript Vite frontend.

## Project Structure

```
hacklytics-2026/
├── backend/          # Flask Python backend
│   ├── app.py       # Main Flask application
│   └── requirements.txt
└── frontend/        # React TypeScript Vite frontend
    ├── src/
    ├── package.json
    └── tailwind.config.js
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the Flask server:
```bash
python app.py
```

The backend will run on `http://localhost:5001`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Features

- **Backend**: Flask API with CORS enabled, returns signal data with success status
- **Frontend**: React TypeScript application with Tailwind CSS styling
- **Auto-refresh**: Frontend automatically fetches new signals every 3 seconds
- **Manual Refresh**: Click the "Refresh" button to manually fetch a new signal
- **Status Display**: Visual indicators for success/failure status

## API Endpoints

- `GET /api/signal` - Returns signal data with success status
- `GET /api/health` - Health check endpoint

## Technologies

- **Backend**: Flask, Flask-CORS
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Styling**: Custom Tailwind CSS configuration with manual setup
