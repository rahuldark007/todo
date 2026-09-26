// App state
const STORAGE_KEY = "todoFlow.tasks";
const THEME_KEY = "todoFlow.theme";

const state = {
  tasks: loadTasks(),
  filter: "all",
  searchTerm: "",
  sortBy: "created-desc",
  theme: localStorage.getItem(THEME_KEY) || "light",
  editingId: null,
};

// DOM references
const todoForm = document.querySelector("#todoForm");
const taskInput = document.querySelector("#taskInput");
const prioritySelect = document.querySelector("#prioritySelect");
const taskList = document.querySelector("#taskList");
const emptyState = document.querySelector("#emptyState");
const searchInput = document.querySelector("#searchInput");
const filterButtons = document.querySelectorAll(".filter-btn");
const sortSelect = document.querySelector("#sortSelect");
const clearCompletedBtn = document.querySelector("#clearCompletedBtn");
const themeToggle = document.querySelector("#themeToggle");
const themeIcon = document.querySelector("#themeIcon");

const totalTasksEl = document.querySelector("#totalTasks");
const completedTasksEl = document.querySelector("#completedTasks");
const remainingTasksEl = document.querySelector("#remainingTasks");
const progressBar = document.querySelector("#progressBar");
const progressText = document.querySelector("#progressText");

// Load saved tasks from localStorage
function loadTasks() {
  const savedTasks = localStorage.getItem(STORAGE_KEY);

  if (!savedTasks) {
    return [];
  }

  try {
    const parsedTasks = JSON.parse(savedTasks);
    return Array.isArray(parsedTasks) ? parsedTasks : [];
  } catch (error) {
    console.error("Error reading tasks from localStorage:", error);
    return [];
  }
}

// Save tasks to localStorage
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

// Create a unique task ID
function createTaskId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Format date/time for display
function formatDate(dateValue) {
  const date = new Date(dateValue);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

// Escape HTML for safe rendering
function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Apply theme and persist it
function applyTheme() {
  const isDark = state.theme === "dark";
  document.body.classList.toggle("dark-theme", isDark);
  themeIcon.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem(THEME_KEY, state.theme);
}

// Update filter buttons state
function updateFilterButtons() {
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === state.filter;
    button.classList.toggle("active", isActive);
  });
}

