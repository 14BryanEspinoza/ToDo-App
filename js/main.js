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
  // Actualiza la fecha
  const now = new Date();

  // Opciones de formato de fecha
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  // Convierte la fecha a string y la muestra en el DOM
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
  // Carga las tareas desde el LocalStorage
  const item = localStorage.getItem(STORAGE_KEY);

  // Si no hay tareas, devuelve un array vacío
  if (!item) return [];

  // Intenta parsear las tareas
  try {
    const parsed = JSON.parse(item);
    return Array.isArray(parsed) ? parsed.filter(isValidTask) : [];
  } catch (e) {
    console.error("Error cargando tareas:", e);
    return [];
  }
};

const saveTasks = () => {
  // Guarda las tareas en el LocalStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  updateStats();
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
  // Muestra el empty state solo si no quedan tareas visibles
  if (dom.taskView.querySelector(".taskView__item")) return;

  if (!dom.taskView.querySelector(".taskView__empty")) {
    showEmptyState();
  }
};

// Crea el <li> de una tarea (sin listeners; se usa event delegation)
function createTaskItem(task) {
  const li = document.createElement("li");
  li.className = `taskView__item ${task.done ? "taskView__item--done" : ""}`;
  li.dataset.id = task.id;

  // Crea el checkbox
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

  // Crea el texto de la tarea (textContent evita inyección XSS)
  const span = document.createElement("span");
  span.className = "item__text";
  span.textContent = task.text;

  // Crea el botón de eliminar (SVG estático, sin datos de usuario)
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "item__button";
  deleteBtn.type = "button";
  deleteBtn.title = "Eliminar tarea";
  deleteBtn.setAttribute("aria-label", `Eliminar tarea "${task.text}"`);
  deleteBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
  `;

  li.append(checkbox, span, deleteBtn);
  return li;
}

// Busca el <li> de una tarea por su id
const findTaskItem = (id) =>
  [...dom.taskView.querySelectorAll(".taskView__item")].find(
    (el) => el.dataset.id === id,
  );

// LÓGICA DE TAREAS (con re-render dirigido)
const addTask = (text) => {
  // Crea una nueva tarea
  const newTask = {
    id: crypto.randomUUID(), // Usamos UUID para IDs más robustos
    text: text.trim(),
    done: false,
    createdAt: new Date().toISOString(),
  };

  tasks.unshift(newTask); // Agrega la nueva tarea al inicio del array

  saveTasks();

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
  // Busca la tarea por su ID
  const task = tasks.find((t) => t.id === id);

  // Si no encuentra la tarea, sale de la función
  if (!task) return;

  // Cambia el estado de la tarea (completada o pendiente)
  task.done = !task.done;

  saveTasks();

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

  // Filtra las tareas, manteniendo solo las que NO coincidan con el ID
  tasks = tasks.filter((t) => t.id !== id);

  saveTasks();

  findTaskItem(id)?.remove();
  syncEmptyState();

  announce(`Tarea eliminada: ${deleted ? deleted.text : ""}`);
};

const clearCompleted = () => {
  // Cuenta las tareas a eliminar antes de filtrar
  const cleared = tasks.filter((t) => t.done).length;

  // Elimina las tareas completadas
  tasks = tasks.filter((t) => !t.done);

  saveTasks();

  // Elimina del DOM solo los <li> completados
  dom.taskView
    .querySelectorAll(".taskView__item--done")
    .forEach((item) => item.remove());
  syncEmptyState();

  if (cleared > 0) {
    announce(`${cleared} ${cleared === 1 ? "tarea" : "tareas"} eliminadas`);
  }
};

// RENDERIZADO (inicialización y cambio de filtro)
function renderTasks() {
  // Limpia la vista de tareas
  dom.taskView.innerHTML = "";

  // Aplicar filtrado
  const filteredTasks = tasks.filter(matchesFilter);

  // Si no hay tareas, muestra un mensaje
  if (filteredTasks.length === 0) {
    showEmptyState();
    return;
  }

  // Recorre las tareas y crea un elemento para cada una
  filteredTasks.forEach((task) => {
    dom.taskView.appendChild(createTaskItem(task));
  });
}

// INICIALIZACIÓN Y EVENTOS
const init = () => {
  updateDate();
  initTheme();

  // Carga las tareas
  tasks = loadTasks();

  updateStats();
  renderTasks();

  // Formulario
  dom.form.addEventListener("submit", (e) => {
    // Previene el comportamiento por defecto del formulario
    e.preventDefault();

    // Obtiene el valor del input y limpia espacios
    const text = dom.taskInput.value.trim();

    // Si el valor es mayor o igual a 5 caracteres, agrega la tarea
    if (text.length >= 5) {
      addTask(text);
      dom.taskInput.value = "";
    }
  });

  // Filtros
  dom.filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Actualiza la UI
      dom.filterBtns.forEach((b) => b.classList.remove("filters__btn--active"));
      btn.classList.add("filters__btn--active");

      // Actualiza el estado
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
