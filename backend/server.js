
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

require("dotenv").config();

const db = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());


// Home route
app.get("/", (req, res) => {
    res.send("Welcome to AutoCare Hub API!");
});

// =====================================
// USER REGISTRATION API
// =====================================

app.post("/api/auth/register", async (req, res) => {

    try {
        const { name, email, phone, password, role } = req.body;

        // Check required fields
        if (!name || !email || !phone || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all required fields."
            });
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        // Validate phone
        if (!/^[0-9]{10}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid 10-digit phone number."
            });
        }

        // Validate password
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters."
            });
        }

        // Validate account role
        if (!["owner", "service_center"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid account type."
            });
        }

        // Check duplicate email
        const [existingUsers] = await db.execute(
            "SELECT id FROM users WHERE email = ?",
            [email.trim().toLowerCase()]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This email is already registered."
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Save user in MySQL
        const [result] = await db.execute(
            `INSERT INTO users
            (name, email, password, phone, role)
            VALUES (?, ?, ?, ?, ?)`,
            [
                name.trim(),
                email.trim().toLowerCase(),
                hashedPassword,
                phone,
                role
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Account created successfully!",
            userId: result.insertId
        });

    } catch (error) {
        console.error("Registration error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Registration failed. Please try again."
        });
    }

});

// =====================================
// USER LOGIN API
// =====================================



app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        // Find user in database
        const [users] = await db.execute(
            `SELECT id, name, email, password, role, is_active
             FROM users
             WHERE email = ?`,
            [email.trim().toLowerCase()]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const user = users[0];

        // Check account status
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive."
            });
        }

        // Compare password with hashed password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        // Send successful login response
        return res.status(200).json({
            success: true,
            message: "Login successful!",
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Login failed. Please try again."
        });
    }
});



// =====================================
// JWT AUTHENTICATION MIDDLEWARE
// =====================================

function authenticateToken(req, res, next) {

    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication required."
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (error, user) => {

        if (error) {
            return res.status(403).json({
                success: false,
                message: "Invalid or expired token."
            });
        }

        req.user = user;
        next();
    });
}

// =====================================
// ADD VEHICLE API
// =====================================

app.post("/api/vehicles", authenticateToken, async (req, res) => {

    try {

        const {
            vehicle_type,
            brand,
            model,
            registration_number,
            manufacturing_year,
            fuel_type,
            current_odometer,
            purchase_date
        } = req.body;

        if (
            !vehicle_type || !brand || !model ||
            !registration_number || !manufacturing_year ||
            !fuel_type || current_odometer === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required vehicle details."
            });
        }

        if (!["bike", "car"].includes(vehicle_type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid vehicle type."
            });
        }

        if (
            !Number.isInteger(Number(manufacturing_year)) ||
            Number(manufacturing_year) < 1900 ||
            Number(manufacturing_year) > new Date().getFullYear()
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid manufacturing year."
            });
        }

        if (
            !Number.isFinite(Number(current_odometer)) ||
            Number(current_odometer) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid odometer reading."
            });
        }

        const [result] = await db.execute(
            `INSERT INTO vehicles
            (
                user_id, vehicle_type, brand, model,
                registration_number, manufacturing_year,
                fuel_type, current_odometer, purchase_date
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                vehicle_type,
                brand.trim(),
                model.trim(),
                registration_number.trim().toUpperCase(),
                manufacturing_year,
                fuel_type,
                current_odometer,
                purchase_date || null
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Vehicle added successfully!",
            vehicleId: result.insertId
        });

    } catch (error) {

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "This registration number already exists."
            });
        }

        console.error("Vehicle error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to add vehicle."
        });
    }
});

// =====================================
// GET USER VEHICLES API
// =====================================

app.get("/api/vehicles", authenticateToken, async (req, res) => {

    try {

        const [vehicles] = await db.execute(
            `SELECT * FROM vehicles
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        return res.status(200).json({
            success: true,
            vehicles: vehicles
        });

    } catch (error) {

        console.error("Fetch vehicles error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch vehicles."
        });
    }
});

// =====================================
// EDIT VEHICLE API
// =====================================