// Get tasks based on current filter and search term
function getFilteredTasks() {
  let filteredTasks = [...state.tasks];

  if (state.searchTerm) {
    const searchText = state.searchTerm.toLowerCase();
    filteredTasks = filteredTasks.filter((task) =>
      task.text.toLowerCase().includes(searchText)
    );
  }

  if (state.filter === "active") {
    filteredTasks = filteredTasks.filter((task) => !task.completed);
  }

  if (state.filter === "completed") {
    filteredTasks = filteredTasks.filter((task) => task.completed);
  }

  // Sort tasks based on selected option
  filteredTasks.sort((a, b) => {
    const priorityOrder = {
      High: 3,
      Medium: 2,
      Low: 1,
    };

    switch (state.sortBy) {
      case "created-asc":
        return new Date(a.createdAt) - new Date(b.createdAt);
      case "priority-high":
        return priorityOrder[b.priority] - priorityOrder[a.priority] ||
          new Date(b.createdAt) - new Date(a.createdAt);
      case "priority-low":
        return priorityOrder[a.priority] - priorityOrder[b.priority] ||
          new Date(b.createdAt) - new Date(a.createdAt);
      case "created-desc":
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  return filteredTasks;
}

// Update stats cards and progress bar
function renderStats() {
  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter((task) => task.completed).length;
  const remainingTasks = totalTasks - completedTasks;
  const progressValue = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  totalTasksEl.textContent = String(totalTasks);
  completedTasksEl.textContent = String(completedTasks);
  remainingTasksEl.textContent = String(remainingTasks);
  progressBar.style.width = `${progressValue}%`;
  progressText.textContent = `${progressValue}%`;
}

// Render the current empty state message
function renderEmptyState(filteredTasks) {
  const hasTasks = state.tasks.length > 0;
  const hasVisibleTasks = filteredTasks.length > 0;

  if (!hasTasks) {
    emptyState.innerHTML = `
      <div class="empty-icon">✨</div>
      <h3>No tasks yet</h3>
      <p>Add your first task to start building momentum.</p>
    `;
    emptyState.classList.remove("hidden");
    return;
  }

  if (!hasVisibleTasks) {
    emptyState.innerHTML = `
      <div class="empty-icon">🔎</div>
      <h3>No matching tasks</h3>
      <p>Try a different search or switch filters.</p>
    `;
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
}

// Build HTML for a single task
function renderTask(task) {
  const isEditing = state.editingId === task.id;

  if (isEditing) {
    return `
      <li class="task-item editing" data-id="${task.id}">
        <div class="editing-row">
          <input
            class="edit-input"
            type="text"
            value="${escapeHtml(task.text)}"
            aria-label="Edit task"
            maxlength="160"
          />

          <div class="task-meta-controls">
            <label class="priority-field">
              <span>Priority</span>
              <select class="edit-priority" aria-label="Edit task priority">
                <option value="Low" ${task.priority === "Low" ? "selected" : ""}>Low</option>
                <option value="Medium" ${task.priority === "Medium" ? "selected" : ""}>Medium</option>
                <option value="High" ${task.priority === "High" ? "selected" : ""}>High</option>
              </select>
            </label>

            <div class="edit-controls">
              <button class="save-edit-btn" type="button" data-action="save-edit" data-id="${task.id}">Save</button>
              <button class="cancel-edit-btn" type="button" data-action="cancel-edit" data-id="${task.id}">Cancel</button>
            </div>
          </div>
        </div>
      </li>
    `;
  }

  return `
    <li class="task-item ${task.completed ? "completed" : ""}" data-id="${task.id}">
      <div class="task-main">
        <button
          class="check-btn ${task.completed ? "checked" : ""}"
          type="button"
          data-action="toggle"
          data-id="${task.id}"
          aria-label="Mark task as complete"
        ></button>

        <div class="task-content">
          <div class="task-row">
            <span class="task-text">${escapeHtml(task.text)}</span>
            <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
          </div>

          <div class="task-meta">
            <span>Created: ${formatDate(task.createdAt)}</span>
          </div>
        </div>
      </div>

      <div class="task-actions">
        <button class="task-action" type="button" data-action="edit" data-id="${task.id}" aria-label="Edit task">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 17.46v3.04c0 .28.22.5.5.5h3.04c.13 0 .26-.05.35-.15L17.81 9.94l-3.75-3.75L3.15 17.11a.5.5 0 00-.15.35zM20.71 7.04a1 1 0 000-1.41L18.37 3.29a1 1 0 00-1.41 0l-1.34 1.34 3.75 3.75 1.34-1.34z"/>
          </svg>
        </button>

        <button class="task-action delete" type="button" data-action="delete" data-id="${task.id}" aria-label="Delete task">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 3a1 1 0 00-1 1v1H4a1 1 0 100 2h1l1 12.5A2 2 0 008 20h8a2 2 0 001.99-1.5L19 7h1a1 1 0 100-2h-4V4a1 1 0 00-1-1H9zm1 2h4V5h-4v.01zm-2.5 3.5h9l-.9 10.5h-7.2L7.5 8.5z"/>
          </svg>
        </button>
      </div>
    </li>
  `;
}

// Render the task list and update UI
function render() {
  const filteredTasks = getFilteredTasks();

  taskList.innerHTML = filteredTasks.map(renderTask).join("");
  renderStats();
  renderEmptyState(filteredTasks);
  updateFilterButtons();
}

// Add a new task
function addTask() {
  const text = taskInput.value.trim();

  if (!text) {
    taskInput.focus();
    taskInput.classList.add("shake");
    setTimeout(() => taskInput.classList.remove("shake"), 300);
    return;
  }

  const newTask = {
    id: createTaskId(),
    text,
    priority: prioritySelect.value,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  state.tasks.unshift(newTask);
  saveTasks();
  taskInput.value = "";
  prioritySelect.value = "Medium";
  taskInput.focus();
  render();
}

// Toggle completion state for a task
function toggleTask(taskId) {
  state.tasks = state.tasks.map((task) => {
    if (task.id === taskId) {
      return { ...task, completed: !task.completed };
    }
    return task;
  });

  saveTasks();
  render();
}

// Edit a task
function startEditing(taskId) {
  state.editingId = taskId;
  render();

  const editInput = document.querySelector(".edit-input");
  if (editInput) {
    editInput.focus();
    editInput.select();
  }
}

function cancelEditing() {
  state.editingId = null;
  render();
}

function saveEditedTask(taskId) {
  const taskItem = document.querySelector(`.task-item[data-id="${taskId}"]`);
  const editInput = taskItem ? taskItem.querySelector(".edit-input") : null;
  const editPriority = taskItem ? taskItem.querySelector(".edit-priority") : null;

  if (!editInput || !editPriority) {
    return;
  }

  const updatedText = editInput.value.trim();
  const updatedPriority = editPriority.value;

  if (!updatedText) {
    editInput.focus();
    editInput.classList.add("shake");
    setTimeout(() => editInput.classList.remove("shake"), 300);
    return;
  }

  state.tasks = state.tasks.map((task) => {
    if (task.id === taskId) {
      return {
        ...task,
        text: updatedText,
        priority: updatedPriority,
      };
    }
    return task;
  });

  state.editingId = null;
  saveTasks();
  render();
}

// Delete a single task with a subtle exit animation
function deleteTask(taskId) {
  const taskElement = taskList.querySelector(`.task-item[data-id="${taskId}"]`);

  if (taskElement) {
    taskElement.classList.add("removing");

    setTimeout(() => {
      state.tasks = state.tasks.filter((task) => task.id !== taskId);
      if (state.editingId === taskId) {
        state.editingId = null;
      }

      saveTasks();
      render();
    }, 220);

    return;
  }

  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  if (state.editingId === taskId) {
    state.editingId = null;
  }

  saveTasks();
  render();
}

// Clear all completed tasks with confirmation
function clearCompletedTasks() {
  const completedTasks = state.tasks.filter((task) => task.completed);

  if (completedTasks.length === 0) {
    return;
  }

  const shouldDelete = window.confirm("Are you sure you want to delete all completed tasks?");
  if (!shouldDelete) {
    return;
  }

  state.tasks = state.tasks.filter((task) => !task.completed);
  saveTasks();
  render();
}

// Event listeners
window.addEventListener("DOMContentLoaded", () => {
  applyTheme();
  render();
});

todoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addTask();
});

searchInput.addEventListener("input", (event) => {
  state.searchTerm = event.target.value.trim();
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    render();
  });
});

sortSelect.addEventListener("change", (event) => {
  state.sortBy = event.target.value;
  render();
});

clearCompletedBtn.addEventListener("click", clearCompletedTasks);

themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "light" ? "dark" : "light";
  applyTheme();
});

taskList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const { action, id } = button.dataset;

  if (!action || !id) {
    return;
  }

  if (action === "toggle") {
    toggleTask(id);
  }

  if (action === "edit") {
    startEditing(id);
  }

  if (action === "delete") {
    deleteTask(id);
  }

  if (action === "save-edit") {
    saveEditedTask(id);
  }

  if (action === "cancel-edit") {
    cancelEditing();
  }
});

// Optional: allow Enter inside the search field to submit too, but not needed.
// CSS animation for input shake (used for validation)
const styleTag = document.createElement("style");
styleTag.textContent = `
  .shake {
    animation: inputShake 0.25s ease-in-out;
    border-color: rgba(255, 91, 107, 0.8) !important;
  }

  @keyframes inputShake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    50% { transform: translateX(5px); }
    75% { transform: translateX(-4px); }
  }
`;
document.head.appendChild(styleTag);
