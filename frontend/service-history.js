
const token = sessionStorage.getItem("token");
const storedUser = sessionStorage.getItem("user");

if (!token || !storedUser) {
    window.location.href = "login.html";
}

const user = JSON.parse(storedUser);

const API = "http://localhost:5000/api";

const serviceForm = document.getElementById("serviceForm");
const vehicleSelect = document.getElementById("vehicleId");
const centerSelect = document.getElementById("centerId");
const historyList = document.getElementById("historyList");
const serviceMessage = document.getElementById("serviceMessage");

document.getElementById("userName").textContent = user.name;
document.getElementById("userAvatar").textContent =
    user.name.charAt(0).toUpperCase();

document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.clear();
    window.location.href = "login.html";
});

function showMessage(message, success = true) {
    serviceMessage.textContent = message;
    serviceMessage.style.color = success ? "#ff6b00" : "#ff5555";
}

async function apiRequest(url, options = {}) {
    const response = await fetch(`${API}${url}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
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

    } catch (error) {
        vehicleSelect.innerHTML =
            '<option value="">Unable to load vehicles</option>';
        showMessage(error.message, false);
    }
}

// LOAD SERVICE CENTERS
async function loadCenters() {
    try {
        const data = await apiRequest("/service-centers");

        centerSelect.innerHTML =
            '<option value="">Select Service Center</option>';

        data.centers.forEach(center => {
            const option = document.createElement("option");
            option.value = center.id;
            option.textContent =
                `${center.center_name} - ${center.city}`;

            centerSelect.appendChild(option);
        });

        if (data.centers.length === 0) {
            showMessage("No service centers available.", false);
        }

    } catch (error) {
        centerSelect.innerHTML =
            '<option value="">Unable to load centers</option>';
        showMessage(error.message, false);
    }
}

// ADD SERVICE RECORD
serviceForm.addEventListener("submit", async event => {
    event.preventDefault();

    const service = {
        vehicle_id: Number(vehicleSelect.value),
        center_id: Number(centerSelect.value),
        service_date: document.getElementById("serviceDate").value,
        odometer_reading:
            document.getElementById("odometer").value
                ? Number(document.getElementById("odometer").value)
                : null,
        work_description:
            document.getElementById("description").value.trim(),
        labor_cost: Number(document.getElementById("laborCost").value),
        total_cost: Number(document.getElementById("totalCost").value)
    };

    if (
        !service.vehicle_id ||
        !service.center_id ||
        !service.service_date ||
        !service.work_description ||
        service.labor_cost < 0 ||
        service.total_cost < 0
    ) {
        showMessage("Please enter valid service details.", false);
        return;
    }

    const button = document.getElementById("saveServiceBtn");
    button.disabled = true;
    button.textContent = "Saving...";

    try {
        const data = await apiRequest("/service-records", {
            method: "POST",
            body: JSON.stringify(service)
        });

        showMessage(data.message);
        serviceForm.reset();
        await loadHistory();

    } catch (error) {
        showMessage(error.message, false);
    } finally {
        button.disabled = false;
        button.textContent = "+ Add Service Record";
    }
});

// LOAD SERVICE HISTORY
async function loadHistory() {
    try {
        const data = await apiRequest("/service-records");

        historyList.innerHTML = "";

        if (!data.records || data.records.length === 0) {
            historyList.textContent = "No service records found yet.";
            return;
        }

        data.records.forEach(record => {
            const card = document.createElement("div");
            card.className = "history-card";

            const heading = document.createElement("h3");
            heading.textContent =
                `${record.brand} ${record.model}`;

            const center = document.createElement("p");
            center.textContent = `Service Center: ${record.center_name}`;

            const date = document.createElement("p");
            date.textContent =
                `Date: ${String(record.service_date).slice(0, 10)}`;

            const registration = document.createElement("p");
            registration.textContent =
                `Registration: ${record.registration_number}`;

            const odometer = document.createElement("p");
            odometer.textContent =
                `Odometer: ${record.odometer_reading ?? "Not provided"} KM`;

            const description = document.createElement("p");
            description.textContent =
                `Work: ${record.work_description}`;

            const labor = document.createElement("p");
            labor.textContent =
                `Labour Cost: ₹${record.labor_cost}`;

            const cost = document.createElement("p");
            cost.className = "history-cost";
            cost.textContent = `Total: ₹${record.total_cost}`;

            card.append(
                heading,
                center,
                date,
                registration,
                odometer,
                description,
                labor,
                cost
            );

            historyList.appendChild(card);
        });

    } catch (error) {
        historyList.textContent = error.message;
    }
}

// INITIALIZE
async function initializePage() {
    await Promise.all([
        loadVehicles(),
        loadCenters(),
        loadHistory()
    ]);
}

initializePage();