app.put("/api/vehicles/:id", authenticateToken, async (req, res) => {
    try {
        const vehicleId = Number(req.params.id);

        if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid vehicle ID."
            });
        }

        const {
            vehicle_type,
            brand,
            model,
            registration_number,
            manufacturing_year,
            fuel_type,
            current_odometer,
            purchase_date
        } = req.body;

        if (
            !["bike", "car"].includes(vehicle_type) ||
            !brand?.trim() ||
            !model?.trim() ||
            !registration_number?.trim() ||
            !fuel_type ||
            !Number.isInteger(Number(manufacturing_year)) ||
            Number(manufacturing_year) < 1900 ||
            Number(manufacturing_year) > new Date().getFullYear() ||
            !Number.isFinite(Number(current_odometer)) ||
            Number(current_odometer) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide valid vehicle details."
            });
        }

        const [result] = await db.execute(
            `UPDATE vehicles
             SET vehicle_type = ?,
                 brand = ?,
                 model = ?,
                 registration_number = ?,
                 manufacturing_year = ?,
                 fuel_type = ?,
                 current_odometer = ?,
                 purchase_date = ?
             WHERE id = ? AND user_id = ?`,
            [
                vehicle_type,
                brand.trim(),
                model.trim(),
                registration_number.trim().toUpperCase(),
                Number(manufacturing_year),
                fuel_type,
                Number(current_odometer),
                purchase_date || null,
                vehicleId,
                req.user.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found."
            });
        }

        return res.json({
            success: true,
            message: "Vehicle updated successfully!"
        });

    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Registration number already exists."
            });
        }

        console.error("Update vehicle error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to update vehicle."
        });
    }
});

// =====================================
// DELETE VEHICLE API
// =====================================

app.delete("/api/vehicles/:id", authenticateToken, async (req, res) => {
    try {
        const vehicleId = Number(req.params.id);

        if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid vehicle ID."
            });
        }

        const [result] = await db.execute(
            `DELETE FROM vehicles
             WHERE id = ? AND user_id = ?`,
            [vehicleId, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found."
            });
        }

        return res.json({
            success: true,
            message: "Vehicle deleted successfully!"
        });

    } catch (error) {
        console.error("Delete vehicle error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to delete vehicle. It may have related records."
        });
    }
});

 // =============================================
 // SERVICE HISTORY APIs
 // =============================================

// GET AVAILABLE SERVICE CENTERS
app.get("/api/service-centers", authenticateToken, async (req, res) => {
    try {
        const [centers] = await db.execute(
            `SELECT id, center_name, city
             FROM service_centers
             WHERE verified = 1`
        );

        res.json({ centers });

    } catch (error) {
        console.error("Service centers error:", error);
        res.status(500).json({ message: "Unable to load service centers." });
    }
});

