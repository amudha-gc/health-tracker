# Health Tracker Dashboard

A full-stack health tracking application with React frontend and Node.js backend. [Try it online here](https://health-tracker-y9ki.onrender.com "Health Tracker Dashboard")

## Quick Start

For running locally, add the file: frontend/.env.local with the following content:
REACT_APP_API_URL=/api

### Option 1: Docker (Recommended)
```bash
docker-compose up -d
```
Access at: http://localhost:3001

### Option 2: Local Development

**Backend:**
```bash
npm install
npm start
```

**Frontend (new terminal):**
```bash
cd frontend
npm install
npm install -D tailwindcss postcss autoprefixer
npm start
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/metrics` - Create metric
- `GET /api/metrics` - Get all metrics (supports ?start=YYYY-MM-DD&end=YYYY-MM-DD)
- `DELETE /api/metrics/:id` - Delete metric

## Project Structure

```
health-tracker/
├── server.js                  # Express backend (API + static frontend)
├── package.json               # Backend deps/scripts
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .gitignore
├── README.md
├── frontend/
│   ├── .env.local            # ← added (frontend build-time envs)
│   ├── package.json          # Frontend deps/scripts
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.css
│       ├── index.js
│       ├── App.js
│       └── components/
│           ├── HealthTracker.js
│           └── MetricsCharts.jsx


```


## Features

- Add daily health metrics (steps, heart rate)
- View statistics and averages
- Interactive charts with Recharts
- Date range filtering
- RESTful API with SQLite database
- Docker support
- Evolt360-inspired dark theme

## Tech Stack

- **Frontend:** React, Recharts, Tailwind CSS, Lucide React
- **Backend:** Node.js, Express, SQLite
- **DevOps:** Docker, Docker Compose

## License

MIT
