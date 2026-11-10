
const token = sessionStorage.getItem("token");
const storedUser = sessionStorage.getItem("user");

if (!token || !storedUser) {
    window.location.href = "login.html";
}

const user = JSON.parse(storedUser);
const API = "http://localhost:5000/api";

const fuelForm = document.getElementById("fuelForm");
const fuelList = document.getElementById("fuelList");
const vehicleSelect = document.getElementById("vehicleId");
const fuelMessage = document.getElementById("fuelMessage");

document.getElementById("userName").textContent = user.name;
document.getElementById("userAvatar").textContent =
    user.name.charAt(0).toUpperCase();

document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    window.location.href = "login.html";
});

function showMessage(message, success = true) {
    fuelMessage.textContent = message;
    fuelMessage.style.color = success ? "#ff6b00" : "#ff5555";
}

async function apiRequest(url, options = {}) {
    const response = await fetch(`${API}${url}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}

function formatDate(value) {
    if (!value) return "Not available";
    return String(value).slice(0, 10);
}

// LOAD VEHICLES
async function loadVehicles() {
    try {
        const data = await apiRequest("/vehicles");

        vehicleSelect.innerHTML =
            '<option value="">Select Vehicle</option>';

        data.vehicles.forEach(vehicle => {
            const option = document.createElement("option");
            option.value = vehicle.id;
            option.textContent =
                `${vehicle.brand} ${vehicle.model} - ${vehicle.registration_number}`;
            vehicleSelect.appendChild(option);
        });

        if (!data.vehicles.length) {
            vehicleSelect.innerHTML =
                '<option value="">Please add a vehicle first</option>';
        }
    } catch (error) {
        vehicleSelect.innerHTML =
            '<option value="">Unable to load vehicles</option>';
        showMessage(error.message, false);
    }
}

// ADD FUEL RECORD
fuelForm.addEventListener("submit", async event => {
    event.preventDefault();

    const fuelRecord = {
        vehicle_id: vehicleSelect.value,
        fuel_date: document.getElementById("fuelDate").value,
        odometer_reading: Number(
            document.getElementById("odometer").value
        ),
        fuel_quantity: Number(
            document.getElementById("fuelQuantity").value
        ),
        price_per_litre: Number(
            document.getElementById("pricePerLitre").value
        ),
        is_full_tank: document.getElementById("isFullTank").checked
    };

    if (!fuelRecord.vehicle_id) {
        showMessage("Please select a vehicle.", false);
        return;
    }

    const submitButton = document.getElementById("fuelSubmit");
    submitButton.disabled = true;
    submitButton.textContent = "Saving...";

    try {
        const data = await apiRequest("/fuel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fuelRecord)
        });

        showMessage(
            `${data.message} Total: ₹${Number(data.totalAmount).toFixed(2)}`
        );

        fuelForm.reset();
        setToday();
        await loadFuelRecords();

    } catch (error) {
        console.error("Add fuel:", error);
        showMessage(error.message, false);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Add Fuel Record";
    }
});

// LOAD FUEL RECORDS AND SUMMARY
async function loadFuelRecords() {
    try {
        const data = await apiRequest("/fuel");

        const summary = data.summary || {};

        document.getElementById("totalRefills").textContent =
            summary.total_refills || 0;

        document.getElementById("totalSpent").textContent =
            `₹${Number(summary.total_spent || 0).toFixed(2)}`;

        document.getElementById("totalLitres").textContent =
            `${Number(summary.total_litres || 0).toFixed(2)} L`;

        fuelList.innerHTML = "";

        if (!data.records || data.records.length === 0) {
            fuelList.textContent = "No fuel records available yet.";
            return;
        }

        data.records.forEach(record => {
            const card = document.createElement("div");
            card.className = "fuel-card";

            const heading = document.createElement("h3");
            heading.textContent = `${record.brand} ${record.model}`;
            card.appendChild(heading);

            const details = [
                `Registration: ${record.registration_number}`,
                `Date: ${formatDate(record.fuel_date)}`,
                `Odometer: ${record.odometer_reading} KM`,
                `Fuel Quantity: ${record.fuel_quantity} L`,
                `Price per Litre: ₹${Number(record.price_per_litre).toFixed(2)}`,
                `Total Amount: ₹${Number(record.total_amount).toFixed(2)}`,
                `Full Tank: ${record.is_full_tank ? "Yes" : "No"}`
            ];

            details.forEach(detail => {
                const p = document.createElement("p");
                p.textContent = detail;
                card.appendChild(p);
            });

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete Record";
            deleteButton.addEventListener("click", () => {
                deleteFuelRecord(record.id);
            });

            card.appendChild(deleteButton);
            fuelList.appendChild(card);
        });

    } catch (error) {
        console.error("Load fuel records:", error);
        fuelList.textContent = error.message;
    }
}

// DELETE FUEL RECORD
async function deleteFuelRecord(id) {
    if (!confirm("Are you sure you want to delete this fuel record?")) {
        return;
    }

    try {
        const data = await apiRequest(`/fuel/${id}`, {
            method: "DELETE"
        });

        showMessage(data.message);
        await loadFuelRecords();

    } catch (error) {
        showMessage(error.message, false);
    }
}

function setToday() {
    const today = new Date();
    const localDate = new Date(
        today.getTime() - today.getTimezoneOffset() * 60000
    ).toISOString().slice(0, 10);

    document.getElementById("fuelDate").value = localDate;
}

// INITIALIZE
async function initialize() {
    setToday();
    await loadVehicles();
    await loadFuelRecords();
}

initialize();
