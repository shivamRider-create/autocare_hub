
// =============================================
// AUTOCARE HUB - VEHICLE MANAGEMENT
// =============================================

// AUTHENTICATION
const token = sessionStorage.getItem("token");
const storedUser = sessionStorage.getItem("user");

if (!token || !storedUser) {
    window.location.href = "login.html";
}

const user = JSON.parse(storedUser);

// API URL
const API_URL = "http://localhost:5000/api/vehicles";

// HTML ELEMENTS
const vehicleForm = document.getElementById("vehicleForm");
const vehicleList = document.getElementById("vehicleList");
const vehicleMessage = document.getElementById("vehicleMessage");

// DISPLAY USER INFORMATION
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

function showMessage(message, success = true) {
    vehicleMessage.textContent = message;
    vehicleMessage.style.color = success ? "#ff6b00" : "#ff5555";
}

// =============================================
// EDIT MODAL STYLES
// =============================================

const modalStyle = document.createElement("style");

modalStyle.textContent = `
.vehicle-edit-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    padding: 20px;
}

.vehicle-edit-modal {
    background: #1c1c1c;
    border: 1px solid #ff6b00;
    border-radius: 12px;
    padding: 28px;
    width: 100%;
    max-width: 550px;
    max-height: 90vh;
    overflow-y: auto;
    color: white;
}

.vehicle-edit-modal h2 {
    margin-bottom: 20px;
}

.vehicle-edit-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.vehicle-edit-modal label {
    display: block;
    margin-bottom: 6px;
}

.vehicle-edit-modal input,
.vehicle-edit-modal select {
    width: 100%;
    padding: 11px;
    background: #111;
    color: white;
    border: 1px solid #444;
    border-radius: 5px;
    margin-bottom: 14px;
    box-sizing: border-box;
}

.vehicle-edit-actions {
    display: flex;
    gap: 12px;
    margin-top: 12px;
}

.vehicle-edit-actions button {
    flex: 1;
    padding: 12px;
    border-radius: 5px;
    border: none;
    cursor: pointer;
    font-weight: bold;
}

.vehicle-save-btn {
    background: #ff6b00;
    color: white;
}

.vehicle-cancel-btn {
    background: #333;
    color: white;
}

@media(max-width: 500px) {
    .vehicle-edit-grid {
        grid-template-columns: 1fr;
    }
}
`;

document.head.appendChild(modalStyle);

// =============================================
// LOAD VEHICLES
// =============================================

async function loadVehicles() {
    try {
        const response = await fetch(API_URL, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to load vehicles.");
        }

        vehicleList.innerHTML = "";

        if (!data.vehicles || data.vehicles.length === 0) {
            vehicleList.innerHTML = `
                <div class="activity-box">
                    <p>No vehicles added yet.</p>
                    <span>Add your first bike or car.</span>
                </div>
            `;
            return;
        }

        data.vehicles.forEach(vehicle => {
            const card = document.createElement("div");
            card.className = "vehicle-card";

            const type = document.createElement("span");
            type.className = "vehicle-type";
            type.textContent = vehicle.vehicle_type;

            const heading = document.createElement("h3");
            heading.textContent = `${vehicle.brand} ${vehicle.model}`;

            card.appendChild(type);
            card.appendChild(heading);

            const details = [
                `Registration: ${vehicle.registration_number}`,
                `Year: ${vehicle.manufacturing_year}`,
                `Fuel: ${vehicle.fuel_type}`,
                `Odometer: ${vehicle.current_odometer} KM`
            ];

            details.forEach(detail => {
                const paragraph = document.createElement("p");
                paragraph.textContent = detail;
                card.appendChild(paragraph);
            });

            const actions = document.createElement("div");
            actions.className = "vehicle-actions";

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.textContent = "Edit";

            editButton.addEventListener("click", function() {
                openEditModal(vehicle);
            });

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.textContent = "Delete";

            deleteButton.addEventListener("click", function() {
                deleteVehicle(vehicle.id);
            });

            actions.appendChild(editButton);
            actions.appendChild(deleteButton);

            card.appendChild(actions);
            vehicleList.appendChild(card);
        });

    } catch (error) {
        console.error("Loading vehicles:", error);
        showMessage(error.message, false);
    }
}

// =============================================
// ADD VEHICLE
// =============================================

vehicleForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const vehicle = {
        vehicle_type: document.getElementById("vehicleType").value,
        brand: document.getElementById("brand").value.trim(),
        model: document.getElementById("model").value.trim(),
        registration_number:
            document.getElementById("registrationNumber").value.trim(),
        manufacturing_year:
            Number(document.getElementById("manufacturingYear").value),
        fuel_type: document.getElementById("fuelType").value,
        current_odometer:
            Number(document.getElementById("odometer").value),
        purchase_date:
            document.getElementById("purchaseDate").value || null
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(vehicle)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to add vehicle.");
        }

        showMessage(data.message);
        vehicleForm.reset();

        await loadVehicles();

    } catch (error) {
        console.error("Adding vehicle:", error);
        showMessage(error.message, false);
    }
});

