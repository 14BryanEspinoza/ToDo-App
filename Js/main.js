// Constantes
const dateID = document.getElementById('date')
const formID = document.getElementById('formTask')
const taskViewID = document.getElementById('taskView')
const dates = new Date()
const STORAGE_KEY = 'tasks'

// Manejo de Fechas
const option = {
  weekday: 'long',
  year: 'numeric',
  day: 'numeric',
}

const personalizedDate = dates.toLocaleDateString('es-ES', option).toUpperCase()

dateID.innerText = personalizedDate

// Local Storage
const loadTasks = () => {
  const item = localStorage.getItem(STORAGE_KEY)

  // Si Item es false devuelve un array vacío
  if (!item) return []

  try {
    // Si es true devuelve el contenido
    return JSON.parse(item)
  } catch (e) {
    // Si el JSON se corrompe, evitamos romper la app
    return []
  }
}

// Guardar Tareas
const saveTasks = (tasks) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

// Agregar Tarea
const addTask = (text) => {
  // Crea el objeto
  const newTask = { id: Date.now(), text, done: false }

  // Empuja la nueva tarea a la colección
  tasks.push(newTask)

  saveTasks(tasks)
}

// Completa o No
const toggleTask = (id) => {
  // Hace un recorte del ID
  const task = tasks.find((t) => t.id === id)

  // Si el ID es falso no retorna nada
  if (!task) return

  // Si el ID esta completado, lo desmarca o viceversa
  task.done = !task.done

  saveTasks(tasks)
  renderTasks()
}

// Eliminar Tarea
const deleteTask = (id) => {
  tasks = tasks.filter((t) => t.id !== id)

  saveTasks(tasks)
  renderTasks()
}

// Renderizado de Tareas
const renderTasks = () => {
  taskViewID.innerHTML = ''

  // Cargar el texto
  tasks.forEach((task) => {
    const li = document.createElement('li')
    const checkbox = document.createElement('input')
    const button = document.createElement('button')

    checkbox.type = 'checkbox'
    checkbox.checked = task.done

    button.textContent = 'Eliminar'

    li.classList = 'taskView__item'
    checkbox.classList = 'item__check'
    button.classList = 'item__button'

    if (task.done) li.classList = 'taskView__item completado'
    if (task.done) button.classList = 'item__button completadoBtn'

    checkbox.addEventListener('change', () => toggleTask(task.id))
    button.addEventListener('click', () => deleteTask(task.id))

    li.append(checkbox, document.createTextNode(task.text), button)
    taskViewID.appendChild(li)
  })
}

// Manejo del Formulario de Tareas
formID.addEventListener('submit', function (e) {
  // Impide la recarga de la pagina
  e.preventDefault()

  // Const
  const taskID = document.getElementById('task').value

  addTask(taskID)
  renderTasks()

  document.getElementById('task').value = ''
})

// Iniciación
let tasks = loadTasks()
renderTasks()
