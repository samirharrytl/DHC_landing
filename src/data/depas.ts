// Los depas viven aquí para que la home y Capital usen los mismos datos.
// OJO: la cuota y la renta son iguales en los 3 porque todavía son datos de ejemplo.
// El badge se escribe normal ("Súper precio"); el CSS lo pone en mayúsculas.
// Las fotos se importan desde src/assets: Astro las optimiza (AVIF/WebP + tamaños).
import depaLince from '../assets/DepaLince.jpg'
import depaSurquillo from '../assets/DepaSurquillo.jpg'
import depaMagdalena from '../assets/DepaMagdalena.jpg'

export const depas = [
  { district: 'Lince', address: 'Av. Arequipa cuadra 12', badge: 'Súper precio',
    price: 310000, profitability: '8-10% anual', yearsPayment : '11 años', img: depaLince },
  { district: 'Surquillo', address: 'Av. Angamos Este cuadra 20', badge: 'Súper oportunidad',
    price: 285000, profitability: '9-11% anual', yearsPayment : '10 años', img: depaSurquillo },
  { district: 'Magdalena', address: 'Av. del Ejército cuadra 6', badge: 'Últimos en venta',
    price: 340000, profitability: '7-9% anual', yearsPayment : '12 años', img: depaMagdalena },
]

// Nota que va debajo de cada grid de depas.
// TODO: completar [plazo], [X] y [fecha] con los supuestos reales del cálculo.
export const disclaimer =
  '*Cuota estimada con tasa pizarra a [plazo] años y [X] % de inicial, al [fecha]. ' +
  'Renta estimada según el mercado del distrito. No es una rentabilidad garantizada.'