// ADD SERVICE RECORD
app.post("/api/service-records", authenticateToken, async (req, res) => {
    try {
        const {
            vehicle_id,
            center_id,
            service_date,
            odometer_reading,
            work_description,
            labor_cost,
            total_cost
        } = req.body;

        if (
            !vehicle_id || !center_id || !service_date ||
            !work_description || total_cost === undefined
        ) {
            return res.status(400).json({
                message: "Please fill all required fields."
            });
        }

        // Verify vehicle belongs to logged-in user
        const [vehicles] = await db.execute(
            "SELECT id FROM vehicles WHERE id = ? AND user_id = ?",
            [vehicle_id, req.user.id]
        );

        if (vehicles.length === 0) {
            return res.status(404).json({
                message: "Vehicle not found."
            });
        }

        // Verify service center exists
        const [centers] = await db.execute(
            "SELECT id FROM service_centers WHERE id = ?",
            [center_id]
        );

        if (centers.length === 0) {
            return res.status(404).json({
                message: "Service center not found."
            });
        }

        const [result] = await db.execute(
            `INSERT INTO service_records
            (vehicle_id, center_id, service_date, odometer_reading,
             work_description, labor_cost, total_cost)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                vehicle_id,
                center_id,
                service_date,
                odometer_reading || null,
                work_description.trim(),
                labor_cost || 0,
                total_cost
            ]
        );

        res.status(201).json({
            message: "Service record added successfully!",
            recordId: result.insertId
        });

    } catch (error) {
        console.error("Add service record error:", error);
        res.status(500).json({
            message: "Unable to add service record."
        });
    }
});

// GET SERVICE HISTORY FOR LOGGED-IN USER
app.get("/api/service-records", authenticateToken, async (req, res) => {
    try {
        const [records] = await db.execute(
            `SELECT
                sr.id,
                sr.vehicle_id,
                sr.center_id,
                sr.service_date,
                sr.odometer_reading,
                sr.work_description,
                sr.labor_cost,
                sr.total_cost,
                v.brand,
                v.model,
                v.registration_number,
                sc.center_name
             FROM service_records sr
             INNER JOIN vehicles v ON sr.vehicle_id = v.id
             INNER JOIN service_centers sc ON sr.center_id = sc.id
             WHERE v.user_id = ?
             ORDER BY sr.service_date DESC, sr.id DESC`,
            [req.user.id]
        );

        res.json({ records });

    } catch (error) {
        console.error("Service history error:", error);
        res.status(500).json({
            message: "Unable to load service history."
        });
    }
});

 // =============================================
 // DASHBOARD STATISTICS API
 // =============================================

app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const [vehicleResult] = await db.execute(
            "SELECT COUNT(*) AS total FROM vehicles WHERE user_id = ?",
            [userId]
        );

        const [serviceResult] = await db.execute(
            `SELECT COUNT(*) AS total
             FROM service_records sr
             INNER JOIN vehicles v ON sr.vehicle_id = v.id
             WHERE v.user_id = ?`,
            [userId]
        );

        const [expenseResult] = await db.execute(
            `SELECT COALESCE(SUM(sr.total_cost), 0) AS total
             FROM service_records sr
             INNER JOIN vehicles v ON sr.vehicle_id = v.id
             WHERE v.user_id = ?`,
            [userId]
        );

        const [recentServices] = await db.execute(
            `SELECT sr.service_date, sr.total_cost,
                    sr.work_description, v.brand, v.model
             FROM service_records sr
             INNER JOIN vehicles v ON sr.vehicle_id = v.id
             WHERE v.user_id = ?
             ORDER BY sr.service_date DESC, sr.id DESC
             LIMIT 5`,
            [userId]
        );

        res.json({
            totalVehicles: vehicleResult[0].total,
            totalServices: serviceResult[0].total,
            totalExpenses: expenseResult[0].total,
            recentServices
        });

    } catch (error) {
        console.error("Dashboard statistics error:", error);
        res.status(500).json({
            message: "Unable to load dashboard statistics."
        });
    }
});


// =============================================
// APPOINTMENT MANAGEMENT APIs
// =============================================

// GET AVAILABLE SERVICES
app.get("/api/services", authenticateToken, async (req, res) => {
    try {
        const centerId = Number(req.query.center_id);
        const vehicleType = req.query.vehicle_type;

        if (!centerId || !["bike", "car"].includes(vehicleType)) {
            return res.status(400).json({
                message: "Invalid service center or vehicle type."
            });
        }

        const [services] = await db.execute(
            `SELECT id, service_name, description, price,
                    duration_minutes, vehicle_type
             FROM services
             WHERE center_id = ?
             AND is_available = 1
             AND vehicle_type IN (?, 'both')`,
            [centerId, vehicleType]
        );

        res.json({ services });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Unable to load services." });
    }
});

// BOOK APPOINTMENT
app.post("/api/appointments", authenticateToken, async (req, res) => {
    try {
        const {
            vehicle_id,
            center_id,
            service_id,
            appointment_date,
            appointment_time,
            notes
        } = req.body;

        if (
            !vehicle_id || !center_id || !service_id ||
            !appointment_date || !appointment_time
        ) {
            return res.status(400).json({
                message: "Please complete all required fields."
            });
        }

        const [vehicles] = await db.execute(
            "SELECT id, vehicle_type FROM vehicles WHERE id = ? AND user_id = ?",
            [vehicle_id, req.user.id]
        );

        if (vehicles.length === 0) {
            return res.status(404).json({
                message: "Vehicle not found."
            });
        }

        const [services] = await db.execute(
            `SELECT id FROM services
             WHERE id = ? AND center_id = ?
             AND is_available = 1
             AND vehicle_type IN (?, 'both')`,
            [service_id, center_id, vehicles[0].vehicle_type]
        );

        if (services.length === 0) {
            return res.status(400).json({
                message: "Invalid service selected."
            });
        }

        const [centers] = await db.execute(
            "SELECT id FROM service_centers WHERE id = ? AND verified = 1",
            [center_id]
        );

        if (centers.length === 0) {
            return res.status(404).json({
                message: "Service center not found."
            });
        }

        const [result] = await db.execute(
            `INSERT INTO appointments
            (user_id, vehicle_id, center_id, service_id,
             appointment_date, appointment_time, status, notes)
             VALUES (?, ?, ?, ?, ?, ?, 'requested', ?)`,
            [
                req.user.id,
                vehicle_id,
                center_id,
                service_id,
                appointment_date,
                appointment_time,
                notes || null
            ]
        );

        res.status(201).json({
            message: "Appointment booked successfully!",
            appointmentId: result.insertId
        });

    } catch (error) {
        console.error("Appointment booking error:", error);
        res.status(500).json({
            message: "Unable to book appointment."
        });
    }
});

// GET MY APPOINTMENTS
app.get("/api/appointments", authenticateToken, async (req, res) => {
    try {
        const [appointments] = await db.execute(
            `SELECT a.*, v.brand, v.model,
                    v.registration_number,
                    sc.center_name,
                    s.service_name, s.price,
                    s.duration_minutes
             FROM appointments a
             INNER JOIN vehicles v ON a.vehicle_id = v.id
             INNER JOIN service_centers sc ON a.center_id = sc.id
             INNER JOIN services s ON a.service_id = s.id
             WHERE a.user_id = ?
             ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
            [req.user.id]
        );

        res.json({ appointments });

    } catch (error) {
        console.error("Load appointments error:", error);
        res.status(500).json({
            message: "Unable to load appointments."
        });
    }
});

