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

    //// --- Add this block to filter today's repeating tasks ---
    //const today = new Date();
    //const dayName = today.toLocaleDateString("en-US", { weekday: "long" });

    //// This will include tasks that repeat on today (e.g., every Monday)
    //const repeatingTodayTasks = tasks.filter(
    //  (task) => Array.isArray(task.days) && task.days.includes(dayName)
    //);

    //
    function getPriorityClass(priority) {
      if (!priority) return "";
      if (priority.toLowerCase() === "high") return "priority-high";
      if (priority.toLowerCase() === "medium") return "priority-medium";
      if (priority.toLowerCase() === "low") return "priority-low";
      return "";
    }

    function getAssigneeName(task) {
      // Use task.assignee or task.user_name or fallback to userInfo.name
      return task.assignee || task.user_name || "You";
    }

    function getDueText(task) {
      // You can improve this to show "Due tomorrow", "Due in 3 days", etc.
      if (!task.due_date) return "";
      const due = new Date(task.due_date);
      const now = new Date();
      const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
      if (diff === 0) return "Due today";
      if (diff === 1) return "Due tomorrow";
      if (diff > 1) return `Due in ${diff} days`;
      if (diff < 0) return `Overdue`;
      return "";
    }

    // Group and sort tasks for "Task List"
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dueToday = tasks.filter(
      (t) =>
        !t.completed &&
        t.due_date &&
        new Date(t.due_date).setHours(0, 0, 0, 0) === today.getTime()
    );
    const dueTomorrow = tasks.filter(
      (t) =>
        !t.completed &&
        t.due_date &&
        new Date(t.due_date).setHours(0, 0, 0, 0) === tomorrow.getTime()
    );

    // Render grouped tasks
    let taskListHTML = "";
    if (dueToday.length) {
      taskListHTML += `<div class="task-group-label">Today's Task</div>`;
      taskListHTML += dueToday.map((t) => renderTaskItem(t, false)).join("");
    }

    //if (repeatingTodayTasks.length) {
    //  taskListHTML += `<div class="task-group-label">Today's Repeating Tasks</div>`;
    //  taskListHTML += repeatingTodayTasks
    //    .map((t) => renderTaskItem(t, false))
    //    .join("");
    //}

    if (dueTomorrow.length) {
      taskListHTML += `<div class="task-group-label">Tomorrow's Task</div>`;
      taskListHTML += dueTomorrow.map((t) => renderTaskItem(t, false)).join("");
    }

    const myTasksList = document.getElementById("myTasks");
    myTasksList.innerHTML = taskListHTML;

    // Sort "Done Task" by most recent
    const doneTasksSorted = tasks
      .filter((t) => t.completed)
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
    const doneTasksList = document.getElementById("doneTasks");
    doneTasksList.innerHTML = doneTasksSorted
      .map((t) => renderTaskItem(t, true))
      .join("");

    //

    // Add a modal for confirmation
    const confirmModal = document.createElement("div");
    confirmModal.className = "modal-overlay";
    confirmModal.innerHTML = `
  <div class="modal">
    <div class="modal-header">
      <h3 class="modal-title">Complete Task</h3>
      <button class="close-btn" id="closeConfirmModal">&times;</button>
    </div>
    <div class="modal-body">
      <p>Did you complete this task?</p>
      <button id="confirmCompleteBtn" class="submit-btn">Yes</button>
      <button id="cancelCompleteBtn" class="submit-btn">No</button>
    </div>
  </div>
`;
    document.body.appendChild(confirmModal);

    function showConfirmModal(onConfirm) {
      confirmModal.classList.add("active");
      document.getElementById("confirmCompleteBtn").onclick = () => {
        confirmModal.classList.remove("active");
        onConfirm();
      };
      document.getElementById("cancelCompleteBtn").onclick = () => {
        confirmModal.classList.remove("active");
      };
      document.getElementById("closeConfirmModal").onclick = () => {
        confirmModal.classList.remove("active");
      };
    }

    // render Task Item
    function renderTaskItem(task, isDoneList = false) {
      return `
    <li class="task-item">
      <input type="checkbox" class="task-checkbox" data-task-id="${task.id}" 
        ${task.completed ? "checked" : ""} ${isDoneList ? "disabled" : ""}/>
      <div class="task-details">
        <div class="task-title">${task.task_name}</div>
        <div class="task-meta">
          <div>
            <i class="far fa-clock"></i>
            ${task.task_time ? task.task_time : ""}
          </div>
          <div>
            <i class="far fa-calendar"></i>
            ${
              isDoneList
                ? `Done on ${
                    task.completed_at
                      ? new Date(task.completed_at).toLocaleDateString()
                      : ""
                  }`
                : getDueText(task)
            }
          </div>
        </div>
      </div>
      <div class="task-priority ${getPriorityClass(task.priority)}">${
        task.priority || ""
      }</div>
    </li>
  `;
    }

    // submit task form
    document
      .getElementById("taskForm")
      .addEventListener("submit", async function (e) {
        e.preventDefault();

        // Collect form data
        const title = this.querySelector(
          'input[placeholder="Enter task title"]'
        ).value.trim();
        const startTime = this.querySelector("#startTime").value;
        const endTime = this.querySelector("#endTime").value;
        const dueDate = this.querySelector("#taskDueDateInput").value;
        const priority = this.querySelector(".form-select").value;

        // Validate required fields
        if (!title) {
          alert("Please enter a task title.");
          return;
        }

        // Check for off day before adding (see next section)
        const isOffDay = await ipcRenderer.invoke(
          "check-user-off-day",
          dueDate
        );
        if (isOffDay) {
          if (
            !confirm(
              "The selected date is an off day. Are you sure you want to assign this task?"
            )
          ) {
            return;
          }
        }

        // Send to backend
        await ipcRenderer.invoke("add-task", {
          task_name: title,
          task_time: `${startTime}-${endTime}`,
          due_date: dueDate,
          priority: priority,
        });

        // Close modal and refresh
        document.getElementById("taskModal").classList.remove("active");
        location.reload();
      });

    // Attach event listeners to checkboxes in myTasks
    myTasksList.querySelectorAll(".task-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("click", function (e) {
        e.preventDefault(); // Prevent immediate checking
        const taskId = this.getAttribute("data-task-id");
        showConfirmModal(async () => {
          await ipcRenderer.invoke("mark-task-completed", Number(taskId));
          location.reload();
        });
      });
    });

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

