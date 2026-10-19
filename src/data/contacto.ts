// Número de WhatsApp de Depa Host: se configura con PUBLIC_WHATSAPP_NUMBER (ver .env.example).
import { PUBLIC_WHATSAPP_NUMBER } from 'astro:env/client'

export const WHATSAPP_NUMBER = PUBLIC_WHATSAPP_NUMBER

// Arma el link de WhatsApp con un mensaje ya escrito.
// Usamos un mensaje distinto en cada botón para saber de dónde viene cada contacto.
export const waLink = (mensaje: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`
