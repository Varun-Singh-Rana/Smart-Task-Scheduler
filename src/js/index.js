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
