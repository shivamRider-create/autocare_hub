
// =============================================
// AUTOCARE HUB - OWNER DASHBOARD
// =============================================

// AUTHENTICATION
const token = sessionStorage.getItem("token");
const storedUser = sessionStorage.getItem("user");

if (!token || !storedUser) {
    window.location.href = "login.html";
}

const user = JSON.parse(storedUser);

// API URL
const API_URL = "http://localhost:5000/api";

// =============================================
// DISPLAY USER
// =============================================

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
// LOAD DASHBOARD STATISTICS
// =============================================

async function loadDashboard() {

    try {

        const response = await fetch(`${API_URL}/dashboard/stats`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to load dashboard.");
        }

        // DISPLAY STATISTICS

        document.getElementById("totalVehicles").textContent =
            data.totalVehicles ?? 0;

        document.getElementById("totalServices").textContent =
            data.totalServices ?? 0;

        document.getElementById("totalExpenses").textContent =
            "₹" + Number(data.totalExpenses ?? 0).toLocaleString("en-IN");

        const records = data.recentServices || [];

        document.getElementById("recentServiceCount").textContent =
            records.length;

        // RECENT ACTIVITY

        const activity = document.getElementById("recentActivity");

        activity.innerHTML = "";

        if (records.length === 0) {

            activity.textContent = "No recent service activity available.";

            const info = document.createElement("span");
            info.textContent = "Your service records will appear here.";

            activity.appendChild(info);

            return;
        }

        records.forEach(record => {

            const item = document.createElement("div");

            item.style.padding = "15px 0";
            item.style.borderBottom = "1px solid #333";

            const heading = document.createElement("h3");

            heading.textContent =
                `${record.brand} ${record.model}`;

            const description = document.createElement("p");

            description.textContent =
                record.work_description;

            const date = document.createElement("p");

            date.textContent =
                "Date: " + String(record.service_date).slice(0, 10);

            const cost = document.createElement("p");

            cost.textContent =
                "Cost: ₹" +
                Number(record.total_cost).toLocaleString("en-IN");

            cost.style.color = "#ff6b00";
            cost.style.fontWeight = "bold";

            item.append(heading, description, date, cost);

            activity.appendChild(item);

        });

    } catch (error) {

        console.error("Dashboard Error:", error);

        document.getElementById("recentActivity").textContent =
            "Unable to load dashboard data. Please check the backend server.";

    }

}

// =============================================
// INITIALIZE DASHBOARD
// =============================================

loadDashboard();
