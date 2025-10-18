const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MySQL Database Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '@Omrock9860', // Change this to your MySQL password
    database: 'healthcare_system'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// ==================== AUTHENTICATION ROUTES ====================

// Register new user
app.post('/api/auth/register', (req, res) => {
    const { name, email, password, phone, role } = req.body;
    
    // Validate role
    if (role === 'admin') {
        return res.status(403).json({ error: 'Cannot register as admin' });
    }
    
    // Check if user already exists
    const checkQuery = 'SELECT * FROM users WHERE email = ?';
    db.query(checkQuery, [email], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (results.length > 0) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }
        
        // Insert new user
        const insertQuery = 'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)';
        db.query(insertQuery, [name, email, password, phone, role], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // If doctor, add to doctors table
            if (role === 'doctor') {
                const doctorQuery = 'INSERT INTO doctors (name, specialization, email, phone, experience) VALUES (?, ?, ?, ?, ?)';
                db.query(doctorQuery, [name, 'General Medicine', email, phone, 0], (err) => {
                    if (err) console.error('Error adding doctor:', err);
                });
            }
            
            // If patient, add to patients table
            if (role === 'patient') {
                const patientQuery = 'INSERT INTO patients (name, email, phone, dob, gender, address) VALUES (?, ?, ?, ?, ?, ?)';
                db.query(patientQuery, [name, email, phone, '2000-01-01', 'Other', 'Address not provided'], (err) => {
                    if (err) console.error('Error adding patient:', err);
                });
            }
            
            res.status(201).json({ 
                message: 'Registration successful',
                userId: result.insertId 
            });
        });
    });
});

// Login user
app.post('/api/auth/login', (req, res) => {
    const { email, password, role } = req.body;
    
    const query = 'SELECT * FROM users WHERE email = ? AND password = ? AND role = ? AND is_active = TRUE';
    db.query(query, [email, password, role], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = results[0];
        
        // Remove password from response
        delete user.password;
        
        res.json({ 
            message: 'Login successful',
            user: user
        });
    });
});

// Get user profile
app.get('/api/auth/profile/:email', (req, res) => {
    const query = 'SELECT id, name, email, phone, role, created_at FROM users WHERE email = ?';
    db.query(query, [req.params.email], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(results[0]);
    });
});

// Update user password
app.put('/api/auth/change-password', (req, res) => {
    const { email, oldPassword, newPassword } = req.body;
    
    // Verify old password
    const checkQuery = 'SELECT * FROM users WHERE email = ? AND password = ?';
    db.query(checkQuery, [email, oldPassword], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (results.length === 0) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Update password
        const updateQuery = 'UPDATE users SET password = ? WHERE email = ?';
        db.query(updateQuery, [newPassword, email], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json({ message: 'Password changed successfully' });
        });
    });
});

// Get all users (admin only)
app.get('/api/users', (req, res) => {
    const query = 'SELECT id, name, email, phone, role, is_active, created_at FROM users ORDER BY created_at DESC';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// ==================== DOCTORS ROUTES ====================

// Get all doctors
app.get('/api/doctors', (req, res) => {
    const query = 'SELECT * FROM doctors ORDER BY name';
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// Get single doctor
app.get('/api/doctors/:id', (req, res) => {
    const query = 'SELECT * FROM doctors WHERE id = ?';
    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ error: 'Doctor not found' });
            return;
        }
        res.json(results[0]);
    });
});

// Add new doctor
app.post('/api/doctors', (req, res) => {
    const { name, specialization, email, phone, experience } = req.body;
    const query = 'INSERT INTO doctors (name, specialization, email, phone, experience) VALUES (?, ?, ?, ?, ?)';
    
    db.query(query, [name, specialization, email, phone, experience], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({ 
            message: 'Doctor added successfully', 
            id: result.insertId 
        });
    });
});

// Update doctor
app.put('/api/doctors/:id', (req, res) => {
    const { name, specialization, email, phone, experience } = req.body;
    const query = 'UPDATE doctors SET name = ?, specialization = ?, email = ?, phone = ?, experience = ? WHERE id = ?';
    
    db.query(query, [name, specialization, email, phone, experience, req.params.id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Doctor not found' });
            return;
        }
        res.json({ message: 'Doctor updated successfully' });
    });
});

// Delete doctor
app.delete('/api/doctors/:id', (req, res) => {
    const query = 'DELETE FROM doctors WHERE id = ?';
    db.query(query, [req.params.id], (err, result) => {
        if (err) {
            
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Doctor not found' });
            return;
        }
        res.json({ message: 'Doctor deleted successfully' });
    });
});

// ==================== PATIENTS ROUTES ====================

// Get all patients
app.get('/api/patients', (req, res) => {
    const query = 'SELECT * FROM patients ORDER BY name';
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// Get single patient
app.get('/api/patients/:id', (req, res) => {
    const query = 'SELECT * FROM patients WHERE id = ?';
    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ error: 'Patient not found' });
            return;
        }
        res.json(results[0]);
    });
});

