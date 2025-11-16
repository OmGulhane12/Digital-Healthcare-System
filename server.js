/************************************************************
 * DIGITAL HEALTHCARE SYSTEM - OPTIMIZED SERVER.JS
 ************************************************************/

require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/************************************************************
 * MYSQL DATABASE CONNECTION
 ************************************************************/
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "healthcare_system",
});

db.connect((err) => {
    if (err) {
        console.error("❌ MySQL Connection Failed:", err);
        process.exit(1);
    }
    console.log("✅ Connected to MySQL Database");
});

/************************************************************
 * EMAIL TRANSPORTER
 ************************************************************/
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

/************************************************************
 * TIME SLOT SYSTEM
 ************************************************************/
const SLOT_MINUTES = 30;
const START_MIN = 9 * 60;
const END_MIN = 17 * 60;

function generateSlots() {
    let arr = [];
    for (let t = START_MIN; t <= END_MIN - SLOT_MINUTES; t += SLOT_MINUTES) {
        let hh = String(Math.floor(t / 60)).padStart(2, "0");
        let mm = String(t % 60).padStart(2, "0");
        arr.push(`${hh}:${mm}`);
    }
    return arr;
}

function toMySQLTime(t) {
    if (!t) return null;
    return t.length === 5 ? `${t}:00` : t;
}

/************************************************************
 * GET OR CREATE PATIENT BY EMAIL
 ************************************************************/
function resolvePatientId({ patient_id, patient_email, patient_name }, callback) {
    if (patient_id) return callback(null, patient_id);

    if (!patient_email) return callback(new Error("patient_email required"));

    db.query(
        "SELECT id FROM patients WHERE email = ? LIMIT 1",
        [patient_email],
        (err, rows) => {
            if (err) return callback(err);

            if (rows.length) return callback(null, rows[0].id);

            // Create minimal patient record
            db.query(
                `INSERT INTO patients (name, email, phone, dob, gender, address)
                 VALUES (?, ?, '', '2000-01-01', 'Other', 'Not Provided')`,
                [patient_name || "Unknown", patient_email],
                (err2, result) => {
                    if (err2) return callback(err2);
                    callback(null, result.insertId);
                }
            );
        }
    );
}

/************************************************************
 * AUTH ROUTES
 ************************************************************/

// Register
app.post("/api/auth/register", (req, res) => {
    const { name, email, password, phone, role } = req.body;

    if (role === "admin")
        return res.status(403).json({ error: "Cannot register as admin" });

    db.query("SELECT id FROM users WHERE email = ?", [email], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (rows.length)
            return res.status(400).json({ error: "User already exists" });

        db.query(
            `INSERT INTO users (name, email, password, phone, role)
             VALUES (?, ?, ?, ?, ?)`,
            [name, email, password, phone, role],
            (err2, result) => {
                if (err2) return res.status(500).json({ error: err2.message });

                // Auto-create doctor/patient profile
                if (role === "doctor") {
                    db.query(
                        `INSERT INTO doctors (name, specialization, email, phone, experience)
                         VALUES (?, 'General Medicine', ?, ?, 0)`,
                        [name, email, phone]
                    );
                }

                if (role === "patient") {
                    db.query(
                        `INSERT INTO patients (name, email, phone, dob, gender, address)
                         VALUES (?, ?, ?, '2000-01-01', 'Other', 'Not Provided')`,
                        [name, email, phone]
                    );
                }

                res.status(201).json({ message: "Registered", id: result.insertId });
            }
        );
    });
});

// Login
app.post("/api/auth/login", (req, res) => {
    const { email, password, role } = req.body;

    db.query(
        `SELECT * FROM users
         WHERE email=? AND password=? AND role=? AND is_active=TRUE`,
        [email, password, role],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!rows.length)
                return res.status(401).json({ error: "Invalid credentials" });

            let user = rows[0];
            delete user.password;
            res.json({ message: "Login successful", user });
        }
    );
});

// Get profile
app.get("/api/auth/profile/:email", (req, res) => {
    db.query(
        `SELECT id, name, email, phone, role, created_at
         FROM users WHERE email=?`,
        [req.params.email],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!rows.length)
                return res.status(404).json({ error: "User not found" });
            res.json(rows[0]);
        }
    );
});

/************************************************************
 * DOCTORS ROUTES
 ************************************************************/
