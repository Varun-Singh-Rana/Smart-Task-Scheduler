const { ipcRenderer } = require("electron");
//const db = require("../js/database");

// Window controls
document.getElementById("minimize-btn").addEventListener("click", () => {
  ipcRenderer.send("window-minimize");
});

document.getElementById("maximize-btn").addEventListener("click", () => {
  ipcRenderer.send("window-maximize");
});

document.getElementById("close-btn").addEventListener("click", () => {
  ipcRenderer.send("window-close");
});

document.addEventListener("DOMContentLoaded", async () => {
  // Check for error in URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("error")) {
    showToast(`Error: ${urlParams.get("error")}`, "error");
  }

  try {
    // Check if we have existing user info
    const userInfo = await ipcRenderer.invoke("get-user-info");
    if (userInfo) {
      document.getElementById("name").value = userInfo.name || "";
      document.getElementById("startTime").value = userInfo.wake_time || "";
      document.getElementById("endTime").value = userInfo.sleep_time || "";
      if (Array.isArray(userInfo.offDays)) {
        userInfo.offDays.forEach((day) => {
          const cb = document.querySelector(
            `#offDaysCheckboxes input[value="${day}"]`
          );
          if (cb) cb.checked = true;
        });
      }
    }
  } catch (err) {
    console.error("Error loading user info:", err);
    showToast("Error loading user information", "error");
  }
});

document
  .getElementById("userInfoForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoader();

    const name = document.getElementById("name").value.trim();
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;
    // Collect checked off days
    const offDays = Array.from(
      document.querySelectorAll(
        '#offDaysCheckboxes input[name="offDays"]:checked'
      )
    ).map((cb) => cb.value);

    if (!name || !startTime || !endTime) {
      hideLoader();
      showToast("Please fill all fields", "error");
      return;
    }

    try {
      const userId = await ipcRenderer.invoke("save-user-info", {
        name,
        startTime,
        endTime,
        offDays, // <-- send offDays array to backend/database
      });
      ipcRenderer.send("navigate-to", "user_setup.html", { userId });
    } catch (err) {
      console.error("Save failed:", err);
      showToast("Failed to save information", "error");
      hideLoader();
    }
  });

function showLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "block";
}

function hideLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "none";
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
