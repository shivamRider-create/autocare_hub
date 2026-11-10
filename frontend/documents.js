
const token = sessionStorage.getItem("token");
const storedUser = sessionStorage.getItem("user");

if (!token || !storedUser) {
    window.location.href = "login.html";
}

const user = JSON.parse(storedUser);
const API = "http://localhost:5000/api";

const documentForm = document.getElementById("documentForm");
const documentList = document.getElementById("documentList");
const documentMessage = document.getElementById("documentMessage");
const vehicleSelect = document.getElementById("vehicleId");

document.getElementById("userName").textContent = user.name;
document.getElementById("userAvatar").textContent =
    user.name.charAt(0).toUpperCase();

document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    window.location.href = "login.html";
});

function showMessage(message, success = true) {
    documentMessage.textContent = message;
    documentMessage.style.color = success ? "#ff6b00" : "#ff5555";
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
                '<option value="">Add a vehicle first</option>';
        }
    } catch (error) {
        vehicleSelect.innerHTML =
            '<option value="">Unable to load vehicles</option>';
        showMessage(error.message, false);
    }
}

// UPLOAD DOCUMENT
documentForm.addEventListener("submit", async event => {
    event.preventDefault();

    const file = document.getElementById("documentFile").files[0];

    if (!file) {
        showMessage("Please select a document file.", false);
        return;
    }

    const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png"
    ];

    if (!allowedTypes.includes(file.type)) {
        showMessage("Only PDF, JPG and PNG files are allowed.", false);
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showMessage("File size must not exceed 5 MB.", false);
        return;
    }

    const formData = new FormData();

    formData.append("vehicle_id", vehicleSelect.value);
    formData.append(
        "document_type",
        document.getElementById("documentType").value
    );
    formData.append(
        "document_number",
        document.getElementById("documentNumber").value.trim()
    );
    formData.append(
        "issue_date",
        document.getElementById("issueDate").value
    );
    formData.append(
        "expiry_date",
        document.getElementById("expiryDate").value
    );

    // Must match the backend multer field name
    formData.append("documentFile", file);

    const button = document.getElementById("uploadButton");
    button.disabled = true;
    button.textContent = "Uploading...";

    try {
        const data = await apiRequest("/documents", {
            method: "POST",
            body: formData
        });

        showMessage(data.message);
        documentForm.reset();

        await loadDocuments();

    } catch (error) {
        console.error("Document upload:", error);
        showMessage(error.message, false);
    } finally {
        button.disabled = false;
        button.textContent = "Upload Document";
    }
});

// LOAD DOCUMENTS

async function loadDocuments() {
    try {
        const data = await apiRequest("/documents");

        documentList.innerHTML = "";

        if (!data.documents || data.documents.length === 0) {
            documentList.textContent = "No documents uploaded yet.";
            return;
        }

        data.documents.forEach(doc => {
            const card = document.createElement("div");
            card.className = "document-card";

            const heading = document.createElement("h3");
            heading.textContent =
                `${doc.document_type.toUpperCase()} Document`;

            card.appendChild(heading);

            const details = [
                `Vehicle: ${doc.brand} ${doc.model}`,
                `Registration: ${doc.registration_number}`,
                `Document Number: ${doc.document_number || "Not provided"}`,
                `Issue Date: ${doc.issue_date || "Not provided"}`,
                `Expiry Date: ${doc.expiry_date || "Not provided"}`
            ];

            details.forEach(detail => {
                const p = document.createElement("p");
                p.textContent = detail;
                card.appendChild(p);
            });

            const link = document.createElement("a");
            link.href = `http://localhost:5000${doc.file_url}`;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = "View Document";

            card.appendChild(link);

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete Document";

            deleteButton.addEventListener("click", () => {
                deleteDocument(doc.id);
            });

            card.appendChild(deleteButton);
            documentList.appendChild(card);
        });

    } catch (error) {
        console.error("Load documents:", error);
        documentList.textContent = error.message;
    }
}


// DELETE DOCUMENT
async function deleteDocument(id) {
    if (!confirm("Are you sure you want to delete this document?")) {
        return;
    }

    try {
        const data = await apiRequest(`/documents/${id}`, {
            method: "DELETE"
        });

        showMessage(data.message);
        await loadDocuments();

    } catch (error) {
        showMessage(error.message, false);
    }
}

// INITIALIZE
async function initialize() {
    await loadVehicles();
    await loadDocuments();
}

initialize();
