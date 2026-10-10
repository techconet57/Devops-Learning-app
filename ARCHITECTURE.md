# Architecture

```text
                    Internet
                       |
                       v
                 AWS EC2 :80
                       |
                    Nginx
                 /          \
                /            \
       Static frontend       /api
                              |
                              v
                       Node.js/Express
                              |
                              v
                           SQLite
                              |
                         Docker Volume
```

## Containers

- `techconet57-nginx`: public web server and reverse proxy
- `techconet57-app`: REST API and authentication
- `app_data`: persistent SQLite database

## API

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/courses`
- `GET /api/courses/:slug`
- `GET /api/progress`
- `POST /api/progress/:lessonId`
- `DELETE /api/progress/:lessonId`
- `GET /api/dashboard`
