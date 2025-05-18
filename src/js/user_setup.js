const { ipcRenderer } = require("electron");

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

let tasks = [];
let currentUserId = null;

// Load user info and existing tasks
document.addEventListener("DOMContentLoaded", async () => {
  showLoader();

  // Get user ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  currentUserId = urlParams.get("userId");

  if (!currentUserId) {
    showToast("Invalid user session", "error");
    window.location.href = "../html/user_info.html";
    return;
  }

  try {
    // Load existing tasks
    const userTasks = await ipcRenderer.invoke("get-user-tasks", currentUserId);
    if (userTasks && userTasks.length > 0) {
      tasks = userTasks;
      renderTasks();
    }
  } catch (err) {
    console.error("Error loading tasks:", err);
    showToast("Error loading tasks", "error");
  } finally {
    hideLoader();
  }
});

document.getElementById("taskSetupForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const taskName = document.getElementById("taskName").value.trim();
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;
  const taskPriority = document.getElementById("taskPriority").value;

  const taskTime = `${startTime}-${endTime}`;
  // day selector
  const selectedDays = Array.from(
    document.querySelectorAll("input[name='offDays']:checked")
  ).map((checkbox) => checkbox.value);

  if (!taskName || !startTime || !endTime || selectedDays.length === 0) {
    showToast(
      "Please fill all task fields and select at least one day",
      "error"
    );
    return;
  }

  tasks.push({
    name: taskName,
    time: taskTime,
    priority: taskPriority,
    days: selectedDays,
    due_date: new Date().toISOString().split("T")[0],
    completed: false,
  });

  renderTasks();
  // Reset form
  document.getElementById("taskSetupForm").reset();
});

document.getElementById("saveAllTasks").addEventListener("click", async () => {
  if (tasks.length === 0) {
    alert("Please add at least one task before saving.", "error");
    return;
  }

  showLoader();

  try {
    // Save tasks
    await ipcRenderer.invoke("save-user-tasks", {
      userId: currentUserId,
      tasks,
    });

    // Mark setup as complete
    await ipcRenderer.invoke("complete-setup", currentUserId);

    showToast("Setup completed successfully!");
    setTimeout(() => {
      window.location.href = "../html/index.html";
    }, 1500);
  } catch (err) {
    console.error("Setup failed:", err);
    showToast("Failed to complete setup", "error");
  } finally {
    hideLoader();
  }
});

function renderTasks() {
  const tasksList = document.getElementById("tasks");
  tasksList.innerHTML = "";

  tasks.forEach((task, index) => {
    const li = document.createElement("li");
    li.className = "task-item";

    li.innerHTML = `
      <div class="task-info">
        <div class="task-title">${task.name}</div>
        <div class="task-meta">
          <span><i class="far fa-clock"></i> ${task.time}</span>
          <span class="task-priority priority-${task.priority}">${task.priority}</span>
        </div>
      </div>
      <button class="delete-btn" data-index="${index}">
        <i class="fas fa-trash"></i>
      </button>
    `;

    tasksList.appendChild(li);
  });

  // Add event listeners to delete buttons
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.currentTarget.getAttribute("data-index"));
      tasks.splice(index, 1);
      renderTasks();
    });
  });
}

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