// CANCEL APPOINTMENT
app.patch("/api/appointments/:id/cancel", authenticateToken, async (req, res) => {
    try {
        const [result] = await db.execute(
            `UPDATE appointments
             SET status = 'cancelled'
             WHERE id = ? AND user_id = ?
             AND status IN ('requested', 'confirmed')`,
            [req.params.id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Appointment not found or cannot be cancelled."
            });
        }

        res.json({
            message: "Appointment cancelled successfully!"
        });

    } catch (error) {
        console.error("Cancel appointment error:", error);
        res.status(500).json({
            message: "Unable to cancel appointment."
        });
    }
});


// =============================================
// FUEL TRACKER APIs
// =============================================

// ADD FUEL RECORD
app.post("/api/fuel", authenticateToken, async (req, res) => {
    try {
        const {
            vehicle_id,
            fuel_date,
            odometer_reading,
            fuel_quantity,
            price_per_litre,
            is_full_tank
        } = req.body;

        if (
            !vehicle_id || !fuel_date ||
            odometer_reading === undefined ||
            fuel_quantity === undefined ||
            price_per_litre === undefined
        ) {
            return res.status(400).json({
                message: "Please complete all required fields."
            });
        }

        const odometer = Number(odometer_reading);
        const quantity = Number(fuel_quantity);
        const price = Number(price_per_litre);

        if (
            !Number.isFinite(odometer) || odometer < 0 ||
            !Number.isFinite(quantity) || quantity <= 0 ||
            !Number.isFinite(price) || price <= 0
        ) {
            return res.status(400).json({
                message: "Enter valid fuel and odometer values."
            });
        }

        const [vehicles] = await db.execute(
            "SELECT id FROM vehicles WHERE id = ? AND user_id = ?",
            [vehicle_id, req.user.id]
        );

        if (vehicles.length === 0) {
            return res.status(404).json({
                message: "Vehicle not found."
            });
        }

        const totalAmount = Number((quantity * price).toFixed(2));

        const [result] = await db.execute(
            `INSERT INTO fuel_records
             (vehicle_id, fuel_date, odometer_reading,
              fuel_quantity, price_per_litre, total_amount, is_full_tank)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                vehicle_id,
                fuel_date,
                odometer,
                quantity,
                price,
                totalAmount,
                is_full_tank ? 1 : 0
            ]
        );

        res.status(201).json({
            message: "Fuel record added successfully!",
            fuelId: result.insertId,
            totalAmount
        });

    } catch (error) {
        console.error("Add fuel record:", error);
        res.status(500).json({
            message: "Unable to add fuel record."
        });
    }
});

// GET FUEL RECORDS
app.get("/api/fuel", authenticateToken, async (req, res) => {
    try {
        const [records] = await db.execute(
            `SELECT fr.*, v.brand, v.model, v.registration_number
             FROM fuel_records fr
             INNER JOIN vehicles v ON fr.vehicle_id = v.id
             WHERE v.user_id = ?
             ORDER BY fr.fuel_date DESC, fr.id DESC`,
            [req.user.id]
        );

        const [summary] = await db.execute(
            `SELECT
                COUNT(*) AS total_refills,
                COALESCE(SUM(fr.total_amount), 0) AS total_spent,
                COALESCE(SUM(fr.fuel_quantity), 0) AS total_litres
             FROM fuel_records fr
             INNER JOIN vehicles v ON fr.vehicle_id = v.id
             WHERE v.user_id = ?`,
            [req.user.id]
        );

        res.json({
            records,
            summary: summary[0]
        });

    } catch (error) {
        console.error("Load fuel records:", error);
        res.status(500).json({
            message: "Unable to load fuel records."
        });
    }
});

// DELETE FUEL RECORD
app.delete("/api/fuel/:id", authenticateToken, async (req, res) => {
    try {
        const [result] = await db.execute(
            `DELETE fr FROM fuel_records fr
             INNER JOIN vehicles v ON fr.vehicle_id = v.id
             WHERE fr.id = ? AND v.user_id = ?`,
            [req.params.id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Fuel record not found."
            });
        }

        res.json({
            message: "Fuel record deleted successfully!"
        });

    } catch (error) {
        console.error("Delete fuel record:", error);
        res.status(500).json({
            message: "Unable to delete fuel record."
        });
    }
});

// =============================================
// EXPENSE MANAGEMENT APIs
// =============================================

// ADD EXPENSE
app.post("/api/expenses", authenticateToken, async (req, res) => {
    try {
        const {
            vehicle_id,
            category,
            description,
            amount,
            expense_date
        } = req.body;

        const allowedCategories = [
            "fuel", "service", "repair",
            "insurance", "accessories", "other"
        ];

        if (
            !vehicle_id ||
            !allowedCategories.includes(category) ||
            !expense_date ||
            !Number.isFinite(Number(amount)) ||
            Number(amount) <= 0
        ) {
            return res.status(400).json({
                message: "Please enter valid expense details."
            });
        }

        const [vehicles] = await db.execute(
            "SELECT id FROM vehicles WHERE id = ? AND user_id = ?",
            [vehicle_id, req.user.id]
        );

        if (vehicles.length === 0) {
            return res.status(404).json({
                message: "Vehicle not found."
            });
        }

        const [result] = await db.execute(
            `INSERT INTO expenses
             (vehicle_id, category, description, amount, expense_date)
             VALUES (?, ?, ?, ?, ?)`,
            [
                vehicle_id,
                category,
                description || null,
                Number(amount),
                expense_date
            ]
        );

        res.status(201).json({
            message: "Expense added successfully!",
            expenseId: result.insertId
        });

    } catch (error) {
        console.error("Add expense:", error);
        res.status(500).json({
            message: "Unable to add expense."
        });
    }
});

// GET EXPENSES
app.get("/api/expenses", authenticateToken, async (req, res) => {
    try {
        const [expenses] = await db.execute(
            `SELECT e.*, v.brand, v.model, v.registration_number
             FROM expenses e
             INNER JOIN vehicles v ON e.vehicle_id = v.id
             WHERE v.user_id = ?
             ORDER BY e.expense_date DESC, e.id DESC`,
            [req.user.id]
        );

        const [summary] = await db.execute(
            `SELECT
                COUNT(*) AS total_records,
                COALESCE(SUM(e.amount), 0) AS total_amount
             FROM expenses e
             INNER JOIN vehicles v ON e.vehicle_id = v.id
             WHERE v.user_id = ?`,
            [req.user.id]
        );

        res.json({
            expenses,
            summary: summary[0]
        });

    } catch (error) {
        console.error("Load expenses:", error);
        res.status(500).json({
            message: "Unable to load expenses."
        });
    }
});

// DELETE EXPENSE
app.delete("/api/expenses/:id", authenticateToken, async (req, res) => {
    try {
        const [result] = await db.execute(
            `DELETE e FROM expenses e
             INNER JOIN vehicles v ON e.vehicle_id = v.id
             WHERE e.id = ? AND v.user_id = ?`,
            [req.params.id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Expense not found."
            });
        }

        res.json({
            message: "Expense deleted successfully!"
        });

    } catch (error) {
        console.error("Delete expense:", error);
        res.status(500).json({
            message: "Unable to delete expense."
        });
    }
});

// =============================================
// REMINDER MANAGEMENT APIs
// =============================================

// ADD REMINDER
app.post("/api/reminders", authenticateToken, async (req, res) => {
    try {
        const {
            vehicle_id,
            title,
            description,
            due_date,
            due_odometer,
            reminder_type
        } = req.body;

        if (!vehicle_id || !title || !title.trim()) {
            return res.status(400).json({
                message: "Vehicle and reminder title are required."
            });
        }

        const [vehicles] = await db.execute(
            "SELECT id FROM vehicles WHERE id = ? AND user_id = ?",
            [vehicle_id, req.user.id]
        );

        if (!vehicles.length) {
            return res.status(404).json({
                message: "Vehicle not found."
            });
        }

        const [result] = await db.execute(
            `INSERT INTO reminders
             (vehicle_id, title, description, due_date,
              due_odometer, reminder_type, status)
             VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [
                vehicle_id,
                title.trim(),
                description || null,
                due_date || null,
                due_odometer || null,
                reminder_type || "general"
            ]
        );

        res.status(201).json({
            message: "Reminder added successfully!",
            reminderId: result.insertId
        });

    } catch (error) {
        console.error("Add reminder:", error);
        res.status(500).json({
            message: "Unable to add reminder."
        });
    }
});

