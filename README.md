# techconet57 Learning Platform

Full-stack learning website for AWS EC2.

Stack: Nginx + Node.js/Express + SQLite + HTML/CSS/JavaScript + Docker Compose.

## Architecture

Browser -> Nginx :80 -> Frontend
                    -> /api -> Express :3000 -> SQLite

## Deploy on EC2

1. Install Docker and Docker Compose.
2. Copy this directory to EC2.
3. `cp .env.example .env`
4. Edit `.env` and set a strong JWT_SECRET.
5. `docker compose up -d --build`
6. `docker compose ps`
7. `curl http://localhost/health`
8. Open `http://EC2_PUBLIC_IP`

Allow inbound TCP 80 in the EC2 security group.

## Features

- Responsive learning portal
- Course search
- Linux, Docker, Kubernetes, Ansible and CI/CD courses
- Registration/login
- JWT authentication
- Lesson progress tracking
- SQLite persistence
- Nginx reverse proxy
- Dockerized deployment