app.get("/api/doctors", (_, res) => {
    db.query("SELECT * FROM doctors ORDER BY name", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

/************************************************************
 * PATIENT ROUTES
 ************************************************************/

app.get("/api/patients/by-email/:email", (req, res) => {
    db.query(
        "SELECT * FROM patients WHERE email = ? LIMIT 1",
        [req.params.email],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows[0] || {});
        }
    );
});

/************************************************************
 * APPOINTMENTS ROUTES
 ************************************************************/

// Get all appointments
app.get("/api/appointments", (req, res) => {
    const q = `
        SELECT a.*, d.name AS doctor_name
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `;
    db.query(q, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get booked slots
app.get("/api/appointments/slots", (req, res) => {
    const { doctor_id, date } = req.query;

    if (!doctor_id || !date)
        return res.status(400).json({ error: "doctor_id and date required" });

    db.query(
        `SELECT TIME_FORMAT(appointment_time, "%H:%i") AS time
         FROM appointments WHERE doctor_id=? AND appointment_date=?`,
        [doctor_id, date],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            const taken = rows.map((r) => r.time);
            const allSlots = generateSlots();
            res.json({
                all_slots: allSlots,
                taken_slots: taken,
                available_slots: allSlots.filter((t) => !taken.includes(t)),
            });
        }
    );
});

// Create appointment
app.post("/api/appointments", (req, res) => {
    const {
        patient_name,
        patient_email,
        doctor_id,
        appointment_date,
        appointment_time,
        reason,
    } = req.body;

    if (!patient_email || !doctor_id || !appointment_date || !appointment_time)
        return res.status(400).json({ error: "Missing fields" });

    const normalized = appointment_time.substring(0, 5);
    if (!generateSlots().includes(normalized))
        return res.status(400).json({ error: "Invalid time slot" });

    resolvePatientId({ patient_email, patient_name }, (err, patientId) => {
        if (err) return res.status(500).json({ error: err.message });
    
        // Validate availability
        db.query(
            `SELECT id FROM appointments
             WHERE doctor_id=? AND appointment_date=? AND appointment_time=?`,
            [doctor_id, appointment_date, toMySQLTime(normalized)],
            (err2, rows) => {
                if (err2) return res.status(500).json({ error: err2.message });

                if (rows.length)
                    return res.status(409).json({ error: "Slot already booked" });

                // Insert
                db.query(
    `INSERT INTO appointments
     (patient_id, patient_name, patient_email, doctor_id,
      appointment_date, appointment_time, reason, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled')`,
    [
        patientId,
        patient_name,
        patient_email,
        doctor_id,
        appointment_date,
        toMySQLTime(normalized),
        reason,
    ],
    (err3, result) => {
        if (err3)
            return res.status(500).json({ error: err3.message });

        // -----------------------------
        // 📧 SEND EMAIL NOTIFICATION
        // -----------------------------
        const mailOptions = {
            from: process.env.MAIL_USER,
            to: patient_email,
            subject: "Appointment Confirmation - Digital Healthcare",
            html: `
                <h2>Appointment Confirmed</h2>
                <p>Dear <b>${patient_name}</b>,</p>
                <p>Your appointment has been successfully booked.</p>
                <p><b>Date:</b> ${appointment_date}</p>
                <p><b>Time:</b> ${normalized}</p>
                <p><b>Reason:</b> ${reason}</p>
                <p>Thank you for choosing our healthcare service.</p>
            `
        };

        transporter.sendMail(mailOptions, (emailErr, info) => {
            if (emailErr) {
                console.error("❌ Email Error:", emailErr);
                // We STILL return success because the appointment was created
                return res.status(201).json({
                    message: "Appointment created (Email failed)",
                    id: result.insertId
                });
            }

            console.log("📧 Email Sent:", info.response);
            return res.status(201).json({
                message: "Appointment created and email sent",
                id: result.insertId
            });
        });
    }
);

            }
        );
    });
});

/************************************************************
 * MEDICAL RECORDS
 ************************************************************/

// Get all records
app.get("/api/medical-records", (req, res) => {
    const q = `
        SELECT mr.*, d.name AS doctor_name, d.specialization, p.name AS patient_name
        FROM medical_records mr
        LEFT JOIN doctors d ON mr.doctor_id = d.id
        LEFT JOIN patients p ON mr.patient_id = p.id
        ORDER BY mr.visit_date DESC
    `;
    db.query(q, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get by patient ID
app.get("/api/medical-records/patient/:id", (req, res) => {
    db.query(
        `SELECT mr.*, d.name AS doctor_name, d.specialization
         FROM medical_records mr
         LEFT JOIN doctors d ON mr.doctor_id = d.id
         WHERE mr.patient_id=?
         ORDER BY mr.visit_date DESC`,
        [req.params.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Add record
app.post("/api/medical-records", (req, res) => {
    const { patient_id, doctor_id, diagnosis, prescription, notes, visit_date } =
        req.body;

    if (!patient_id || !doctor_id || !diagnosis || !visit_date)
        return res.status(400).json({ error: "Missing fields" });

    db.query(
        `INSERT INTO medical_records (patient_id, doctor_id, diagnosis, prescription, notes, visit_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [patient_id, doctor_id, diagnosis, prescription || "", notes || "", visit_date],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: "Record added", id: result.insertId });
        }
    );
});

/************************************************************
 * ROOT TESTING ENDPOINT
 ************************************************************/
app.get("/", (_, res) => {
    res.json({
        message: "Healthcare System API Running ✅",
        version: "3.0 Optimized",
    });
});
// Get all patients
app.get("/api/patients", (req, res) => {
    db.query("SELECT * FROM patients ORDER BY name", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
// Get single appointment by ID
app.get("/api/appointments/:id", (req, res) => {
    db.query(
        `SELECT a.*, d.name AS doctor_name
         FROM appointments a
         LEFT JOIN doctors d ON a.doctor_id = d.id
         WHERE a.id = ?
         LIMIT 1`,
        [req.params.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!rows.length) return res.status(404).json({ error: "Appointment not found" });
            res.json(rows[0]);
        }
    );
});
// Update appointment status only
app.put("/api/appointments/:id", (req, res) => {
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: "Status is required" });
    }

    db.query(
        `UPDATE appointments SET status = ? WHERE id = ?`,
        [status, req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Appointment not found" });
            }

            res.json({ message: "Appointment updated successfully" });
        }
    );
});

/************************************************************
 * START SERVER
 ************************************************************/
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