// GET REMINDERS
app.get("/api/reminders", authenticateToken, async (req, res) => {
    try {
        const [reminders] = await db.execute(
            `SELECT r.*, v.brand, v.model, v.registration_number
             FROM reminders r
             INNER JOIN vehicles v ON r.vehicle_id = v.id
             WHERE v.user_id = ?
             ORDER BY
                CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END,
                r.due_date ASC,
                r.id DESC`,
            [req.user.id]
        );

        res.json({ reminders });

    } catch (error) {
        console.error("Load reminders:", error);
        res.status(500).json({
            message: "Unable to load reminders."
        });
    }
});

// UPDATE REMINDER STATUS
app.patch(
    "/api/reminders/:id/status",
    authenticateToken,
    async (req, res) => {
        try {
            const { status } = req.body;

            if (!["completed", "dismissed"].includes(status)) {
                return res.status(400).json({
                    message: "Invalid reminder status."
                });
            }

            const [result] = await db.execute(
                `UPDATE reminders r
                 INNER JOIN vehicles v ON r.vehicle_id = v.id
                 SET r.status = ?
                 WHERE r.id = ? AND v.user_id = ?
                 AND r.status = 'pending'`,
                [status, req.params.id, req.user.id]
            );

            if (!result.affectedRows) {
                return res.status(404).json({
                    message: "Pending reminder not found."
                });
            }

            res.json({
                message: `Reminder marked as ${status}.`
            });

        } catch (error) {
            console.error("Update reminder:", error);
            res.status(500).json({
                message: "Unable to update reminder."
            });
        }
    }
);

