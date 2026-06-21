# ClassTrack

## Overview

ClassTrack is an intelligent classroom attendance and student management system that automates attendance tracking through facial recognition technology. The platform combines artificial intelligence with a modern web application to streamline attendance management, reduce manual effort, and improve accuracy in educational environments.

The system enables instructors and administrators to manage students, monitor attendance records, and generate reports while leveraging computer vision for automated identification.

---

## Features

### Smart Attendance System

* Automated attendance marking
* Facial recognition-based student identification
* Real-time attendance tracking
* Attendance validation and verification

### Student Management

* Student registration
* Student profile management
* Student record maintenance
* Attendance history tracking

### Classroom Monitoring

* Live face detection
* Student recognition from camera feeds
* Attendance synchronization with database

### Dashboard & Reporting

* Attendance statistics
* Student attendance records
* Search and filtering functionality
* Attendance reports and analytics

### Authentication & Security

* Secure login system
* User authentication
* Role-based access control
* Protected student data

---

## Technology Stack

### Frontend

* React.js
* JavaScript
* HTML5
* CSS3

### Backend

* Node.js
* Express.js

### Database

* MongoDB

### Artificial Intelligence

* Python
* OpenCV
* Face Recognition Models
* Machine Learning Algorithms

---

## Project Structure

```text
ClassTrack/
│
├── ai/                     # Facial recognition and AI modules
│
├── api/
│   └── src/                # Backend APIs and business logic
│
├── client/                 # React frontend application
│
├── Class_Track-2.pdf       # Project documentation
│
├── Class_Track-2.docx      # Project documentation
│
└── README.md
```

---

## Core Modules

### Authentication Module

* User login
* Session management
* Secure authentication

### Student Management Module

* Add students
* Update student records
* Manage student information
* Student profile maintenance

### Attendance Module

* Attendance recording
* Attendance history
* Daily attendance tracking
* Attendance reporting

### Face Recognition Module

* Face detection
* Student identification
* Automated attendance marking
* Recognition model management

### Reporting Module

* Attendance summaries
* Student attendance reports
* Statistical analysis
* Record export functionality

---

## System Workflow

1. Students are registered in the system.
2. Facial data is collected and processed.
3. Face recognition models are trained.
4. Live camera feed detects and identifies students.
5. Attendance is marked automatically.
6. Attendance records are stored in the database.
7. Administrators and instructors can review reports through the dashboard.

---

## Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/ClassTrack.git
cd ClassTrack
```

### Backend Setup

```bash
cd api
npm install
npm start
```

### Frontend Setup

```bash
cd client
npm install
npm start
```

### AI Module Setup

```bash
cd ai
pip install -r requirements.txt
python main.py
```

---

## Future Enhancements

* Mobile application support
* Multi-class attendance management
* QR code attendance backup
* Real-time notifications
* Advanced analytics dashboard
* Cloud deployment
* Student performance integration

---

## Benefits

* Eliminates manual attendance processes
* Reduces attendance fraud
* Improves record accuracy
* Saves instructor time
* Provides centralized attendance management
* Enables real-time monitoring and reporting

