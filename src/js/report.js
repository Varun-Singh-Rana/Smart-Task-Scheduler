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
    const tasks = await ipcRenderer.invoke("get-user-tasks", userInfo.id);

    // Calculate stats BEFORE rendering the chart
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const overdue = tasks.filter(
      (t) => !t.completed && new Date(t.due_date) < new Date()
    ).length;
    const inProgress = total - completed - overdue;

    // PIE CHART: Task Completion
    const ctxPie = document.getElementById("completionChart").getContext("2d");
    new Chart(ctxPie, {
      type: "doughnut",
      data: {
        labels: ["Completed", "In Progress", "Overdue"],
        datasets: [
          {
            data: [completed, inProgress, overdue],
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

    // LINE CHART: Task Status Trend (last 7 days)
    const ctxLine = document.getElementById("trendChart").getContext("2d");
    const days = [];
    const completedData = [];
    const inProgressData = [];
    const overdueData = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      const dayStr = day.toISOString().split("T")[0];
      days.push(
        day.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      );

      // Filter tasks for this day
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

    new Chart(ctxLine, {
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

    document.getElementById("totalTasksVal").textContent = total;
    document.getElementById("completedTasksVal").textContent = completed;
    document.getElementById("overdueTasksVal").textContent = overdue;
    document.getElementById("inProgressTasksVal").textContent = inProgress;

    // Optionally, render task lists in #myTasksList and #teamTasksList
    // ...

    // Calculate stats for this week
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

document.querySelectorAll(".time-period").forEach((period) => {
  period.addEventListener("click", function () {
    document
      .querySelectorAll(".time-period")
      .forEach((p) => p.classList.remove("active"));
    this.classList.add("active");
    // Recalculate and update stats/charts for week or month
  });
});
