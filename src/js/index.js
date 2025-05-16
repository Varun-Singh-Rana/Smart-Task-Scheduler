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

    // DOMContentLoaded
    function renderTaskItem(task, isDoneList = false) {
      return `
    <div class="task-item">
      <input type="checkbox" class="task-checkbox" data-task-id="${task.id}" 
        ${task.completed ? "checked" : ""} ${isDoneList ? "disabled" : ""}/>
      <div class="task-details">
        <div class="task-title">${task.task_name}</div>
        <div class="task-meta">
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
          <div><i class="far fa-user"></i> ${getAssigneeName(task)}</div>
        </div>
      </div>
      <div class="task-priority ${getPriorityClass(task.priority)}">${
        task.priority || ""
      }</div>
    </div>
  `;
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
    const dueOther = tasks
      .filter(
        (t) =>
          !t.completed &&
          t.due_date &&
          new Date(t.due_date).setHours(0, 0, 0, 0) > tomorrow.getTime()
      )
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    // Render grouped tasks
    let taskListHTML = "";
    if (dueToday.length) {
      taskListHTML += `<div class="task-group-label">Due Today</div>`;
      taskListHTML += dueToday.map((t) => renderTaskItem(t, false)).join("");
    }
    if (dueTomorrow.length) {
      taskListHTML += `<div class="task-group-label">Due Tomorrow</div>`;
      taskListHTML += dueTomorrow.map((t) => renderTaskItem(t, false)).join("");
    }
    if (dueOther.length) {
      taskListHTML += `<div class="task-group-label">Upcoming</div>`;
      taskListHTML += dueOther.map((t) => renderTaskItem(t, false)).join("");
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

    // Update renderTaskItem to add a data-task-id attribute and remove disabled from checkbox
    function renderTaskItem(task, isDoneList = false) {
      return `
    <div class="task-item">
      <input type="checkbox" class="task-checkbox" data-task-id="${task.id}" ${
        task.completed ? "checked" : ""
      } ${isDoneList ? "disabled" : ""}/>
      <div class="task-details">
        <div class="task-title">${task.task_name}</div>
        <div class="task-meta">
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
          <div><i class="far fa-user"></i> ${getAssigneeName(task)}</div>
        </div>
      </div>
      <div class="task-priority ${getPriorityClass(task.priority)}">${
        task.priority || ""
      }</div>
    </div>
  `;
    }

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

// Initialize the task list
const assignTaskBtn = document.getElementById("assignTaskBtn");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskModal = document.getElementById("taskModal");
const closeModal = document.getElementById("closeModal");

assignTaskBtn.addEventListener("click", () => {
  taskModal.classList.add("active");
});

addTaskBtn.addEventListener("click", () => {
  taskModal.classList.add("active");
});

closeModal.addEventListener("click", () => {
  taskModal.classList.remove("active");
});

// Close modal when clicking outside
taskModal.addEventListener("click", (e) => {
  if (e.target === taskModal) {
    taskModal.classList.remove("active");
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
