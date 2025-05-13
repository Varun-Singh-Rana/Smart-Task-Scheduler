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
      document.getElementById("wakeTime").value = userInfo.wake_time || "";
      document.getElementById("sleepTime").value = userInfo.sleep_time || "";
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
    const wakeTime = document.getElementById("wakeTime").value;
    const sleepTime = document.getElementById("sleepTime").value;

    if (!name || !wakeTime || !sleepTime) {
      hideLoader();
      showToast("Please fill all fields", "error");
      return;
    }

    try {
      const userId = await ipcRenderer.invoke("save-user-info", {
        name,
        wakeTime,
        sleepTime,
      });
      // Let main process handle navigation
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
