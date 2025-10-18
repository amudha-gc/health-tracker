# Health Tracker Dashboard

A full-stack health tracking application with React frontend and Node.js backend. [Try it online here](https://health-tracker-y9ki.onrender.com "Health Tracker Dashboard")

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

## Local Docker Deployment Steps

### Prerequisites

1.  **Docker Engine Installed:**  
    Verify that Docker Engine is installed and accessible by running:
    ```bash
    docker --version
    ```
    This should output the Docker client and server versions.

2.  **Docker Compose Plugin (v2) Installed:**  
    Ensure you have the Docker Compose V2 plugin installed. You can check its version with:
    ```bash
    docker compose version
    ```
    
3.  **Free Port 3001:**  
    The application's API server runs on port `3001`. Ensure this port is not already in use by another application on your system.

4.  **Internet Access:**  
    An active internet connection is required during the initial setup to download Docker images and install Node.js dependencies (`npm install`).

### Before Running the application

Follow these steps to get the application running with Docker Compose:

1.  **Create a file named .env.local file inside the directory called frontend present at the root level:**  

	Add the following content:
	REACT_APP_API_URL=/api

2.  **Create Data Directory:**  
    Ensure the necessary mount directory for database exists:
    ```bash
    mkdir -p data
    ```

### Starting the application

1.  **Start the Services:**  
    Build and start the Docker containers in detached mode:
    ```bash
    docker compose build --no-cache && docker compose up -d
    ```
    
### Verifying the application

* **Application Frontend:**  
    [http://localhost:3001](http://localhost:3001)

* **Backend API Health Check:**  
    To confirm the backend API is running correctly, visit:
    [http://localhost:3001/api/health](http://localhost:3001/api/health)
    This should return a JSON response similar to:
    ```json
    {"status":"ok","message":"Health Tracker API is running"}
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
├── data/
│   └── health_tracker.db      # SQLite DB (auto-created on first run if missing)
├── frontend/
│   ├── .env.local             # frontend build-time envs
│   ├── package.json           # Frontend deps/scripts
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


## License

MIT
