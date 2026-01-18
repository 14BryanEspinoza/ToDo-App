// Constantes
const dateID = document.getElementById('date')
const dates = new Date()

// Manejo de Fechas
const option = {
  weekday: 'long',
  year: 'numeric',
  day: 'numeric',
}

const personalizedDate = dates.toLocaleDateString('es-ES', option).toUpperCase()

dateID.innerText = personalizedDate
