const { ipcRenderer } = require("electron");

// Handle navigation
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    const page = item.getAttribute("data-page");
    if (page) {
      ipcRenderer.send("navigate-to", page);
    }
  });
});

// Handle task assignment
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const userInfo = await ipcRenderer.invoke("get-user-info");
    if (!userInfo) return;

    // Fill form fields with user's info
    document.getElementById("userNameInput").value = userInfo.name || "";
    document.getElementById("workStartTimeInput").value =
      userInfo.start_time || "";
    document.getElementById("workEndTimeInput").value = userInfo.end_time || "";
    document.getElementById("usernameDisplay").textContent =
      " " + userInfo.name;
    document.getElementById("userAvatar").textContent = userInfo.name
      ? userInfo.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : "";

    // Fill checkboxes with user's off days
    if (userInfo.offDays && Array.isArray(userInfo.offDays)) {
      userInfo.offDays.forEach((day) => {
        const checkbox = document.querySelector(
          `#offDaysCheckboxes input[value="${day}"]`
        );
        if (checkbox) checkbox.checked = true;
      });
    }

    // On save, collect checked days
    const offDays = Array.from(
      document.querySelectorAll(
        '#offDaysCheckboxes input[name="offDays"]:checked'
      )
    ).map((cb) => cb.value);
  } catch (err) {
    console.error("Failed to loading data:", err);
  }
});

document
  .getElementById("userSettingsForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("userNameInput").value.trim();
    const startTime = document.getElementById("workStartTimeInput").value;
    const endTime = document.getElementById("workEndTimeInput").value;
    const offDays = Array.from(
      document.querySelectorAll(
        '#offDaysCheckboxes input[name="offDays"]:checked'
      )
    ).map((cb) => cb.value);

    try {
      await ipcRenderer.invoke("save-user-info", {
        name,
        startTime,
        endTime,
        offDays,
      });
      alert("Settings saved!");
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save settings.");
    }
  });

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
