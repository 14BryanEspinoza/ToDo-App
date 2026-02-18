// SELECTORES DOM
const dom = {
  date: document.getElementById('date'),
  form: document.getElementById('formTask'),
  taskInput: document.getElementById('task'),
  taskView: document.getElementById('taskView'),
  totalTasks: document.getElementById('totalTasks'),
  completedTasks: document.getElementById('completedTasks'),
  pendingTasks: document.getElementById('pendingTasks'),
  filterBtns: document.querySelectorAll('.filters__btn'),
  clearBtn: document.getElementById('clearCompleted'),
}

// CONSTANTES Y ESTADO
const STORAGE_KEY = 'tasks'
let tasks = []
let currentFilter = 'all'

// Manejo de Fechas
const updateDate = () => {
  // Actualiza la fecha
  const now = new Date()

  // Opciones de formato de fecha
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }

  // Convierte la fecha a string y la muestra en el DOM
  dom.date.innerText = now.toLocaleDateString('es-ES', options).toLowerCase()
}

// PERSISTENCIA (LocalStorage)
const loadTasks = () => {
  // Carga las tareas desde el LocalStorage
  const item = localStorage.getItem(STORAGE_KEY)

  // Si no hay tareas, devuelve un array vacío
  if (!item) return []

  // Intenta parsear las tareas
  try {
    return JSON.parse(item)
  } catch (e) {
    console.error('Error cargando tareas:', e)
    return []
  }
}

const saveTasks = () => {
  // Guarda las tareas en el LocalStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  updateStats()
}

// Estadísticas
const updateStats = () => {
  const total = tasks.length
  const completed = tasks.filter((t) => t.done).length
  const pending = total - completed

  dom.totalTasks.innerText = total
  dom.completedTasks.innerText = completed
  dom.pendingTasks.innerText = pending
}

// LÓGICA DE TAREAS
const addTask = (text) => {
  // Crea una nueva tarea
  const newTask = {
    id: crypto.randomUUID(), // Usamos UUID para IDs más robustos
    text: text.trim(),
    done: false,
    createdAt: new Date().toISOString(),
  }

  tasks.unshift(newTask) // Agrega la nueva tarea al inicio del array

  saveTasks()
  renderTasks()
}

const toggleTask = (id) => {
  // Busca la tarea por su ID
  const task = tasks.find((t) => t.id === id)

  // Si no encuentra la tarea, sale de la función
  if (!task) return

  // Cambia el estado de la tarea (completada o pendiente)
  task.done = !task.done

  saveTasks()
  renderTasks()
}

const deleteTask = (id) => {
  // Filtra las tareas, manteniendo solo las que NO coincidan con el ID
  tasks = tasks.filter((t) => t.id !== id)

  saveTasks()
  renderTasks()
}

const clearCompleted = () => {
  // Elimina las tareas completadas
  tasks = tasks.filter((t) => !t.done)

  saveTasks()
  renderTasks()
}

// RENDERIZADO
function renderTasks() {
  // Limpia la vista de tareas
  dom.taskView.innerHTML = ''

  // Aplicar filtrado
  const filteredTasks = tasks.filter((task) => {
    if (currentFilter === 'active') return !task.done
    if (currentFilter === 'completed') return task.done
    return true
  })

  // Si no hay tareas, muestra un mensaje
  if (filteredTasks.length === 0) {
    dom.taskView.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No hay tareas para mostrar.</p>`
    return
  }

  // Recorre las tareas y crea un elemento para cada una
  filteredTasks.forEach((task) => {
    // Crea el elemento de la tarea
    const li = document.createElement('li')
    li.className = `taskView__item ${task.done ? 'taskView__item--done' : ''}`

    // Agrega el contenido HTML de la tarea
    li.innerHTML = `
      <input type="checkbox" class="item__check" ${task.done ? 'checked' : ''} aria-label="Marcar como completada">
      <span class="item__text">${task.text}</span>
      <button class="item__button" title="Eliminar tarea">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
      </button>
    `

    // Eventos internos
    const checkbox = li.querySelector('.item__check')
    const deleteBtn = li.querySelector('.item__button')

    // Agrega los event listeners para los eventos internos
    checkbox.addEventListener('change', () => toggleTask(task.id))
    deleteBtn.addEventListener('click', (e) => {
      // Previene el comportamiento por defecto del botón
      e.stopPropagation()

      // Elimina la tarea
      deleteTask(task.id)
    })

    // Agrega el elemento de la tarea a la vista
    dom.taskView.appendChild(li)
  })
}

// INICIALIZACIÓN Y EVENTOS
const init = () => {
  updateDate()

  // Carga las tareas
  tasks = loadTasks()

  updateStats()
  renderTasks()

  // Formulario
  dom.form.addEventListener('submit', (e) => {
    // Previene el comportamiento por defecto del formulario
    e.preventDefault()

    // Obtiene el valor del input
    const text = dom.taskInput.value

    // Si el valor es mayor o igual a 5 caracteres, agrega la tarea
    if (text.length >= 5) {
      addTask(text)
      dom.taskInput.value = ''
    }
  })

  // Filtros
  dom.filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Actualiza la UI
      dom.filterBtns.forEach((b) => b.classList.remove('filters__btn--active'))
      btn.classList.add('filters__btn--active')

      // Actualiza el estado
      currentFilter = btn.dataset.filter

      renderTasks()
    })
  })

  // Limpiar completadas
  dom.clearBtn.addEventListener('click', clearCompleted)
}

// Ejecutar al cargar
document.addEventListener('DOMContentLoaded', init)
