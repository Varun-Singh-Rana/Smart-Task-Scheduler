const { ipcRenderer } = require("electron");
const db = require("./database");

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
  try {
    const userInfo = await db.getUserInfo();
    if (userInfo) {
      document.getElementById("name").value = userInfo.name;
      document.getElementById("wakeTime").value = userInfo.wake_time;
      document.getElementById("sleepTime").value = userInfo.sleep_time;
    }
  } catch (err) {
    console.error("Error loading user info:", err);
  }
});

document
  .getElementById("userInfoForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const wakeTime = document.getElementById("wakeTime").value;
    const sleepTime = document.getElementById("sleepTime").value;

    if (!name || !wakeTime || !sleepTime) {
      alert("Please fill all fields");
      return;
    }

    try {
      console.log("Before save"); // Debug log
      const userId = await saveUserInfo(name, wakeTime, sleepTime);
      console.log("After save, userId:", userId); // Debug log

      // Force navigation - don't rely on default behavior
      window.location.href = `../html/user_setup.html?userId=${userId}`;
    } catch (err) {
      console.error("Save failed:", err); // Debug log
      alert("Failed to save. Check console for details.");
    }
  });

function showLoader() {
  document.getElementById("loader").style.display = "block";
}

function hideLoader() {
  document.getElementById("loader").style.display = "none";
}

document.getElementById("userInfoForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const wakeTime = document.getElementById("wakeTime").value;
  const sleepTime = document.getElementById("sleepTime").value;

  db.saveUserInfo(name, wakeTime, sleepTime, (err, userId) => {
    if (err) {
      showToast("Error saving user information!" + err.message);
    } else {
      showToast("User information saved successfully!");
      // Redirect to task setup page
      window.location.href = "../html/user_setup.html";
    }
  });
});

// If coming back to this page, load existing info
window.addEventListener("DOMContentLoaded", () => {
  db.getUserInfo((err, userInfo) => {
    if (err) {
      console.error("Error loading user info:", err);
    } else if (userInfo) {
      document.getElementById("name").value = userInfo.name;
      document.getElementById("wakeTime").value = userInfo.wake_time;
      document.getElementById("sleepTime").value = userInfo.sleep_time;
    }
  });
});

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
