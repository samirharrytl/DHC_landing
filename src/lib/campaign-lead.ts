// Formulario de pauta digital (/registro): convierte los campos en el lead que recibe el panel.
// "Vender" crea un propietario (ad-sell) y "Comprar" un interesado (ad-buy); la campaña llega en la UTM.
import type { LeadCreate } from './api/client'

export type CampaignIntent = 'buy' | 'sell'

export function buildCampaignLead(fields: Record<string, unknown>, utm?: Record<string, string>): LeadCreate {
  const { intent, ...rest } = fields
  return {
    ...rest,
    source: intent === 'sell' ? 'ad-sell' : 'ad-buy',
    locale: 'es',
    utm,
  } as LeadCreate
}

export function campaignWhatsappMessage(fields: Record<string, unknown>): string {
  const action = fields.intent === 'sell' ? 'vender mi inmueble' : 'comprar un inmueble'
  const name = typeof fields.name === 'string' ? fields.name : ''
  return `Hola, soy ${name}. Quiero ${action}.`
}
