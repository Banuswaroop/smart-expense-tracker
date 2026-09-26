# Smart Expense Tracker

A full-stack web application for managing personal expenses and monthly budgets with secure authentication, spending analytics, and a responsive dashboard.

## 🚀 Live Demo

👉 [Project Live Demo](https://smart-expense-tracker-frontend-dxtq.onrender.com)

## ✨ Features

* 🔐 JWT-based user registration and authentication
* 💰 Add, edit, and delete expenses
* 🔎 Search, filter, sort, and paginate expenses
* 📊 Category-wise and monthly spending analytics
* 💳 Monthly category-based budgets
* 📈 Budget usage and remaining amount tracking
* 📱 Responsive desktop and mobile UI
* 🔒 Password hashing and protected API endpoints

## 🛠️ Tech Stack

**Frontend**

* React.js, Vite, JavaScript, CSS
* Recharts, Lucide React

**Backend**

* Python, FastAPI
* SQLAlchemy, Pydantic
* JWT, Passlib, bcrypt

**Database & Deployment**

* PostgreSQL, Neon
* Render
* Git & GitHub

## 🏗️ Architecture

```text
React.js Frontend
       ↓
FastAPI REST API
       ↓
SQLAlchemy
       ↓
PostgreSQL
```

## 📂 Project Structure

```text
smart-expense-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── security.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   └── package.json
│
├── .gitignore
└── README.md
```

## 🔐 Security

* JWT authentication for protected API access
* Passwords hashed using bcrypt
* Sensitive configuration stored in environment variables
* Database credentials and secret keys excluded from GitHub

## ⚙️ Local Setup

### Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/smart_expense_tracker
SECRET_KEY=YOUR_SECRET_KEY
```

## 🧪 Testing

Tested for:

* Authentication and JWT authorization
* Expense CRUD operations
* Search, filtering, sorting, and pagination
* Dashboard analytics
* Budget management and tracking
* Logout and token expiration
* Responsive desktop and mobile UI

## 🚀 Deployment

* **Frontend:** Render
* **Backend:** Render
* **Database:** Neon PostgreSQL

The deployed frontend communicates with the FastAPI backend and cloud PostgreSQL database.

## 🔮 Future Improvements

* Refresh token authentication
* AI-powered spending insights
* AI-based expense categorization
* Recurring expenses
* Automated financial summaries
* Advanced financial reports
