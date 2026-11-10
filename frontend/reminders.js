
const token = sessionStorage.getItem("token");
const storedUser = sessionStorage.getItem("user");

if (!token || !storedUser) {
    window.location.href = "login.html";
}

const user = JSON.parse(storedUser);
const API = "http://localhost:5000/api";

const vehicleSelect = document.getElementById("vehicleId");
const reminderForm = document.getElementById("reminderForm");
const reminderList = document.getElementById("reminderList");
const reminderMessage = document.getElementById("reminderMessage");
const saveButton = document.getElementById("saveReminderBtn");

document.getElementById("userName").textContent = user.name;
document.getElementById("userAvatar").textContent =
    user.name.charAt(0).toUpperCase();

document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    window.location.href = "login.html";
});

function showMessage(text, success = true) {
    reminderMessage.textContent = text;
    reminderMessage.style.color = success ? "#ff6b00" : "#ff5555";
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        }
    });

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
        throw new Error(`Invalid server response: ${response.status}`);
    }

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

        if (!data.vehicles.length) {
            vehicleSelect.innerHTML =
                '<option value="">No vehicles registered</option>';
        }

    } catch (error) {
        vehicleSelect.innerHTML =
            '<option value="">Unable to load vehicles</option>';
        showMessage(error.message, false);
    }
}

// ADD REMINDER
reminderForm.addEventListener("submit", async event => {
    event.preventDefault();

    const reminder = {
        vehicle_id: Number(vehicleSelect.value),
        title: document.getElementById("title").value.trim(),
        reminder_type: document.getElementById("reminderType").value,
        due_date: document.getElementById("dueDate").value || null,
        due_odometer:
            document.getElementById("dueOdometer").value
                ? Number(document.getElementById("dueOdometer").value)
                : null,
        description:
            document.getElementById("description").value.trim()
    };

    if (!reminder.vehicle_id || !reminder.title) {
        showMessage("Select a vehicle and enter a reminder title.", false);
        return;
    }

    if (
        reminder.due_odometer !== null &&
        (!Number.isFinite(reminder.due_odometer) ||
         reminder.due_odometer < 0)
    ) {
        showMessage("Enter a valid odometer reading.", false);
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        const data = await apiRequest("/reminders", {
            method: "POST",
            body: JSON.stringify(reminder)
        });

        showMessage(data.message);
        reminderForm.reset();

        await loadReminders();

    } catch (error) {
        console.error("Add reminder:", error);
        showMessage(error.message, false);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Add Reminder";
    }
});

// LOAD REMINDERS
async function loadReminders() {
    try {
        const data = await apiRequest("/reminders");

        reminderList.innerHTML = "";

        if (!data.reminders || data.reminders.length === 0) {
            reminderList.textContent = "No reminders added yet.";
            return;
        }

        data.reminders.forEach(reminder => {
            const card = document.createElement("div");
            card.className = "reminder-card";

            const heading = document.createElement("h3");
            heading.textContent = reminder.title;
            card.appendChild(heading);

            const details = [
                `Vehicle: ${reminder.brand} ${reminder.model}`,
                `Registration: ${reminder.registration_number}`,
                `Type: ${reminder.reminder_type || "General"}`,
                `Due Date: ${reminder.due_date
                    ? String(reminder.due_date).slice(0, 10)
                    : "Not specified"}`,
                `Due Odometer: ${reminder.due_odometer ?? "Not specified"} KM`
            ];

            details.forEach(detail => {
                const paragraph = document.createElement("p");
                paragraph.textContent = detail;
                card.appendChild(paragraph);
            });

            if (reminder.description) {
                const description = document.createElement("p");
                description.textContent =
                    `Description: ${reminder.description}`;
                card.appendChild(description);
            }

            const status = document.createElement("p");
            status.className = "reminder-status";
            status.textContent = `Status: ${reminder.status}`;
            card.appendChild(status);

            if (reminder.status === "pending") {
                const actions = document.createElement("div");
                actions.className = "reminder-actions";

                const completeButton = document.createElement("button");
                completeButton.textContent = "Mark Completed";

                completeButton.addEventListener("click", () => {
                    updateReminderStatus(reminder.id, "completed");
                });

                const dismissButton = document.createElement("button");
                dismissButton.className = "dismiss-btn";
                dismissButton.textContent = "Dismiss";

                dismissButton.addEventListener("click", () => {
                    updateReminderStatus(reminder.id, "dismissed");
                });

                actions.append(completeButton, dismissButton);
                card.appendChild(actions);
            }

            const deleteButton = document.createElement("button");
            deleteButton.className = "delete-btn";
            deleteButton.textContent = "Delete Reminder";

            deleteButton.addEventListener("click", () => {
                deleteReminder(reminder.id);
            });

            if (reminder.status !== "pending") {
                const actions = document.createElement("div");
                actions.className = "reminder-actions";
                actions.appendChild(deleteButton);
                card.appendChild(actions);
            } else {
                const actions = card.querySelector(".reminder-actions");
                actions.appendChild(deleteButton);
            }

            reminderList.appendChild(card);
        });

    } catch (error) {
        console.error("Load reminders:", error);
        reminderList.textContent = error.message;
    }
}

// UPDATE STATUS
async function updateReminderStatus(id, status) {
    try {
        const data = await apiRequest(`/reminders/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });

        showMessage(data.message);
        await loadReminders();

    } catch (error) {
        showMessage(error.message, false);
    }
}

// DELETE REMINDER
async function deleteReminder(id) {
    if (!confirm("Are you sure you want to delete this reminder?")) {
        return;
    }

    try {
        const data = await apiRequest(`/reminders/${id}`, {
            method: "DELETE"
        });

        showMessage(data.message);
        await loadReminders();

    } catch (error) {
        showMessage(error.message, false);
    }
}

// INITIALIZE
async function initialize() {
    await loadVehicles();
    await loadReminders();
}

initialize();
