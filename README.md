Digital Healthcare System
A comprehensive web-based healthcare management system built with HTML, CSS, JavaScript, Node.js, Express, and MySQL.

Features
🏥 Core Modules
Doctor Management: Add, view, update, and delete doctor records
Patient Management: Complete patient registration and record management
Appointment Booking: Schedule and manage appointments with doctors
Dashboard Statistics: View system-wide statistics and metrics
✨ Key Highlights
Responsive design with modern UI
RESTful API architecture
CRUD operations for all entities
Real-time data updates
Form validation
Error handling
Technologies Used
Frontend
HTML5
CSS3 (with modern gradient designs)
Vanilla JavaScript (ES6+)
Fetch API for HTTP requests
Backend
Node.js
Express.js
MySQL2 (MySQL driver)
CORS
Body Parser
Database
MySQL
Project Structure
digital-healthcare-system/
├── index.html              # Frontend HTML file
├── server.js               # Backend Express server
├── package.json            # NPM dependencies
├── schema.sql             # Database schema
└── README.md              # This file
Installation & Setup
Prerequisites
Node.js (v14 or higher)
MySQL Server (v5.7 or higher)
npm or yarn
Step 1: Install MySQL
Download and install MySQL from mysql.com
Start MySQL service
Note your MySQL root password
Step 2: Create Database
Open MySQL command line or MySQL Workbench
Run the following commands:
sql
CREATE DATABASE healthcare_system;
USE healthcare_system;
Execute the schema.sql file:
In MySQL Workbench: File → Run SQL Script → Select schema.sql
Or copy-paste the entire schema.sql content and execute
Step 3: Setup Backend
Create a new project directory:
bash
mkdir digital-healthcare-system
cd digital-healthcare-system
Create package.json and install dependencies:
bash
npm init -y
npm install express mysql2 cors body-parser
npm install --save-dev nodemon
Copy the server.js file to your project directory
Update database credentials in server.js:
javascript
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'YOUR_MYSQL_PASSWORD', // Change this
    database: 'healthcare_system'
});
Step 4: Setup Frontend
Copy index.html to your project directory
Make sure the API_URL in the HTML file points to your backend:
javascript
const API_URL = 'http://localhost:3000/api';
Running the Application
Start the Backend Server
bash
npm start
Or for development with auto-restart:

bash
npm run dev
The server will start on http://localhost:3000

Open the Frontend
Open index.html in your web browser
Or use a local server (recommended):
bash
# Using Python
python -m http.server 8000

# Using Node.js http-server
npx http-server
Then navigate to http://localhost:8000

API Endpoints
Doctors
GET /api/doctors - Get all doctors
GET /api/doctors/:id - Get single doctor
POST /api/doctors - Add new doctor
PUT /api/doctors/:id - Update doctor
DELETE /api/doctors/:id - Delete doctor
Patients
GET /api/patients - Get all patients
GET /api/patients/:id - Get single patient
POST /api/patients - Register new patient
PUT /api/patients/:id - Update patient
DELETE /api/patients/:id - Delete patient
Appointments
GET /api/appointments - Get all appointments
GET /api/appointments/:id - Get single appointment
POST /api/appointments - Book new appointment
PUT /api/appointments/:id - Update appointment
DELETE /api/appointments/:id - Cancel appointment
Statistics
GET /api/statistics - Get dashboard statistics
Database Schema
Tables
doctors - Stores doctor information
patients - Stores patient records
appointments - Manages appointment bookings
medical_records - Optional table for medical history
Usage Guide
Adding a Doctor
Navigate to "Doctors" section
Click "Add Doctor" tab
Fill in doctor details (name, specialization, email, phone, experience)
Click "Add Doctor" button
Registering a Patient
Go to "Patients" section
Click "Add Patient" tab
Enter patient information
Submit the form
Booking an Appointment
Navigate to "Appointments"
Select "Book Appointment" tab
Choose patient name, doctor, date, time, and reason
Click "Book Appointment"
Sample Data
The database schema includes sample data:

5 doctors with different specializations
4 registered patients
4 sample appointments
Troubleshooting
Common Issues
Database Connection Error

Error: ER_ACCESS_DENIED_ERROR
Solution: Check MySQL credentials in server.js

CORS Error

Access to fetch blocked by CORS policy
Solution: Ensure CORS is enabled in server.js (already included)

Port Already in Use

Error: listen EADDRINUSE: address already in use :::3000
Solution: Change PORT in server.js or kill the process using port 3000

MySQL Connection Timeout

Ensure MySQL service is running
Check firewall settings
Verify database name and credentials
Future Enhancements
User authentication and authorization
Medical records management
Prescription generation
Email notifications
PDF report generation
Payment integration
Video consultation feature
Admin dashboard with analytics
Security Notes
⚠️ Important: This is a college assignment project. For production use:

Implement proper authentication (JWT, sessions)
Use environment variables for sensitive data
Add input sanitization
Implement rate limiting
Use HTTPS
Add password hashing for user accounts
Implement proper error handling
Add logging system
Credits
Created for college assignment - Digital Healthcare Management System

License
MIT License - Free to use for educational purposes

Support
For issues or questions, please refer to:

Express.js documentation: https://expressjs.com/
MySQL documentation: https://dev.mysql.com/doc/
Node.js documentation: https://nodejs.org/docs/
Note: Make sure to update the MySQL password in server.js before running the application!

