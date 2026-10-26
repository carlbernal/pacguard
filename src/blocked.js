document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const domain = params.get("domain") || "restricted domain";
  const url = params.get("url") || window.location.href;

  document.getElementById("blocked-domain").textContent = domain;
  document.getElementById("blocked-url").textContent = url;
  document.getElementById("blocked-time").textContent = new Date().toLocaleString();

  document.getElementById("back-btn").addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "https://www.google.com";
    }
  });
});
