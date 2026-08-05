// SELECTORES DOM
const dom = {
  date: document.getElementById("date"),
  form: document.getElementById("formTask"),
  taskInput: document.getElementById("task"),
  taskView: document.getElementById("taskView"),
  totalTasks: document.getElementById("totalTasks"),
  completedTasks: document.getElementById("completedTasks"),
  pendingTasks: document.getElementById("pendingTasks"),
  filterBtns: document.querySelectorAll(".filters__btn"),
  clearBtn: document.getElementById("clearCompleted"),
  themeToggle: document.getElementById("themeToggle"),
  progressBar: document.getElementById("progressBar"),
  progressFill: document.getElementById("progressFill"),
  liveRegion: document.getElementById("liveRegion"),
  confirmClear: document.getElementById("confirmClear"),
};

// CONSTANTES Y ESTADO
const STORAGE_KEY = "tasks";
const THEME_KEY = "theme";
let tasks = [];
let currentFilter = "all";

// Manejo de Fechas
const updateDate = () => {
  const now = new Date();

  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  dom.date.innerText = now.toLocaleDateString("es-ES", options).toLowerCase();
  // Formato machine-readable para accesibilidad
  dom.date.dateTime = now.toISOString();
};

// PERSISTENCIA (LocalStorage)
const isValidTask = (task) =>
  task &&
  typeof task.id === "string" &&
  typeof task.text === "string" &&
  typeof task.done === "boolean";

const loadTasks = () => {
  const item = localStorage.getItem(STORAGE_KEY);

  if (!item) return [];

  try {
    const parsed = JSON.parse(item);
    return Array.isArray(parsed) ? parsed.filter(isValidTask) : [];
  } catch (e) {
    console.error("Error cargando tareas:", e);
    return [];
  }
};

const saveTasks = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
};

// Estadísticas
const updateStats = () => {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.done).length;
  const pending = total - completed;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  dom.totalTasks.innerText = total;
  dom.completedTasks.innerText = completed;
  dom.pendingTasks.innerText = pending;
  dom.progressBar.setAttribute("aria-valuenow", percent);
  dom.progressFill.style.width = `${percent}%`;
};

// Anuncios de accesibilidad (aria-live)
const announce = (message) => {
  dom.liveRegion.textContent = "";
  // Reintenta en el siguiente frame para re-disparar el anuncio
  requestAnimationFrame(() => {
    dom.liveRegion.textContent = message;
  });
};

// Tema claro/oscuro
const getPreferredTheme = () => {
  const stored = localStorage.getItem(THEME_KEY);

  if (stored === "light" || stored === "dark") return stored;

  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
};

const setTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  dom.themeToggle.setAttribute(
    "aria-label",
    theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro",
  );
};

const initTheme = () => {
  setTheme(getPreferredTheme());

  dom.themeToggle.addEventListener("click", () => {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(next);
  });
};

// FILTRADO Y RENDERIZADO
const matchesFilter = (task) => {
  if (currentFilter === "active") return !task.done;
  if (currentFilter === "completed") return task.done;
  return true;
};

const showEmptyState = () => {
  const li = document.createElement("li");
  li.className = "taskView__empty";
  li.setAttribute("role", "status");
  li.textContent = "No hay tareas para mostrar.";
  dom.taskView.appendChild(li);
};

const syncEmptyState = () => {
  // Solo si no quedan tareas visibles
  if (dom.taskView.querySelector(".taskView__item")) return;

  if (!dom.taskView.querySelector(".taskView__empty")) {
    showEmptyState();
  }
};