// DELETE REMINDER
app.delete("/api/reminders/:id", authenticateToken, async (req, res) => {
    try {
        const [result] = await db.execute(
            `DELETE r FROM reminders r
             INNER JOIN vehicles v ON r.vehicle_id = v.id
             WHERE r.id = ? AND v.user_id = ?`,
            [req.params.id, req.user.id]
        );
        if (!result.affectedRows) {
            return res.status(404).json({
                message: "Reminder not found."
            });
        }
        res.json({
            message: "Reminder deleted successfully!"
        });
    } catch (error) {
        console.error("Delete reminder:", error);
        res.status(500).json({
            message: "Unable to delete reminder."
        });
    }
});

// =============================================
// DOCUMENT MANAGEMENT APIs
// =============================================

const documentFolder = path.join(
    __dirname,
    "uploads",
    "documents"
);

fs.mkdirSync(documentFolder, { recursive: true });

app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

const documentStorage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, documentFolder);
    },
    filename: (req, file, callback) => {
        const safeName = file.originalname.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
        );

        callback(null, `${Date.now()}-${safeName}`);
    }
});

const documentUpload = multer({
    storage: documentStorage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, callback) => {
        const allowedTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png"
        ];

        if (allowedTypes.includes(file.mimetype)) {
            callback(null, true);
        } else {
            callback(
                new Error("Only PDF, JPG and PNG files are allowed.")
            );
        }
    }
});

