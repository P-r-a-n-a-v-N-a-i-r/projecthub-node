<div align="center">
  ProjectHub Backend 🚀


## Node.js/Express REST API for Project Management Platform

![Tests](https://img.shields.io/badge/Tests-67.8%25-brightgreen.svg)
![Coverage](https://img.shields.io/badge/Coverage-68%25-blue.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)
![License](https://img.shields.io/badge/License-MIT-brightgreen.svg)

**Live Demo**: http://www.projecthub.lol

</div>
<img width="1919" height="909" alt="dashboard" src="https://github.com/user-attachments/assets/6342ae87-e9e3-43d6-a96b-2600c33fa16b" />

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Security Analysis](#security-analysis)
- [Docker](#docker)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

ProjectHub Backend is the robust Node.js/Express API powering the ProjectHub project management platform. It provides complete CRUD operations for projects, tasks, teams, and user management with MongoDB persistence.

### Key Metrics:
- **43 passing tests** across 4 test files  
- **67.8% line coverage**, **60% branch coverage** (Jest)  
- **Production-ready** with Docker containerization  
- **Automated CI/CD** pipeline with GitHub Actions  
- **Security scanned** with SonarQube, Snyk, OWASP ZAP  

---

## Features

### ✅ Core Functionality
- **JWT Authentication** - Secure login/register flows  
- **Projects Management** - Create, read, update, delete projects  
- **Tasks Management** - To Do → In Progress → Completed workflow  
- **Team Collaboration** - Member invitations via email  
- **Activity Feed** - Complete audit trail of all actions  

### 🛡️ Security
- **Input validation** on all endpoints  
- **Rate limiting** protection  
- **CORS configuration**  
- **Helmet security headers**  

### 📊 Analytics
- **Dashboard statistics** (projects, tasks, completion %)  
- **Team member counts**  
- **Activity logging**

---

## Technology Stack

**Backend:** Node.js 20.x, Express.js 4.18  
**Database:** MongoDB (Atlas compatible)  
**Auth:** JSON Web Tokens (JWT)  
**Testing:** Jest, Supertest  
**Container:** Docker  
**CI/CD:** GitHub Actions  
**Security:** SonarQube, Snyk  
**Deployment:** AWS EC2 + Nginx  

---

## Quick Start

### Prerequisites
- Node.js >= 20.x  
- npm >= 10.x  
- MongoDB Atlas account (or local MongoDB)  
- Git  
- Docker (optional)

### Installation

```bash
# Clone repository
git clone https://github.com/P-r-a-n-a-v-N-a-i-r/projecthub-node.git
cd projecthub-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

Server will be available at:  
`http://localhost:5000`

---

## Production Build

```bash
npm run build
npm start
```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/projecthub

# Server
PORT=5000
NODE_ENV=production

# JWT
JWT_SECRET=your-very-long-super-secret-jwt-key-here-minimum-32-chars

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

---

## Testing

### Run Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Results

- ✓ 43 tests passing  
- ✓ 67.8% lines covered  
- ✓ 60% branches covered  
- ✓ 4 test files  

---

## CI/CD Pipeline

Automated with GitHub Actions:

```
Push to main
    ↓
Jest Tests (43/43 pass)
    ↓
SonarQube Analysis (Security E)
    ↓
Snyk Security Scan (1 high issue)
    ↓
Docker Build & Push
    ↓
Deploy to AWS EC2
```

Pipeline Time: ~3 minutes

---

## Security Analysis

### SonarQube Results

- Security: E (2 open issues - input validation)  
- Reliability: A (1 issue)  
- Maintainability: A (9 issues)  
- Coverage: 42.3% (SonarQube metric)  
- Duplications: 0%

### Snyk Results

- Dependencies: 181 total  
- High severity: 1 issue  
- Vulnerable paths: 3  
- Issue: JSON Web Signature crypto verification  
- Fix: Upgrade Google auth library  

---

## Docker

### Build & Run

```bash
# Build image
docker build -t projecthub-backend:latest .

# Run container
docker run -p 5000:5000 \
  -e MONGODB_URI=your_mongo_uri \
  -e JWT_SECRET=your_secret \
  projecthub-backend:latest
```

Dockerfile optimized for production with multi-stage build.

---

## Deployment

### AWS EC2 Setup

- EC2 Instance: Ubuntu 22.04  
- Services: Docker + Nginx reverse proxy  
- CI/CD: GitHub Actions SSH deployment  
- Database: MongoDB Atlas (cloud)  
- Domain: projecthub.lol → EC2 public IP  

### Production Commands

```bash
ssh user@ec2-instance
docker pull projecthub-backend:latest
docker stop projecthub-backend || true
docker rm projecthub-backend || true
docker run -d --name projecthub-backend -p 5000:5000 projecthub-backend:latest
```

---

## Contributing

1. Fork the repository  
2. Create feature branch: `git checkout -b feature/amazing-feature`  
3. Commit changes: `git commit -m 'Add amazing feature'`  
4. Push: `git push origin feature/amazing-feature`  
5. Open Pull Request  

Please:
- Write tests for new features  
- Follow existing code style  
- Update documentation  
- Pass all CI checks  

---

## License

This project is licensed under the MIT License.
