const db = require("./database");
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

function showLoader() {
  document.getElementById("loader").style.display = "block";
}

function hideLoader() {
  document.getElementById("loader").style.display = "none";
}

// Load user info and existing tasks
window.addEventListener("DOMContentLoaded", () => {
  db.getUserInfo((err, userInfo) => {
    if (err) {
      console.error("Error loading user info:", err);
      alert("Error loading user information. Please start from the beginning.");
      window.location.href = "../html/user_info.html";
    } else if (userInfo) {
      currentUserId = userInfo.id;

      // Load existing tasks
      db.getUserTasks(currentUserId, (err, userTasks) => {
        if (err) {
          console.error("Error loading tasks:", err);
        } else if (userTasks && userTasks.length > 0) {
          tasks = userTasks;
          renderTasks();
        }
      });
    } else {
      alert("Please enter your information first.");
      window.location.href = "../html/user_info.html";
    }
  });
});

document.getElementById("taskSetupForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const taskName = document.getElementById("taskName").value;
  const taskTime = document.getElementById("taskTime").value;
  const taskPriority = document.getElementById("taskPriority").value;

  const newTask = {
    name: taskName,
    time: taskTime,
    priority: taskPriority,
  };

  tasks.push(newTask);
  renderTasks();

  // Reset form
  document.getElementById("taskSetupForm").reset();
});

document.getElementById("saveAllTasks").addEventListener("click", () => {
  if (tasks.length === 0) {
    alert("Please add at least one task before saving.");
    return;
  }

  db.saveUserTasks(currentUserId, tasks, (err) => {
    if (err) {
      showToast("Error saving tasks: " + err.message, "error");
    } else {
      showToast("Tasks saved successfully! Redirecting to dashboard...");
      // Redirect to main page after a delay
      setTimeout(() => {
        window.location.href = "../index.html";
      }, 1500);
    }
  });
});

function renderTasks() {
  const tasksList = document.getElementById("tasks");
  tasksList.innerHTML = "";

  tasks.forEach((task, index) => {
    const li = document.createElement("li");

    const taskInfo = document.createElement("div");
    taskInfo.innerHTML = `
            <strong>${task.name}</strong> at ${task.time} 
            <span class="task-priority priority-${task.priority}">${task.priority}</span>
        `;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "delete-btn";
    deleteBtn.addEventListener("click", () => {
      tasks.splice(index, 1);
      renderTasks();
    });

    li.appendChild(taskInfo);
    li.appendChild(deleteBtn);
    tasksList.appendChild(li);
  });
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
