# Week 4 (Assignment A4) - Auth · Login & Protect

> Cloud Authentication and JWT Bearer authorization service leveraging Supabase Auth as Identity Provider (IdP) with dependency-injected route protection.

---

## Visual Documentation

![Swagger UI Bearer Auth](../static/w4.png)

---

## Architecture Overview
- **Identity Provider (IdP)**: Supabase Auth handles password hashing, salt storage, and cryptographic token issuance.
- **FastAPI Auth Middleware**: FastAPI dependency injection verifies incoming `Authorization: Bearer <jwt>` tokens against Supabase's user verification endpoint before exposing protected resources.
- **Interactive OpenAPI Security**: Configured with `OAuth2PasswordBearer` and HTTPBearer schemes, displaying active lock icons in Swagger UI for token validation testing.

---

## Environment Setup
Create a `.env` file in this directory based on [`.env.example`](.env.example):

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-key
PORT=8000
```

> [!CAUTION]
> Never commit `.env` or use the `service_role` key in public settings. Use only the public `anon` key.

---

## Quickstart

### 1. Install Dependencies
```bash
uv pip install -r requirements.txt
```

### 2. Launch the Application
```bash
uv run --directory . python -m uvicorn main:app --reload
```
- **Base URL**: `http://localhost:8000`
- **Interactive Swagger UI**: `http://localhost:8000/docs`

---

## API Endpoints & Auth Matrix

| Method | Endpoint | Description | Auth Required | Status Code |
|---|---|---|---|---|
| `POST` | `/auth/signup` | Register a new user with email & password | No | `201 Created` / `400 Bad Request` |
| `POST` | `/auth/login` | Authenticate credentials and retrieve JWT | No | `200 OK` / `401 Unauthorized` |
| `POST` | `/auth/logout` | Terminate active user session | Yes (`Bearer <token>`) | `204 No Content` / `401 Unauthorized` |
| `GET` | `/public/info` | Public open status endpoint | No | `200 OK` |
| `GET` | `/protected/profile` | Retrieve verified user claims and metadata | Yes (`Bearer <token>`) | `200 OK` / `401 Unauthorized` |
| `GET` | `/protected/dashboard` | Reusable guard verification route | Yes (`Bearer <token>`) | `200 OK` / `401 Unauthorized` |
