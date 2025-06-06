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

let selectedPeriod = "week";

async function renderReport(period = "week") {
  const userInfo = await ipcRenderer.invoke("get-user-info");
  if (!userInfo) return;
  // Display user name/avatar
  document.getElementById("usernameDisplay").textContent = " " + userInfo.name;
  document.getElementById("userAvatar").textContent = userInfo.name
    ? userInfo.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "";

  const tasks = await ipcRenderer.invoke("get-user-tasks", userInfo.id);

  // Date range for stats
  const now = new Date();
  let start, end;
  if (period === "week") {
    start = new Date(now);
    start.setDate(now.getDate() - now.getDay()); // Sunday
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(start.getDate() + 7);
    end.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  // Filter tasks by due_date in selected period
  function isInRange(dateStr, start, end) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= start && d < end;
  }

  const tasksInPeriod = tasks.filter((t) => isInRange(t.due_date, start, end));
  const completedInPeriod = tasksInPeriod.filter((t) => t.completed);
  const overdueInPeriod = tasksInPeriod.filter(
    (t) => !t.completed && new Date(t.due_date) < now
  );
  const inProgressInPeriod = tasksInPeriod.filter(
    (t) => !t.completed && new Date(t.due_date) >= now
  );

  // PIE CHART: Task Completion
  const ctxPie = document.getElementById("completionChart").getContext("2d");
  if (window.pieChart) window.pieChart.destroy();
  window.pieChart = new Chart(ctxPie, {
    type: "doughnut",
    data: {
      labels: ["Completed", "In Progress", "Overdue"],
      datasets: [
        {
          data: [
            completedInPeriod.length,
            inProgressInPeriod.length,
            overdueInPeriod.length,
          ],
          backgroundColor: ["#4cc9f0", "#f8961e", "#f72585"],
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: true, position: "bottom" },
      },
    },
  });

  // LINE CHART: Task Status Trend
  const ctxLine = document.getElementById("trendChart").getContext("2d");
  let days = [];
  let completedData = [];
  let inProgressData = [];
  let overdueData = [];
  if (period === "week") {
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      const dayStr = day.toISOString().split("T")[0];
      days.push(
        day.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      );

      const completedCount = tasks.filter(
        (t) =>
          t.completed && t.completed_at && t.completed_at.startsWith(dayStr)
      ).length;
      const overdueCount = tasks.filter(
        (t) =>
          !t.completed &&
          t.due_date &&
          t.due_date.startsWith(dayStr) &&
          new Date(t.due_date) < now
      ).length;
      const inProgressCount = tasks.filter(
        (t) =>
          !t.completed &&
          t.due_date &&
          t.due_date.startsWith(dayStr) &&
          new Date(t.due_date) >= now
      ).length;

      completedData.push(completedCount);
      overdueData.push(overdueCount);
      inProgressData.push(inProgressCount);
    }
  } else if (period === "month") {
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const day = new Date(year, month, i);
      const dayStr = day.toISOString().split("T")[0];
      days.push(
        day.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      );

      const completedCount = tasks.filter(
        (t) =>
          t.completed && t.completed_at && t.completed_at.startsWith(dayStr)
      ).length;
      const overdueCount = tasks.filter(
        (t) =>
          !t.completed &&
          t.due_date &&
          t.due_date.startsWith(dayStr) &&
          new Date(t.due_date) < now
      ).length;
      const inProgressCount = tasks.filter(
        (t) =>
          !t.completed &&
          t.due_date &&
          t.due_date.startsWith(dayStr) &&
          new Date(t.due_date) >= now
      ).length;

      completedData.push(completedCount);
      overdueData.push(overdueCount);
      inProgressData.push(inProgressCount);
    }
  }

  if (window.lineChart) window.lineChart.destroy();
  window.lineChart = new Chart(ctxLine, {
    type: "line",
    data: {
      labels: days,
      datasets: [
        {
          label: "Completed",
          data: completedData,
          borderColor: "#4cc9f0",
          backgroundColor: "#4cc9f0",
          fill: false,
          tension: 0.3,
        },
        {
          label: "In Progress",
          data: inProgressData,
          borderColor: "#f8961e",
          backgroundColor: "#f8961e",
          fill: false,
          tension: 0.3,
        },
        {
          label: "Overdue",
          data: overdueData,
          borderColor: "#f72585",
          backgroundColor: "#f72585",
          fill: false,
          tension: 0.3,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: true, position: "bottom" },
      },
      scales: {
        y: { beginAtZero: true, precision: 0 },
      },
    },
  });

  // Update cards
  document.getElementById("totalTasksVal").textContent = tasksInPeriod.length;
  document.getElementById("completedTasksVal").textContent =
    completedInPeriod.length;
  document.getElementById("overdueTasksVal").textContent =
    overdueInPeriod.length;
  document.getElementById("inProgressTasksVal").textContent =
    inProgressInPeriod.length;
}

// Handle task assignment
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await renderReport(selectedPeriod);
  } catch (err) {
    console.error("Failed to loading data:", err);
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

document.querySelectorAll(".time-period").forEach((period) => {
  period.addEventListener("click", async function () {
    document
      .querySelectorAll(".time-period")
      .forEach((p) => p.classList.remove("active"));
    this.classList.add("active");
    selectedPeriod = this.getAttribute("data-period");
    await renderReport(selectedPeriod);
  });
});