// Quick Task modal
const quickTaskModal = document.createElement("div");
quickTaskModal.className = "modal-overlay";
quickTaskModal.innerHTML = `
  <div class="modal">
    <div class="modal-header">
      <h3 class="modal-title">Quick Task</h3>
      <button class="close-btn" id="closeQuickTaskModal">&times;</button>
    </div>
    <form id="quickTaskForm">
      <div class="form-group">
        <label>Task Name</label>
        <input type="text" id="quickTaskName" class="form-control" required />
      </div>
      <div class="form-group">
        <label>Start Time (optional)</label>
        <input type="time" id="quickStartTime" class="form-control" />
      </div>
      <div class="form-group">
        <label>End Time (optional)</label>
        <input type="time" id="quickEndTime" class="form-control" />
      </div>
      <div class="form-group">
        <label>Date (optional)</label>
        <input type="date" id="quickTaskDate" class="form-control" />
      </div>
      <button type="submit" class="submit-btn">Find Slot</button>
    </form>
    <div id="quickTaskOptions"></div>
  </div>
`;
document.body.appendChild(quickTaskModal);

// 2. Show modal on Quick Task button click
document.querySelector(".quick-add").addEventListener("click", () => {
  quickTaskModal.classList.add("active");
  document.getElementById("quickTaskForm").reset();
  document.getElementById("quickTaskOptions").innerHTML = "";
});

// 3. Hide modal
document.getElementById("closeQuickTaskModal").onclick = () => {
  quickTaskModal.classList.remove("active");
};

// 4. Handle Quick Task form submit
// ...existing code...

// ...existing code...

