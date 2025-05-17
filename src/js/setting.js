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

let notificationTasks = [];
let overdueTaskIds = new Set();

function getTimeString(date) {
  return date.toTimeString().slice(0, 5); // "HH:MM"
}

// Filter today's tasks that are not completed and not overdue
function getTodaysUpcomingTasks(tasks) {
  const todayStr = new Date().toISOString().split("T")[0];
  const nowStr = getTimeString(new Date());
  return tasks
    .filter(
      (t) =>
        !t.completed &&
        t.due_date === todayStr &&
        t.task_time &&
        t.task_time > nowStr &&
        !overdueTaskIds.has(t.id)
    )
    .sort((a, b) => a.task_time.localeCompare(b.task_time));
}

// Mark tasks as overdue if their time has passed
function updateOverdueTasks(tasks) {
  const todayStr = new Date().toISOString().split("T")[0];
  const nowStr = getTimeString(new Date());
  tasks.forEach((t) => {
    if (
      !t.completed &&
      t.due_date === todayStr &&
      t.task_time &&
      t.task_time <= nowStr
    ) {
      overdueTaskIds.add(t.id);
    }
  });
}

// Render notification popup
function renderNotificationPopup(tasks) {
  const popup = document.getElementById("notificationPopup");
  if (!tasks.length) {
    popup.innerHTML = `<div class="notif-empty">No upcoming tasks for today.</div>`;
    return;
  }
  popup.innerHTML = tasks
    .map(
      (t) => `
      <div class="notif-task">
        <span class="notif-title">${t.task_name}</span>
        <span class="notif-time"><i class="far fa-clock"></i> ${t.task_time}</span>
        <span class="notif-time"><i class="far fa-calendar"></i> ${t.due_date}</span>
      </div>
    `
    )
    .join("");
}

// Update notification bell and popup
async function updateNotificationArea() {
  const userInfo = await ipcRenderer.invoke("get-user-info");
  if (!userInfo) return;
  const tasks = await ipcRenderer.invoke("get-user-tasks", userInfo.id);

  updateOverdueTasks(tasks);
  notificationTasks = getTodaysUpcomingTasks(tasks);

  // Update bell dot
  const dot = document.getElementById("notificationDot");
  dot.textContent = notificationTasks.length;
  dot.style.display = notificationTasks.length ? "inline-block" : "none";

  // If popup is open, update it
  const popup = document.getElementById("notificationPopup");
  if (popup.style.display === "block") {
    renderNotificationPopup(notificationTasks);
  }
}

// Show/hide popup on bell click
document.getElementById("notificationBell").addEventListener("click", (e) => {
  e.stopPropagation();
  const popup = document.getElementById("notificationPopup");
  if (popup.style.display === "block") {
    popup.style.display = "none";
  } else {
    renderNotificationPopup(notificationTasks);
    popup.style.display = "block";
  }
});

// Hide popup when clicking outside
document.addEventListener("click", (e) => {
  const popup = document.getElementById("notificationPopup");
  if (
    popup &&
    popup.style.display === "block" &&
    !popup.contains(e.target) &&
    e.target.id !== "notificationBell"
  ) {
    popup.style.display = "none";
  }
});

// Periodically update notifications
setInterval(updateNotificationArea, 60000); // every minute
updateNotificationArea(); // initial call

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
