import { describe, expect, it } from 'vitest'
import { buildCampaignLead, campaignWhatsappMessage } from '../../src/lib/campaign-lead'

const fields = {
  name: 'Ana',
  phone: '987 654 321',
  email: 'ana@example.com',
  consent: true,
  marketingConsent: false,
  website: '',
  turnstileToken: 'tok',
}

describe('buildCampaignLead', () => {
  it('vender va al panel como ad-sell y comprar como ad-buy, sin el campo intent', () => {
    const sell = buildCampaignLead({ ...fields, intent: 'sell' })
    expect(sell.source).toBe('ad-sell')
    expect(sell).not.toHaveProperty('intent')
    expect(buildCampaignLead({ ...fields, intent: 'buy' }).source).toBe('ad-buy')
  })

  it('conserva los datos y la publicidad desmarcada, y agrega idioma y UTM', () => {
    expect(buildCampaignLead({ ...fields, intent: 'buy' }, { source: 'facebook' })).toEqual({
      source: 'ad-buy',
      name: 'Ana',
      phone: '987 654 321',
      email: 'ana@example.com',
      consent: true,
      marketingConsent: false,
      website: '',
      turnstileToken: 'tok',
      locale: 'es',
      utm: { source: 'facebook' },
    })
  })
})

describe('campaignWhatsappMessage', () => {
  it('dice si quiere comprar o vender', () => {
    expect(campaignWhatsappMessage({ name: 'Ana', intent: 'buy' })).toBe(
      'Hola, soy Ana. Quiero comprar un inmueble.',
    )
    expect(campaignWhatsappMessage({ name: 'Ana', intent: 'sell' })).toBe(
      'Hola, soy Ana. Quiero vender mi inmueble.',
    )
  })
})