// 4. Handle Quick Task form submit
document
  .getElementById("quickTaskForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const name = document.getElementById("quickTaskName").value.trim();
    const startTime = document.getElementById("quickStartTime").value;
    const endTime = document.getElementById("quickEndTime").value;
    const date = document.getElementById("quickTaskDate").value;

    if (!name) {
      alert("Please enter a task name.");
      return;
    }

    const userInfo = await ipcRenderer.invoke("get-user-info");
    const tasks = await ipcRenderer.invoke("get-user-tasks", userInfo.id);
    const optionsDiv = document.getElementById("quickTaskOptions");
    let options = [];

    // If only time is provided (no date)
    if (startTime && endTime && !date) {
      let count = 0;
      let dayOffset = 0;
      while (count < 3 && dayOffset < 14) {
        let d = new Date();
        d.setDate(d.getDate() + dayOffset);
        const dateStr = d.toISOString().split("T")[0];
        const dayName = d.toLocaleDateString("en-US", { weekday: "long" });

        // Skip off days
        if (userInfo.offDays && userInfo.offDays.includes(dayName)) {
          dayOffset++;
          continue;
        }

        // Check overlap for this day
        const dayTasks = tasks.filter((t) => t.due_date === dateStr);
        const overlap = dayTasks.some((t) => {
          if (!t.task_time) return false;
          const [tStart, tEnd] = t.task_time.split("-");
          return !(endTime <= tStart || startTime >= tEnd);
        });

        if (!overlap) {
          options.push({ date: dateStr, startTime, endTime });
          count++;
        }
        dayOffset++;
      }
    }
    // If only date is provided (no time)
    else if (date && !startTime && !endTime) {
      // Check if it's an off day
      const d = new Date(date);
      const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
      if (userInfo.offDays && userInfo.offDays.includes(dayName)) {
        optionsDiv.innerHTML = `<div>${dayName} is your off day.</div>`;
      } else {
        const workStart = userInfo.start_time || "09:00";
        const workEnd = userInfo.end_time || "17:00";
        const dayTasks = tasks.filter((t) => t.due_date === date);
        let s = workStart;
        let count = 0;
        while (s < workEnd && count < 3) {
          let [h, m] = s.split(":").map(Number);
          let eH = h + 1;
          let e = `${String(eH).padStart(2, "0")}:${String(m).padStart(
            2,
            "0"
          )}`;
          if (e > workEnd) break;

          // Check overlap
          const overlap = dayTasks.some((t) => {
            if (!t.task_time) return false;
            const [tStart, tEnd] = t.task_time.split("-");
            return !(e <= tStart || s >= tEnd);
          });

          if (!overlap) {
            options.push({ date, startTime: s, endTime: e });
            count++;
          }

          // Next slot (30 min step)
          m += 30;
          if (m >= 60) {
            h += 1;
            m -= 60;
          }
          s = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          if (s >= workEnd) break;
        }
      }
    }
    // ...existing logic for other cases (both date & time, neither)...

    // Show options to user
    if (!options.length) {
      optionsDiv.innerHTML = "<div>No free slots found.</div>";
      return;
    }
    optionsDiv.innerHTML = options
      .map(
        (opt, idx) => `
    <button class="quick-slot-btn" data-idx="${idx}">
      ${opt.date} ${opt.startTime}-${opt.endTime}
    </button>
  `
      )
      .join("");

    // Handle slot selection
    optionsDiv.querySelectorAll(".quick-slot-btn").forEach((btn) => {
      btn.onclick = async () => {
        const idx = btn.getAttribute("data-idx");
        const opt = options[idx];
        await ipcRenderer.invoke("add-task", {
          user_id: userInfo.id,
          task_name: name,
          task_time: `${opt.startTime}-${opt.endTime}`,
          due_date: opt.date,
          priority: "Medium",
          completed: false,
        });
        quickTaskModal.classList.remove("active");
        window.location.reload();
      };
    });
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

// Detect Missing Time/Date on Form Submit
taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = taskForm
    .querySelector('input[placeholder="Enter task title"]')
    .value.trim();
  let startTime = taskForm.querySelector("#startTime").value;
  let endTime = taskForm.querySelector("#endTime").value;
  let dueDate = taskForm.querySelector("#taskDueDateInput").value;
  const priority = taskForm.querySelector(".form-select").value;

  // Only require title
  if (!title) {
    alert("Please enter a task title.");
    return;
  }

  // Suggest slot if time or date missing
  if (!startTime || !endTime || !dueDate) {
    const userInfo = await ipcRenderer.invoke("get-user-info");
    const tasks = await ipcRenderer.invoke("get-user-tasks", userInfo.id);
    const suggestion = suggestFreeSlot(userInfo, tasks);

    if (suggestion) {
      if (
        confirm(
          `Suggested time: ${suggestion.dueDate} ${suggestion.startTime}-${suggestion.endTime}. Use this?`
        )
      ) {
        startTime = suggestion.startTime;
        endTime = suggestion.endTime;
        dueDate = suggestion.dueDate;
      } else {
        return; // User declined suggestion
      }
    } else {
      alert("No free slot found in your work hours.");
      return;
    }
  }

  // Off day confirmation
  const isOffDay = await ipcRenderer.invoke("check-user-off-day", dueDate);
  if (isOffDay) {
    const confirmOffDay = confirm(
      "The selected date is an off day. Are you sure you want to assign this task?"
    );
    if (!confirmOffDay) return;
  }

  // Add the task
  const userInfo = await ipcRenderer.invoke("get-user-info");
  await ipcRenderer.invoke("add-task", {
    user_id: userInfo.id,
    task_name: title,
    task_time: `${startTime}-${endTime}`,
    due_date: dueDate,
    priority: priority,
    completed: false,
  });

  // Close modal and refresh
  taskModal.classList.remove("active");
  taskForm.reset();
  window.location.reload();
});