// UPLOAD DOCUMENT
app.post(
    "/api/documents",
    authenticateToken,
    (req, res, next) => {
        documentUpload.single("documentFile")(
            req,
            res,
            error => {
                if (error) {
                    return res.status(400).json({
                        message: error.message
                    });
                }
                next();
            }
        );
    },
    async (req, res) => {
        try {
            const {
                vehicle_id,
                document_type,
                document_number,
                issue_date,
                expiry_date
            } = req.body;

            const allowedTypes = [
                "RC",
                "insurance",
                "PUC",
                "invoice",
                "other"
            ];

            if (
                !vehicle_id ||
                !allowedTypes.includes(document_type) ||
                !req.file
            ) {
                if (req.file) fs.unlinkSync(req.file.path);

                return res.status(400).json({
                    message: "Select a vehicle, document type and file."
                });
            }

            const [vehicles] = await db.execute(
                "SELECT id FROM vehicles WHERE id = ? AND user_id = ?",
                [vehicle_id, req.user.id]
            );

            if (!vehicles.length) {
                fs.unlinkSync(req.file.path);

                return res.status(404).json({
                    message: "Vehicle not found."
                });
            }

            const fileUrl =
                `/uploads/documents/${req.file.filename}`;

            const [result] = await db.execute(
                `INSERT INTO documents
                (vehicle_id, document_type, document_number,
                 file_url, issue_date, expiry_date)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    vehicle_id,
                    document_type,
                    document_number || null,
                    fileUrl,
                    issue_date || null,
                    expiry_date || null
                ]
            );

            res.status(201).json({
                message: "Document uploaded successfully!",
                documentId: result.insertId
            });

        } catch (error) {
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            console.error("Document upload error:", error);

            res.status(500).json({
                message: "Unable to upload document."
            });
        }
    }
);

// GET DOCUMENTS
app.get("/api/documents", authenticateToken, async (req, res) => {
    try {
        const [documents] = await db.execute(
            `SELECT d.*, v.brand, v.model, v.registration_number
             FROM documents d
             INNER JOIN vehicles v ON d.vehicle_id = v.id
             WHERE v.user_id = ?
             ORDER BY d.created_at DESC`,
            [req.user.id]
        );

        res.json({ documents });

    } catch (error) {
        console.error("Load documents error:", error);

        res.status(500).json({
            message: "Unable to load documents."
        });
    }
});

// DELETE DOCUMENT
app.delete(
    "/api/documents/:id",
    authenticateToken,
    async (req, res) => {
        try {
            const [documents] = await db.execute(
                `SELECT d.file_url
                 FROM documents d
                 INNER JOIN vehicles v ON d.vehicle_id = v.id
                 WHERE d.id = ? AND v.user_id = ?`,
                [req.params.id, req.user.id]
            );

            if (!documents.length) {
                return res.status(404).json({
                    message: "Document not found."
                });
            }

            await db.execute(
                "DELETE FROM documents WHERE id = ?",
                [req.params.id]
            );

            const filename = path.basename(
                documents[0].file_url
            );

            const filePath = path.join(
                documentFolder,
                filename
            );

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            res.json({
                message: "Document deleted successfully!"
            });

        } catch (error) {
            console.error("Delete document error:", error);

            res.status(500).json({
                message: "Unable to delete document."
            });
        }
    }
);

// =====================================
// START SERVER
// =====================================
async function startServer() {
    try {
        const connection = await db.getConnection();
        console.log("MySQL Database Connected Successfully!");
        connection.release();
        app.listen(PORT, () => {
            console.log(
                `AutoCare Hub running on http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error("Database Connection Failed:", error.message);
    }
}
startServer();