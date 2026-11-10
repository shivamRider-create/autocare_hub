
// AutoCare Hub - Frontend JavaScript

console.log("AutoCare Hub frontend loaded successfully!");

// Navigation links
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', () => {
        console.log("Navigation:", link.textContent);
    });
});

// Get Started buttons
document.querySelectorAll('.register-btn, .primary-btn').forEach(button => {
    button.addEventListener('click', event => {
        event.preventDefault();
        alert("Welcome to AutoCare Hub! Registration is coming soon.");
    });
});

console.log("AutoCare Hub is ready!");