// Suggest a free slot for the task
function suggestFreeSlot(userInfo, tasks) {
  // Use only values from database
  const workStart = userInfo.startTime; // e.g. "09:00"
  const workEnd = userInfo.endTime; // e.g. "17:00"
  const offDays = userInfo.offDays || [];

  if (!workStart || !workEnd) return null; // Can't suggest if work hours missing

  // Try next 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    const dateStr = date.toISOString().split("T")[0];

    // Skip off days
    if (offDays.includes(dateStr)) continue;

    // Get tasks for this day
    const dayTasks = tasks.filter((t) => t.due_date === dateStr);

    // Find free slot (1 hour) in work hours
    let slotStart = workStart;
    while (slotStart < workEnd) {
      // Calculate slot end
      const [h, m] = slotStart.split(":").map(Number);
      let slotEndH = h,
        slotEndM = m + 60;
      if (slotEndM >= 60) {
        slotEndH += 1;
        slotEndM -= 60;
      }
      let slotEnd = `${String(slotEndH).padStart(2, "0")}:${String(
        slotEndM
      ).padStart(2, "0")}`;
      if (slotEnd > workEnd) break;

      // Check for overlap
      const overlap = dayTasks.some((t) => {
        if (!t.task_time) return false;
        const [tStart, tEnd] = t.task_time.split("-");
        return !(slotEnd <= tStart || slotStart >= tEnd);
      });

      if (!overlap) {
        return { dueDate: dateStr, startTime: slotStart, endTime: slotEnd };
      }

      // Move to next slot (30 min step)
      let nextH = h,
        nextM = m + 30;
      if (nextM >= 60) {
        nextH += 1;
        nextM -= 60;
      }
      slotStart = `${String(nextH).padStart(2, "0")}:${String(nextM).padStart(
        2,
        "0"
      )}`;
      if (slotStart >= workEnd) break;
    }
  }
  return null; // No slot found
}

// Initialize the task list
document.addEventListener("DOMContentLoaded", () => {
  const addTaskBtn = document.getElementById("addTaskBtn");
  const taskModal = document.getElementById("taskModal");
  const closeModal = document.getElementById("closeModal");
  const taskForm = document.getElementById("taskForm");

  // Show modal
  addTaskBtn.addEventListener("click", () => {
    taskModal.classList.add("active");
  });

  // Hide modal
  closeModal.addEventListener("click", () => {
    taskModal.classList.remove("active");
    taskForm.reset();
  });

  // Hide modal when clicking outside modal content
  taskModal.addEventListener("click", (e) => {
    if (e.target === taskModal) {
      taskModal.classList.remove("active");
      taskForm.reset();
    }
  });

  // Handle form submission
  taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get form values
    const title = taskForm
      .querySelector('input[placeholder="Enter task title"]')
      .value.trim();
    const startTime = taskForm.querySelector("#startTime").value;
    const endTime = taskForm.querySelector("#endTime").value;
    const dueDate = taskForm.querySelector("#taskDueDateInput").value;
    const priority = taskForm.querySelector(".form-select").value;

    if (!title || !startTime || !endTime || !dueDate) {
      alert("Please fill all required fields.");
      return;
    }

    // Check for off day
    const isOffDay = await window
      .require("electron")
      .ipcRenderer.invoke("check-user-off-day", dueDate);
    if (isOffDay) {
      const confirmAdd = confirm(
        "The selected date is an off day. Are you sure you want to assign this task?"
      );
      if (!confirmAdd) return;
    }

    // Add the task (adjust the IPC call as per your backend)
    const userInfo = await window
      .require("electron")
      .ipcRenderer.invoke("get-user-info");
    await window.require("electron").ipcRenderer.invoke("add-task", {
      user_id: userInfo.id,
      task_name: title,
      task_time: `${startTime}-${endTime}`,
      due_date: dueDate,
      priority: priority,
      completed: false,
    });

    // Close modal and refresh UI
    taskModal.classList.remove("active");
    taskForm.reset();
    window.location.reload();
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
