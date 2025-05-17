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

// calendar functionality
let selectedDate = new Date();
let tasks = []; // Load from DB

function renderCalendar() {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  document.getElementById("calendarMonthYear").textContent =
    selectedDate.toLocaleString("default", { month: "long", year: "numeric" });

  // Day of week headers
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  daysOfWeek.forEach((d) => {
    const header = document.createElement("div");
    header.textContent = d;
    header.style.fontWeight = "bold";
    header.style.textAlign = "center";
    grid.appendChild(header);
  });

  // Empty cells before 1st day
  let dayOfWeek = firstDay.getDay();
  for (let i = 0; i < dayOfWeek; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-day inactive";
    grid.appendChild(empty);
  }

  // Render days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const dayDate = new Date(year, month, i);
    const dayStr = dayDate.toISOString().split("T")[0];
    const dayTasks = tasks.filter((t) => t.due_date === dayStr);

    let dotClass = "";
    if (dayTasks.some((t) => t.completed)) dotClass = "calendar-dot-green";
    else if (dayTasks.length) dotClass = "calendar-dot-blue";
    else if (dayDate < new Date(new Date().toDateString()))
      dotClass = "calendar-dot-gray";

    const dayDiv = document.createElement("div");
    dayDiv.className =
      "calendar-day" + (dayStr === getSelectedDayStr() ? " selected" : "");

    dayDiv.innerHTML = `
      <span>${i}</span>
      ${dotClass ? `<span class="calendar-dot ${dotClass}"></span>` : ""}
    `;
    dayDiv.onclick = () => selectDay(dayDate);
    grid.appendChild(dayDiv);
  }
}

// Handle task assignment
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const userInfo = await ipcRenderer.invoke("get-user-info");
    if (!userInfo) return;

    // Display user name/avatar
    document.getElementById("usernameDisplay").textContent =
      " " + userInfo.name;
    document.getElementById("userAvatar").textContent = userInfo.name
      ? userInfo.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : "";

    // Fetch tasks
    tasks = await ipcRenderer.invoke("get-user-tasks", userInfo.id);
    renderCalendar();
    renderDayTasks();

    //
    // Calculate stats
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const overdue = tasks.filter(
      (t) => !t.completed && new Date(t.due_date) < new Date()
    ).length;
    const inProgress = total - completed - overdue;

    document.getElementById("totalTasksVal").textContent = total;
    document.getElementById("completedTasksVal").textContent = completed;
    document.getElementById("overdueTasksVal").textContent = overdue;
    document.getElementById("inProgressTasksVal").textContent = inProgress;

    // Optionally, render task lists in #myTasksList and #teamTasksList
    // ...

    // Calculate stats for this week
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay()); // Sunday

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    const endOfLastWeek = new Date(startOfThisWeek);

    // Filter tasks by created_at or completed_at
    function isInRange(dateStr, start, end) {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= start && d < end;
    }

    // This week
    const tasksThisWeek = tasks.filter((t) =>
      isInRange(t.created_at, startOfThisWeek, now)
    );
    const completedThisWeek = tasks.filter(
      (t) => t.completed && isInRange(t.completed_at, startOfThisWeek, now)
    );
    const overdueThisWeek = tasks.filter(
      (t) =>
        !t.completed &&
        new Date(t.due_date) < now &&
        isInRange(t.created_at, startOfThisWeek, now)
    );
    const inProgressThisWeek =
      tasksThisWeek.length - completedThisWeek.length - overdueThisWeek.length;

    // Last week
    const tasksAtEndOfLastWeek = tasks.filter(
      (t) => new Date(t.created_at) <= endOfLastWeek
    ).length;
    const completedAtEndOfLastWeek = tasks.filter(
      (t) => t.completed && new Date(t.completed_at) <= endOfLastWeek
    ).length;
    const overdueAtEndOfLastWeek = tasks.filter(
      (t) =>
        !t.completed &&
        new Date(t.due_date) < endOfLastWeek &&
        new Date(t.created_at) <= endOfLastWeek
    ).length;
    const inProgressAtEndOfLastWeek =
      tasksAtEndOfLastWeek - completedAtEndOfLastWeek - overdueAtEndOfLastWeek;

    const diffTotal = total - tasksAtEndOfLastWeek;
    const diffCompleted = completed - completedAtEndOfLastWeek;
    const diffOverdue = overdue - overdueAtEndOfLastWeek;
    const diffInProgress = inProgress - inProgressAtEndOfLastWeek;

    document.getElementById("totalTasksChange").textContent =
      (diffTotal >= 0 ? "+" : "") + diffTotal + " from last week";
    document.getElementById("completedTasksChange").textContent =
      (diffCompleted >= 0 ? "+" : "") + diffCompleted + " from last week";
    document.getElementById("inProgressTasksChange").textContent =
      (diffInProgress >= 0 ? "+" : "") + diffInProgress + " from last week";
    document.getElementById("overdueTasksChange").textContent =
      (diffOverdue >= 0 ? "+" : "") + diffOverdue + " from last week";
  } catch (err) {
    console.error("Failed to loading data:", err);
  }
});

function getSelectedDayStr() {
  return selectedDate.toISOString().split("T")[0];
}

function selectDay(date) {
  selectedDate = date;
  renderCalendar();
  renderDayTasks();
}

function renderDayTasks() {
  const dayStr = getSelectedDayStr();
  const dayTasks = tasks.filter((t) => t.due_date === dayStr);
  document.getElementById("selectedDayLabel").textContent = new Date(
    dayStr
  ).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  if (dayTasks.length === 0) {
    document.getElementById(
      "dayTaskList"
    ).innerHTML = `<div class="no-tasks">No tasks for this day.</div>`;
    return;
  }

  document.getElementById("dayTaskList").innerHTML = dayTasks
    .map(
      (t) => `
      <div class="day-task-card">
        <div class="day-task-title">
          ${t.task_name}
          ${
            t.priority
              ? `<span class="task-priority priority-${t.priority.toLowerCase()}">${
                  t.priority
                }</span>`
              : ""
          }
        </div>
        <div class="day-task-meta">
          ${
            t.task_time
              ? `<span><i class="far fa-clock"></i> ${t.task_time}</span>`
              : ""
          }
          <span><i class="far fa-calendar"></i> Due ${
            t.due_date === dayStr ? "today" : t.due_date
          }</span>
        </div>
      </div>
    `
    )
    .join("");
}

// Navigation
document.getElementById("prevMonthBtn").onclick = () => {
  selectedDate.setMonth(selectedDate.getMonth() - 1);
  renderCalendar();
};
document.getElementById("nextMonthBtn").onclick = () => {
  selectedDate.setMonth(selectedDate.getMonth() + 1);
  renderCalendar();
};

// Notification system
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
//

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
