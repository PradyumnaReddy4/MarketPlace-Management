const API_URL = "http://localhost:5000";

// Signup Function
document.getElementById("signupForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const response = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();
    document.getElementById("signupMessage").textContent = data.message;

    if (response.ok) {
        setTimeout(() => { window.location.href = "login.html"; }, 2000);
    }
});

// Login Function
document.getElementById("loginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    document.getElementById("loginMessage").textContent = data.message;

    if (response.ok) {
        localStorage.setItem("token", data.token);
        setTimeout(() => { window.location.href = "dashboard.html"; }, 2000);
    }
});
