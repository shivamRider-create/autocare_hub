
# 🏍️ AutoCare Hub – Vehicle Maintenance and Service Tracker

<p align="center">
  <strong>Your Vehicle. Your Service History. Your Control.</strong>
</p>

## 📌 About the Project

AutoCare Hub is a full-stack web application designed to help vehicle owners manage their vehicles and track maintenance activities in one place.

The platform supports both bikes and cars, providing features such as vehicle management, service appointments, fuel tracking, expense monitoring, reminders and document management.

## ✨ Features

- 🔐 User Registration and Login
- 📊 Interactive Owner Dashboard
- 🚗 Vehicle Management – Add, Edit and Delete Vehicles
- 📅 Service Appointment Management
- 🔧 Service History Tracking
- ⛽ Fuel Consumption and Fuel Expense Tracking
- 💰 Vehicle Expense Management
- 🔔 Maintenance Reminders
- 📁 Vehicle Document Upload and Management

## 🛠️ Technologies Used

### Frontend
- HTML5
- CSS3
- JavaScript

### Backend
- Node.js
- Express.js
- REST APIs
- JWT Authentication
- bcrypt Password Hashing
- Multer File Uploads

### Database
- MySQL
- mysql2

## 📂 Project Structure

```text
AutoCare-Hub/
│
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── server.js
│   ├── package.json
│   └── .gitignore
│
├── database/
│
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── vehicles.html
│   ├── appointments.html
│   ├── service-history.html
│   ├── fuel-tracker.html
│   ├── expenses.html
│   ├── reminders.html
│   ├── documents.html
│   ├── style.css
│   └── JavaScript files
│
├── .gitignore
└── README.md
```

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/shivamRider-create/autocare_hub.git
```

### 2. Open the Project

```bash
cd autocare_hub
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

### 4. Configure Environment Variables

Create a `.env` file inside the backend folder:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=autocare_hub
JWT_SECRET=your_private_jwt_secret
```

Never upload your actual `.env` file to GitHub.

### 5. Configure MySQL

Create a MySQL database named:

```sql
CREATE DATABASE autocare_hub;
```

Import or execute the project's database schema to create the required tables.

### 6. Start the Backend

```bash
npm run dev
```

Backend runs at:

```text
http://localhost:5000
```

### 7. Run the Frontend

Open the `frontend/index.html` file using the VS Code Live Server extension.

## 🔒 Security

- Passwords are hashed using bcrypt.
- JWT is used for authentication.
- Environment variables store sensitive configuration.
- User-specific vehicle data is protected by ownership checks.

## 🎯 Project Objective

The objective of AutoCare Hub is to simplify vehicle maintenance by providing a centralized platform for managing vehicle information, service records, fuel usage, expenses, reminders and important documents.

## 👨‍💻 Developer

**Shivam Vishwakarma**

GitHub: [shivamRider-create](https://github.com/shivamRider-create)

Project Repository: [AutoCare Hub](https://github.com/shivamRider-create/autocare_hub)

---

<p align="center">
  Built with ❤️ for smarter vehicle management.
</p>