// Add new patient
app.post('/api/patients', (req, res) => {
    const { name, email, phone, dob, gender, address } = req.body;
    const query = 'INSERT INTO patients (name, email, phone, dob, gender, address) VALUES (?, ?, ?, ?, ?, ?)';
    
    db.query(query, [name, email, phone, dob, gender, address], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({ 
            message: 'Patient registered successfully', 
            id: result.insertId 
        });
    });
});

// Update patient
app.put('/api/patients/:id', (req, res) => {
    const { name, email, phone, dob, gender, address } = req.body;
    const query = 'UPDATE patients SET name = ?, email = ?, phone = ?, dob = ?, gender = ?, address = ? WHERE id = ?';
    
    db.query(query, [name, email, phone, dob, gender, address, req.params.id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Patient not found' });
            return;
        }
        res.json({ message: 'Patient updated successfully' });
    });
});

// Delete patient
app.delete('/api/patients/:id', (req, res) => {
    const query = 'DELETE FROM patients WHERE id = ?';
    db.query(query, [req.params.id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Patient not found' });
            return;
        }
        res.json({ message: 'Patient deleted successfully' });
    });
});

// ==================== APPOINTMENTS ROUTES ====================

// Get all appointments with doctor names
app.get('/api/appointments', (req, res) => {
    const query = `
        SELECT a.*, d.name as doctor_name 
        FROM appointments a 
        LEFT JOIN doctors d ON a.doctor_id = d.id
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `;
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(results);
    });
});

// Get single appointment
app.get('/api/appointments/:id', (req, res) => {
    const query = `
        SELECT a.*, d.name as doctor_name 
        FROM appointments a 
        LEFT JOIN doctors d ON a.doctor_id = d.id
        WHERE a.id = ?
    `;
    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (results.length === 0) {
            res.status(404).json({ error: 'Appointment not found' });
            return;
        }
        res.json(results[0]);
    });
});

// Create new appointment
app.post('/api/appointments', (req, res) => {
    const { patient_name, doctor_id, appointment_date, appointment_time, reason } = req.body;
    const query = `
        INSERT INTO appointments (patient_name, doctor_id, appointment_date, appointment_time, reason, status) 
        VALUES (?, ?, ?, ?, ?, 'Scheduled')
    `;
    
    db.query(query, [patient_name, doctor_id, appointment_date, appointment_time, reason], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({ 
            message: 'Appointment booked successfully', 
            id: result.insertId 
        });
    });
});

// Update appointment
app.put('/api/appointments/:id', (req, res) => {
    const { patient_name, doctor_id, appointment_date, appointment_time, reason, status } = req.body;
    const query = `
        UPDATE appointments 
        SET patient_name = ?, doctor_id = ?, appointment_date = ?, 
            appointment_time = ?, reason = ?, status = ? 
        WHERE id = ?
    `;
    
    db.query(query, [patient_name, doctor_id, appointment_date, appointment_time, reason, status, req.params.id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Appointment not found' });
            return;
        }
        res.json({ message: 'Appointment updated successfully' });
    });
});

// Delete appointment
app.delete('/api/appointments/:id', (req, res) => {
    const query = 'DELETE FROM appointments WHERE id = ?';
    db.query(query, [req.params.id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Appointment not found' });
            return;
        }
        res.json({ message: 'Appointment deleted successfully' });
    });
});

// ==================== STATISTICS ROUTES ====================

// Get dashboard statistics
app.get('/api/statistics', (req, res) => {
    const queries = {
        totalDoctors: 'SELECT COUNT(*) as count FROM doctors',
        totalPatients: 'SELECT COUNT(*) as count FROM patients',
        totalAppointments: 'SELECT COUNT(*) as count FROM appointments',
        todayAppointments: 'SELECT COUNT(*) as count FROM appointments WHERE appointment_date = CURDATE()',
        totalUsers: 'SELECT COUNT(*) as count FROM users'
    };

    const stats = {};
    let completed = 0;

    Object.keys(queries).forEach(key => {
        db.query(queries[key], (err, results) => {
            if (!err) {
                stats[key] = results[0].count;
            }
            completed++;
            if (completed === Object.keys(queries).length) {
                res.json(stats);
            }
        });
    });
});

// Root route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Digital Healthcare System API',
        version: '2.0.0',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                profile: 'GET /api/auth/profile/:email',
                changePassword: 'PUT /api/auth/change-password'
            },
            doctors: '/api/doctors',
            patients: '/api/patients',
            appointments: '/api/appointments',
            statistics: '/api/statistics',
            users: '/api/users'
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Default admin credentials:');
    console.log('Email: admin@healthcare.com');
    console.log('Password: admin123');
});