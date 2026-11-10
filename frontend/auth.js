
// =====================================
// AUTOCARE HUB AUTHENTICATION
// =====================================

// DEPLOYED BACKEND API URL
const API_URL = "https://autocare-hub-api.onrender.com/api";


// =====================================
// USER REGISTRATION
// =====================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const role = document.getElementById("role").value;
        const password = document.getElementById("password").value;
        const confirmPassword =
            document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        try {

            const response = await fetch(
                `${API_URL}/auth/register`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name,
                        email,
                        phone,
                        password,
                        role
                    })
                }
            );

            const data = await response.json();

            if (response.ok) {

                alert("Account created successfully!");

                window.location.href = "login.html";

            } else {

                alert(data.message || "Registration failed!");

            }

        } catch (error) {

            console.error("Registration error:", error);

            alert("Unable to connect to the server. Please try again.");

        }

    });

}


// =====================================
// USER LOGIN
// =====================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {

            const response = await fetch(
                `${API_URL}/auth/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );

            const data = await response.json();

            if (response.ok) {

                // Save login token and user information
                sessionStorage.setItem("token", data.token);

                sessionStorage.setItem(
                    "user",
                    JSON.stringify(data.user)
                );

                alert("Login successful! Welcome " + data.user.name);

                // Redirect to dashboard
                window.location.href = "dashboard.html";

            } else {

                alert(data.message || "Login failed!");

            }

        } catch (error) {

            console.error("Login error:", error);

            alert("Unable to connect to the server. Please try again.");

        }

    });

}
