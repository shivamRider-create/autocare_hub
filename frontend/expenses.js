
const token = sessionStorage.getItem("token");
const storedUser = sessionStorage.getItem("user");

if (!token || !storedUser) {
    window.location.href = "login.html";
}

const user = JSON.parse(storedUser);
const API = "http://localhost:5000/api";

const vehicleSelect = document.getElementById("vehicleId");
const expenseForm = document.getElementById("expenseForm");
const expenseList = document.getElementById("expenseList");
const expenseMessage = document.getElementById("expenseMessage");
const saveButton = document.getElementById("saveExpenseBtn");

document.getElementById("userName").textContent = user.name;
document.getElementById("userAvatar").textContent =
    user.name.charAt(0).toUpperCase();

document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    window.location.href = "login.html";
});

function showMessage(text, success = true) {
    expenseMessage.textContent = text;
    expenseMessage.style.color = success ? "#ff6b00" : "#ff5555";
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

// ADD EXPENSE
expenseForm.addEventListener("submit", async event => {
    event.preventDefault();

    const expense = {
        vehicle_id: Number(vehicleSelect.value),
        category: document.getElementById("category").value,
        amount: Number(document.getElementById("amount").value),
        expense_date: document.getElementById("expenseDate").value,
        description: document.getElementById("description").value.trim()
    };

    if (
        !expense.vehicle_id ||
        !expense.category ||
        !expense.expense_date ||
        !Number.isFinite(expense.amount) ||
        expense.amount <= 0
    ) {
        showMessage("Please enter valid expense details.", false);
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        const data = await apiRequest("/expenses", {
            method: "POST",
            body: JSON.stringify(expense)
        });

        showMessage(data.message);

        expenseForm.reset();

        await loadExpenses();

    } catch (error) {
        console.error("Add expense:", error);
        showMessage(error.message, false);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Add Expense";
    }
});

// LOAD EXPENSES
async function loadExpenses() {
    try {
        const data = await apiRequest("/expenses");

        document.getElementById("totalExpenses").textContent =
            "₹" + Number(data.summary.total_amount).toLocaleString("en-IN");

        document.getElementById("totalRecords").textContent =
            `${data.summary.total_records} records`;

        expenseList.innerHTML = "";

        if (!data.expenses.length) {
            expenseList.textContent = "No expenses recorded yet.";
            return;
        }

        data.expenses.forEach(expense => {
            const card = document.createElement("div");
            card.className = "expense-card";

            const heading = document.createElement("h3");
            heading.textContent =
                `${expense.brand} ${expense.model}`;

            const details = [
                `Registration: ${expense.registration_number}`,
                `Category: ${expense.category}`,
                `Date: ${String(expense.expense_date).slice(0, 10)}`,
                `Amount: ₹${Number(expense.amount).toFixed(2)}`
            ];

            card.appendChild(heading);

            details.forEach(detail => {
                const paragraph = document.createElement("p");
                paragraph.textContent = detail;
                card.appendChild(paragraph);
            });

            if (expense.description) {
                const description = document.createElement("p");
                description.textContent =
                    `Description: ${expense.description}`;
                card.appendChild(description);
            }

            const deleteButton = document.createElement("button");
            deleteButton.className = "delete-expense";
            deleteButton.textContent = "Delete Expense";

            deleteButton.addEventListener("click", () => {
                deleteExpense(expense.id);
            });

            card.appendChild(deleteButton);
            expenseList.appendChild(card);
        });

    } catch (error) {
        console.error("Load expenses:", error);
        expenseList.textContent = error.message;
    }
}

// DELETE EXPENSE
async function deleteExpense(id) {
    if (!confirm("Are you sure you want to delete this expense?")) {
        return;
    }

    try {
        const data = await apiRequest(`/expenses/${id}`, {
            method: "DELETE"
        });

        showMessage(data.message);
        await loadExpenses();

    } catch (error) {
        showMessage(error.message, false);
    }
}

// INITIALIZE
async function initialize() {
    await loadVehicles();
    await loadExpenses();
}

initialize();
