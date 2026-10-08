// Número de WhatsApp de Depa Host (reemplaza las X por el número real)
export const WHATSAPP_NUMBER = '51XXXXXXXXX'

// Arma el link de WhatsApp con un mensaje ya escrito.
// Usamos un mensaje distinto en cada botón para saber de dónde viene cada contacto.
export const waLink = (mensaje: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`