// =============================================
// OPEN EDIT MODAL
// =============================================

function openEditModal(vehicle) {

    // Remove an existing modal if present
    const oldModal = document.getElementById("vehicleEditOverlay");

    if (oldModal) {
        oldModal.remove();
    }

    const overlay = document.createElement("div");
    overlay.className = "vehicle-edit-overlay";
    overlay.id = "vehicleEditOverlay";

    overlay.innerHTML = `
        <div class="vehicle-edit-modal">
            <h2>Edit Vehicle Details</h2>

            <form id="editVehicleForm">

                <div class="vehicle-edit-grid">

                    <div>
                        <label>Vehicle Brand</label>
                        <input id="editBrand" required>
                    </div>

                    <div>
                        <label>Vehicle Model</label>
                        <input id="editModel" required>
                    </div>

                    <div>
                        <label>Registration Number</label>
                        <input id="editRegistration" required>
                    </div>

                    <div>
                        <label>Manufacturing Year</label>
                        <input id="editYear" type="number"
                        min="1900" max="2100" required>
                    </div>

                    <div>
                        <label>Fuel Type</label>
                        <select id="editFuel" required>
                            <option value="Petrol">Petrol</option>
                            <option value="Diesel">Diesel</option>
                            <option value="Electric">Electric</option>
                            <option value="CNG">CNG</option>
                            <option value="Hybrid">Hybrid</option>
                        </select>
                    </div>

                    <div>
                        <label>Current Odometer (KM)</label>
                        <input id="editOdometer" type="number"
                        min="0" step="0.01" required>
                    </div>

                </div>

                <div class="vehicle-edit-actions">
                    <button type="submit" class="vehicle-save-btn">
                        Save Changes
                    </button>

                    <button type="button"
                    class="vehicle-cancel-btn" id="cancelEdit">
                        Cancel
                    </button>
                </div>

            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    // Fill existing vehicle details
    document.getElementById("editBrand").value = vehicle.brand;
    document.getElementById("editModel").value = vehicle.model;
    document.getElementById("editRegistration").value =
        vehicle.registration_number;
    document.getElementById("editYear").value =
        vehicle.manufacturing_year;
    document.getElementById("editFuel").value = vehicle.fuel_type;
    document.getElementById("editOdometer").value =
        vehicle.current_odometer;

    // Cancel editing
    document.getElementById("cancelEdit").addEventListener("click", () => {
        overlay.remove();
    });

    // Close when clicking outside modal
    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            overlay.remove();
        }
    });

    // SAVE UPDATED VEHICLE
    document.getElementById("editVehicleForm").addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            const updatedVehicle = {
                vehicle_type: vehicle.vehicle_type,
                brand: document.getElementById("editBrand").value.trim(),
                model: document.getElementById("editModel").value.trim(),
                registration_number:
                    document.getElementById("editRegistration").value.trim(),
                manufacturing_year:
                    Number(document.getElementById("editYear").value),
                fuel_type: document.getElementById("editFuel").value,
                current_odometer:
                    Number(document.getElementById("editOdometer").value),
                purchase_date: vehicle.purchase_date
                    ? String(vehicle.purchase_date).slice(0, 10)
                    : null
            };

            if (
                !updatedVehicle.brand ||
                !updatedVehicle.model ||
                !updatedVehicle.registration_number ||
                !Number.isInteger(updatedVehicle.manufacturing_year) ||
                !Number.isFinite(updatedVehicle.current_odometer) ||
                updatedVehicle.current_odometer < 0
            ) {
                alert("Please enter valid vehicle details.");
                return;
            }

            const saveButton = document.querySelector(".vehicle-save-btn");
            saveButton.disabled = true;
            saveButton.textContent = "Saving...";

            try {
                const response = await fetch(
                    `${API_URL}/${vehicle.id}`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify(updatedVehicle)
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message || "Unable to update vehicle."
                    );
                }

                overlay.remove();
                showMessage(data.message || "Vehicle updated successfully!");

                await loadVehicles();

            } catch (error) {
                console.error("Editing vehicle:", error);
                showMessage(error.message, false);

                saveButton.disabled = false;
                saveButton.textContent = "Save Changes";
            }
        }
    );
}

// =============================================
// DELETE VEHICLE
// =============================================

async function deleteVehicle(vehicleId) {

    if (!confirm("Are you sure you want to delete this vehicle?")) {
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/${vehicleId}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to delete vehicle.");
        }

        showMessage(data.message || "Vehicle deleted successfully!");

        await loadVehicles();

    } catch (error) {
        console.error("Deleting vehicle:", error);
        showMessage(error.message, false);
    }
}

// =============================================
// INITIALIZE PAGE
// =============================================

loadVehicles();
