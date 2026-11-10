
// =============================================
// AUTOCARE HUB - APPOINTMENT MANAGEMENT
// =============================================

// AUTHENTICATION
const token = sessionStorage.getItem("token");
const storedUser = sessionStorage.getItem("user");

if (!token || !storedUser) {
    window.location.href = "login.html";
}

const user = JSON.parse(storedUser);

// API
const API = "https://autocare-hub-api.onrender.com/api";

// ELEMENTS
const vehicleSelect = document.getElementById("vehicleId");
const centerSelect = document.getElementById("centerId");
const serviceSelect = document.getElementById("serviceId");

const appointmentForm =
    document.getElementById("appointmentForm");

const appointmentList =
    document.getElementById("appointmentList");

const message =
    document.getElementById("appointmentMessage");

const bookButton =
    document.getElementById("bookButton");

// USER INFORMATION
document.getElementById("userName").textContent = user.name;

document.getElementById("userAvatar").textContent =
    user.name.charAt(0).toUpperCase();

// =============================================
// LOGOUT
// =============================================

document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    window.location.href = "login.html";
});

// =============================================
// MESSAGE
// =============================================

function showMessage(text, success = true) {
    message.textContent = text;
    message.style.color = success ? "#ff6b00" : "#ff5555";
}

// =============================================
// API REQUEST
// =============================================

async function apiRequest(path, options = {}) {

    const response = await fetch(`${API}${path}`, {
        ...options,

        headers: {
            Authorization: `Bearer ${token}`,

            ...(options.body
                ? { "Content-Type": "application/json" }
                : {}),

            ...options.headers
        }
    });

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
        throw new Error(
            `API returned a non-JSON response (${response.status}). Check the backend route: ${path}`
        );
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}

// =============================================
// LOAD VEHICLES
// =============================================

async function loadVehicles() {

    vehicleSelect.innerHTML =
        '<option value="">Loading vehicles...</option>';

    try {

        const data = await apiRequest("/vehicles");

        vehicleSelect.innerHTML =
            '<option value="">Select Vehicle</option>';

        if (!data.vehicles || data.vehicles.length === 0) {

            vehicleSelect.innerHTML =
                '<option value="">No vehicles registered</option>';

            return;
        }

        data.vehicles.forEach(vehicle => {

            const option = document.createElement("option");

            option.value = vehicle.id;

            option.dataset.type = vehicle.vehicle_type;

            option.textContent =
                `${vehicle.brand} ${vehicle.model} - ${vehicle.registration_number}`;

            vehicleSelect.appendChild(option);

        });

    } catch (error) {

        console.error("Vehicle loading error:", error);

        vehicleSelect.innerHTML =
            '<option value="">Unable to load vehicles</option>';

        showMessage(error.message, false);
    }
}

// =============================================
// LOAD SERVICE CENTERS
// =============================================

async function loadCenters() {

    centerSelect.innerHTML =
        '<option value="">Loading service centers...</option>';

    try {

        const data = await apiRequest("/service-centers");

        centerSelect.innerHTML =
            '<option value="">Select Service Center</option>';

        if (!data.centers || data.centers.length === 0) {

            centerSelect.innerHTML =
                '<option value="">No service centers available</option>';

            return;
        }

        data.centers.forEach(center => {

            const option = document.createElement("option");

            option.value = center.id;

            option.textContent =
                `${center.center_name} - ${center.city}`;

            centerSelect.appendChild(option);

        });

    } catch (error) {

        console.error("Service center loading error:", error);

        centerSelect.innerHTML =
            '<option value="">Unable to load service centers</option>';

        showMessage(error.message, false);
    }
}

// =============================================
// LOAD SERVICES
// =============================================

async function loadServices() {

    const centerId = centerSelect.value;

    const selectedVehicle =
        vehicleSelect.options[vehicleSelect.selectedIndex];

    const vehicleType = selectedVehicle?.dataset.type;

    serviceSelect.innerHTML =
        '<option value="">Loading services...</option>';

    if (!centerId || !vehicleType) {

        serviceSelect.innerHTML =
            '<option value="">Select vehicle and center first</option>';

        return;
    }

    try {

        const data = await apiRequest(
            `/services?center_id=${encodeURIComponent(centerId)}&vehicle_type=${encodeURIComponent(vehicleType)}`
        );

        serviceSelect.innerHTML =
            '<option value="">Select Service</option>';

        if (!data.services || data.services.length === 0) {

            serviceSelect.innerHTML =
                '<option value="">No services available</option>';

            return;
        }

        data.services.forEach(service => {

            const option = document.createElement("option");

            option.value = service.id;

            option.textContent =
                `${service.service_name} - ₹${service.price} (${service.duration_minutes || "N/A"} min)`;

            serviceSelect.appendChild(option);

        });

    } catch (error) {

        console.error("Services loading error:", error);

        serviceSelect.innerHTML =
            '<option value="">Unable to load services</option>';

        showMessage(error.message, false);
    }
}