// Crea el <li> de una tarea (sin listeners; se usa event delegation)
const createTaskItem = (task) => {
  const li = document.createElement("li");
  li.className = `taskView__item ${task.done ? "taskView__item--done" : ""}`;
  li.dataset.id = task.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "item__check";
  checkbox.checked = task.done;
  checkbox.setAttribute(
    "aria-label",
    task.done
      ? `Marcar "${task.text}" como pendiente`
      : `Marcar "${task.text}" como completada`,
  );

  // textContent evita inyección XSS
  const span = document.createElement("span");
  span.className = "item__text";
  span.textContent = task.text;

  // SVG estático, sin datos de usuario (innerHTML seguro)
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "item__button";
  deleteBtn.type = "button";
  deleteBtn.title = "Eliminar tarea";
  deleteBtn.setAttribute("aria-label", `Eliminar tarea "${task.text}"`);
  deleteBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-1-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
  `;

  li.append(checkbox, span, deleteBtn);
  return li;
};

const findTaskItem = (id) =>
  [...dom.taskView.querySelectorAll(".taskView__item")].find(
    (el) => el.dataset.id === id,
  );

// LÓGICA DE TAREAS (con re-render dirigido)
const addTask = (text) => {
  const newTask = {
    id: crypto.randomUUID(), // UUID para IDs más robustos
    text: text.trim(),
    done: false,
    createdAt: new Date().toISOString(),
  };

  tasks.unshift(newTask);

  saveTasks();
  updateStats();

  // Solo agrega el <li> si la tarea pasa el filtro activo
  if (matchesFilter(newTask)) {
    dom.taskView.querySelector(".taskView__empty")?.remove();
    dom.taskView.prepend(createTaskItem(newTask));
  } else {
    syncEmptyState();
  }

  announce(`Tarea añadida: ${newTask.text}`);
};

const toggleTask = (id) => {
  const task = tasks.find((t) => t.id === id);

  if (!task) return;

  task.done = !task.done;

  saveTasks();
  updateStats();

  const item = findTaskItem(id);

  if (matchesFilter(task)) {
    // Sigue visible: actualiza clase y checkbox sin reconstruir la lista
    item.classList.toggle("taskView__item--done", task.done);
    const checkbox = item.querySelector(".item__check");
    checkbox.checked = task.done;
    checkbox.setAttribute(
      "aria-label",
      task.done
        ? `Marcar "${task.text}" como pendiente`
        : `Marcar "${task.text}" como completada`,
    );
  } else {
    // Deja de coincidir con el filtro: elimina el <li>
    item.remove();
    syncEmptyState();
  }

  announce(
    task.done
      ? `Tarea completada: ${task.text}`
      : `Tarea marcada como pendiente: ${task.text}`,
  );
};

const deleteTask = (id) => {
  // Captura la tarea antes de eliminarla para el anuncio
  const deleted = tasks.find((t) => t.id === id);

  tasks = tasks.filter((t) => t.id !== id);

  saveTasks();
  updateStats();

  findTaskItem(id)?.remove();
  syncEmptyState();

  announce(`Tarea eliminada: ${deleted ? deleted.text : ""}`);
};

const clearCompleted = () => {
  const cleared = tasks.filter((t) => t.done).length;

  tasks = tasks.filter((t) => !t.done);

  saveTasks();
  updateStats();

  dom.taskView
    .querySelectorAll(".taskView__item--done")
    .forEach((item) => item.remove());
  syncEmptyState();

  if (cleared > 0) {
    announce(`${cleared} ${cleared === 1 ? "tarea" : "tareas"} eliminadas`);
  }
};

// RENDERIZADO (inicialización y cambio de filtro)
const renderTasks = () => {
  dom.taskView.innerHTML = "";

  const filteredTasks = tasks.filter(matchesFilter);

  if (filteredTasks.length === 0) {
    showEmptyState();
    return;
  }

  filteredTasks.forEach((task) => {
    dom.taskView.appendChild(createTaskItem(task));
  });
};

// INICIALIZACIÓN Y EVENTOS
const init = () => {
  updateDate();
  initTheme();

  tasks = loadTasks();

  updateStats();
  renderTasks();

  dom.form.addEventListener("submit", (e) => {
    e.preventDefault();

    const text = dom.taskInput.value.trim();

    if (text.length >= 5) {
      addTask(text);
      dom.taskInput.value = "";
    }
  });

  dom.filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      dom.filterBtns.forEach((b) => b.classList.remove("filters__btn--active"));
      btn.classList.add("filters__btn--active");

      currentFilter = btn.dataset.filter;

      renderTasks();
    });
  });

  // Delegación de eventos en la lista (un solo listener por tipo)
  dom.taskView.addEventListener("change", (e) => {
    const checkbox = e.target.closest(".item__check");
    if (!checkbox) return;

    toggleTask(checkbox.closest(".taskView__item").dataset.id);
  });

  dom.taskView.addEventListener("click", (e) => {
    const button = e.target.closest(".item__button");
    if (!button) return;

    deleteTask(button.closest(".taskView__item").dataset.id);
  });

  // Limpiar completadas (con confirmación)
  dom.clearBtn.addEventListener("click", () => {
    if (tasks.some((t) => t.done)) {
      dom.confirmClear.showModal();
    }
  });

  dom.confirmClear.addEventListener("close", () => {
    if (dom.confirmClear.returnValue === "confirm") {
      clearCompleted();
    }
  });
};

// Ejecutar al cargar
document.addEventListener("DOMContentLoaded", init);
