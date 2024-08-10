# About

A daily planner powered by Claude-Sonnet 3.5. If only there was a personalised planner that was tailored based on your lifestyle, body chemistry, habits, needs and preferences with the whole planner creation process streamlined...

## Features

- Capture user's energy levels throughbout the day to understand when they feel their best, worst, normal or asleep 
- Auto categorise tasks for the day into 5 pillars: Work, Exercise, Relationship, Fun, and Ambition
- Get the user to rank the importance of these 5 pillars and combine with their energy levels to optimise task allocation
- Customizable layout preferences (structured/unstructured, timeboxed/untimeboxed)
- RESTful API for schedule generation and task categorization

## Main Dashboard
V1 - still optimising prompt and making the output more interactable

![image](https://github.com/user-attachments/assets/94c239f5-5afd-4204-9a73-31347e7dd75d)

# Architecture
![image](https://github.com/user-attachments/assets/436dd66c-5144-4b94-8487-e1203336601f)

# Tech Stack Summary

## Backend
1. **Python**: Primary programming language
2. **Flask**: Web framework for creating the REST API

### AI
1. **Claude Sonnet 3.5**: API for NLP generation
2. **PyTorch**: Deep learning framework, used as the backend for the Transformers library

## Frontend 
1. **React**: JavaScript library for building user interfaces
2. **Evergreen UI**: React UI framework for building the user interface

## Testing
1. **Pytest**: For backend testing
2. **Jest**: For frontend React component testing

## DevOps
1. **Ngrok**: Tunnelling to connect Colab Server to local
2. **Docker**: For containerization and easier deployment 
3. **NGINX**: As a reverse proxy server (if deployed to production)


## Installation

1. Clone the repository:
   ```
   git clone https://github.com/Jwu44/yourdAI.git
   ```

2. Install the required dependencies in root folder:
   ```
   npm install
   ```
   
3. Install the required dependencies in frontend folder:
   ```
   cd frontend
   npm install
   ```
   
## Usage

i) Start virtual environment in root folder
```
source /venv/bin/activate    
```

ii) Terminal 1: Run backend server in root folder
```
python3 app.py
```

iii) Terminal 2: Run frontend server in frontend folder
```
cd frontend
npm start
```

iv) Terminal 3: Run nginx
```
sudo nginx
```

v) Open Colab script and follow these instructions to execute the script:
```
a. Log in to hugging face using secret key
b. Execute each code block
c. Copy paste ngrok tunnel into colab_integration.py
d. Run main script
```
    
### Nginx commands
```
brew services stop nginx
brew services restart nginx
sudo nginx -t
```

## API Documentation

### Generate Schedule

**Endpoint:** `/process_user_data`

**Method:** POST

**Request Body:**
```json
{
  "name": "John Doe",
  "age": 30,
  "work_start_time": "09:00",
  "work_end_time": "17:00",
  "energy_levels": [
    {"x": 8, "y": 60},
    {"x": 12, "y": 80},
    {"x": 15, "y": 70},
    {"x": 20, "y": 40}
  ],
  "tasks": [
    {"id": 1, "text": "Team meeting", "category": "Work"},
    {"id": 2, "text": "Gym workout", "category": "Exercise"}
  ],
  "priorities": {
    "health": 1,
    "relationships": 2,
    "fun_activities": 3,
    "ambitions": 4
  },
  "layout_preference": {
    "type": "to-do-list",
    "subcategory": "structured-timeboxed"
  }
}
```

**Response:**
```json
{
  "schedule": "Generated schedule as a string"
}
```

### Categorize Task

**Endpoint:** `/categorize_task`

**Method:** POST

**Request Body:**
```json
{
  "task": "Attend team meeting"
}
```

**Response:**
```json
{
  "category": "Work"
}
```
