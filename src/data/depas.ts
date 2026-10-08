// Los depas viven aquí para que la home y Capital usen los mismos datos.
// OJO: la cuota y la renta son iguales en los 3 porque todavía son datos de ejemplo.
// El badge se escribe normal ("Súper precio"); el CSS lo pone en mayúsculas.
export const depas = [
  { district: 'Lince', address: 'Av. Arequipa cuadra 12', badge: 'Súper precio',
    price: 310000, monthlyPayment: 2180, estimatedRent: 2350 },
  { district: 'Surquillo', address: 'Av. Angamos Este cuadra 20', badge: 'Súper oportunidad',
    price: 285000, monthlyPayment: 2180, estimatedRent: 2350 },
  { district: 'Magdalena', address: 'Av. del Ejército cuadra 6', badge: 'Últimos en venta',
    price: 340000, monthlyPayment: 2180, estimatedRent: 2350 },
]

// Nota que va debajo de cada grid de depas.
// TODO: completar [plazo], [X] y [fecha] con los supuestos reales del cálculo.
export const disclaimer =
  '*Cuota estimada con tasa pizarra a [plazo] años y [X] % de inicial, al [fecha]. ' +
  'Renta estimada según el mercado del distrito. No es una rentabilidad garantizada.'