// =============================================
// VEHICLE AND CENTER CHANGE EVENTS
// =============================================

vehicleSelect.addEventListener("change", loadServices);

centerSelect.addEventListener("change", loadServices);

// =============================================
// BOOK APPOINTMENT
// =============================================

appointmentForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const appointment = {

        vehicle_id: Number(vehicleSelect.value),

        center_id: Number(centerSelect.value),

        service_id: Number(serviceSelect.value),

        appointment_date:
            document.getElementById("appointmentDate").value,

        appointment_time:
            document.getElementById("appointmentTime").value,

        notes:
            document.getElementById("notes").value.trim()
    };

    if (
        !appointment.vehicle_id ||
        !appointment.center_id ||
        !appointment.service_id ||
        !appointment.appointment_date ||
        !appointment.appointment_time
    ) {

        showMessage("Please complete all required fields.", false);

        return;
    }

    const selectedDate = new Date(
        appointment.appointment_date + "T00:00:00"
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {

        showMessage("Please select today or a future date.", false);

        return;
    }

    bookButton.disabled = true;

    bookButton.textContent = "Booking...";

    try {

        const data = await apiRequest("/appointments", {

            method: "POST",

            body: JSON.stringify(appointment)

        });

        showMessage(data.message || "Appointment booked successfully!");

        appointmentForm.reset();

        serviceSelect.innerHTML =
            '<option value="">Select vehicle and center first</option>';

        await loadAppointments();

    } catch (error) {

        console.error("Appointment booking error:", error);

        showMessage(error.message, false);

    } finally {

        bookButton.disabled = false;

        bookButton.textContent = "Book Appointment";
    }
});

// =============================================
// LOAD APPOINTMENTS
// =============================================

async function loadAppointments() {

    appointmentList.textContent = "Loading appointments...";

    try {

        const data = await apiRequest("/appointments");

        appointmentList.innerHTML = "";

        if (
            !data.appointments ||
            data.appointments.length === 0
        ) {

            appointmentList.textContent =
                "No appointments booked yet.";

            return;
        }

        data.appointments.forEach(appointment => {

            const card = document.createElement("div");

            card.className = "appointment-card";

            const heading = document.createElement("h3");

            heading.textContent =
                `${appointment.brand} ${appointment.model}`;

            card.appendChild(heading);

            const details = [

                `Registration: ${appointment.registration_number}`,

                `Service: ${appointment.service_name}`,

                `Service Center: ${appointment.center_name}`,

                `Date: ${String(appointment.appointment_date).slice(0, 10)}`,

                `Time: ${appointment.appointment_time}`,

                `Price: ₹${appointment.price}`,

                `Duration: ${appointment.duration_minutes || "N/A"} minutes`

            ];

            details.forEach(detail => {

                const paragraph = document.createElement("p");

                paragraph.textContent = detail;

                card.appendChild(paragraph);

            });

            const status = document.createElement("p");

            status.className = "appointment-status";

            status.textContent =
                `Status: ${appointment.status}`;

            card.appendChild(status);

            if (appointment.notes) {

                const notes = document.createElement("p");

                notes.textContent =
                    `Notes: ${appointment.notes}`;

                card.appendChild(notes);
            }

            if (
                ["requested", "confirmed"].includes(appointment.status)
            ) {

                const cancelButton =
                    document.createElement("button");

                cancelButton.className = "cancel-appointment";

                cancelButton.textContent = "Cancel Appointment";

                cancelButton.addEventListener("click", () => {

                    cancelAppointment(appointment.id);

                });

                card.appendChild(cancelButton);
            }

            appointmentList.appendChild(card);

        });

    } catch (error) {

        console.error("Appointment loading error:", error);

        appointmentList.textContent = error.message;
    }
}

// =============================================
// CANCEL APPOINTMENT
// =============================================

async function cancelAppointment(id) {

    const confirmed = confirm(
        "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) return;

    try {

        const data = await apiRequest(
            `/appointments/${id}/cancel`,
            {
                method: "PATCH"
            }
        );

        showMessage(data.message);

        await loadAppointments();

    } catch (error) {

        console.error("Cancellation error:", error);

        showMessage(error.message, false);
    }
}

// =============================================
// INITIALIZE PAGE
// =============================================

async function initializePage() {

    await Promise.all([
        loadVehicles(),
        loadCenters(),
        loadAppointments()
    ]);

}

initializePage();
