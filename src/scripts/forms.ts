// Manejador común de formularios que envían a la API.
//
// Convenciones en el HTML:
// - Los campos usan name con puntos para armar JSON anidado: name="consumer.email" → { consumer: { email } }
// - type="number" se envía como número; checkbox como true/false; los vacíos no se envían.
// - <p data-form-status> muestra el resultado; <p data-error-for="consumer.email"> el error de ese campo.
// - El widget Turnstile agrega "cf-turnstile-response", que se envía como turnstileToken.
import { apiConfigured, type ApiError } from '../lib/api/client'
import { waLink } from '../data/contacto'

type Json = Record<string, unknown>

export interface SendResult<T> {
  data?: T
  error?: ApiError
  response?: Response
}

interface EnhanceOptions<P extends Json, T> {
  /** Completa el JSON armado desde los campos (p. ej. agrega source o locale). */
  buildPayload: (fields: Json) => P
  send: (payload: P) => Promise<SendResult<T>>
  onSuccess: (data: T, form: HTMLFormElement) => void
  /** Mensaje de WhatsApp si la API no está configurada o falla. */
  whatsappMessage: (fields: Json) => string
  messages?: Partial<typeof DEFAULT_MESSAGES>
}

const DEFAULT_MESSAGES = {
  sending: 'Enviando…',
  networkError: 'No pudimos enviar tus datos. Revisa tu conexión o escríbenos por WhatsApp.',
  tooMany: 'Hiciste varios envíos seguidos. Espera un minuto e inténtalo otra vez.',
  invalid: 'Revisa los campos marcados.',
  noApi: 'Por ahora recibimos estas consultas por WhatsApp.',
  whatsappLink: 'Escribir por WhatsApp',
}

/** Arma un objeto anidado a partir de los campos del formulario. */
export function formToObject(form: HTMLFormElement): Json {
  const result: Json = {}
  for (const element of Array.from(form.elements)) {
    if (!(
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ))
      continue
    if (!element.name || element.disabled) continue
    if (element instanceof HTMLInputElement && element.type === 'radio' && !element.checked) continue

    let value: unknown
    if (element instanceof HTMLInputElement && element.type === 'checkbox') value = element.checked
    else if (element.value.trim() === '') continue
    else if (element instanceof HTMLInputElement && element.type === 'number') value = Number(element.value)
    else if (element.dataset.number !== undefined) value = Number(element.value.replace(/[^\d.]/g, ''))
    else value = element.value.trim()

    const name = element.name === 'cf-turnstile-response' ? 'turnstileToken' : element.name
    const keys = name.split('.')
    const last = keys.pop() ?? name
    let target = result
    keys.forEach((key) => {
      target[key] ??= {}
      target = target[key] as Json
    })
    target[last] = value
  }
  return result
}

/** UTM de la primera visita (sessionStorage), para saber de qué campaña viene cada lead. */
export function getUtm(): Record<string, string> | undefined {
  const KEY = 'depahost:utm'
  try {
    const params = new URLSearchParams(location.search)
    const fromUrl = Object.fromEntries(
      ['source', 'medium', 'campaign', 'term', 'content']
        .map((k) => [k, params.get(`utm_${k}`)?.slice(0, 200)] as const)
        .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
    )
    if (Object.keys(fromUrl).length) sessionStorage.setItem(KEY, JSON.stringify(fromUrl))
    const stored = sessionStorage.getItem(KEY)
    if (!stored) return undefined
    const parsed: unknown = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null) return undefined
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    )
  } catch {
    return undefined
  }
}

function clearErrors(form: HTMLFormElement) {
  form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((el) => {
    el.textContent = ''
    el.hidden = true
  })
  form.querySelectorAll('[aria-invalid="true"]').forEach((el) => {
    el.removeAttribute('aria-invalid')
  })
}

function showFieldErrors(form: HTMLFormElement, issues: NonNullable<ApiError['issues']>) {
  let first: HTMLElement | null = null
  for (const issue of issues) {
    const field = form.querySelector<HTMLElement>(`[name="${CSS.escape(issue.path)}"]`)
    const slot = form.querySelector<HTMLElement>(`[data-error-for="${CSS.escape(issue.path)}"]`)
    if (field) {
      field.setAttribute('aria-invalid', 'true')
      first ??= field
    }
    if (slot) {
      slot.textContent = issue.message
      slot.hidden = false
    }
  }
  first?.focus()
}

function setStatus(
  form: HTMLFormElement,
  kind: 'info' | 'error' | 'success',
  message: string,
  whatsapp?: string,
  linkLabel = DEFAULT_MESSAGES.whatsappLink,
) {
  const status = form.querySelector<HTMLElement>('[data-form-status]')
  if (!status) return
  status.dataset.kind = kind
  status.replaceChildren(message)
  if (whatsapp) {
    const link = document.createElement('a')
    link.href = whatsapp
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.textContent = linkLabel
    status.append(' ', link)
  }
  status.hidden = false
}

function resetCaptcha(form: HTMLFormElement) {
  const turnstile = (window as unknown as { turnstile?: { reset(el: Element): void } }).turnstile
  const widget = form.querySelector('.cf-turnstile')
  if (turnstile && widget) turnstile.reset(widget)
}

export function enhanceForm<P extends Json, T>(form: HTMLFormElement, options: EnhanceOptions<P, T>) {
  const messages = { ...DEFAULT_MESSAGES, ...options.messages }
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')

  // Un error inesperado llega al manejador global (y a Sentry si está activo)
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    submitForm().catch(reportError)
  })

  async function submitForm() {
    clearErrors(form)
    if (!form.reportValidity()) return

    const fields = formToObject(form)
    const whatsapp = waLink(options.whatsappMessage(fields))

    if (!apiConfigured) {
      setStatus(form, 'info', messages.noApi, whatsapp, messages.whatsappLink)
      return
    }

    submit?.setAttribute('aria-busy', 'true')
    if (submit) submit.disabled = true
    setStatus(form, 'info', messages.sending)

    try {
      const { data, error, response } = await options.send(options.buildPayload(fields))
      if (data !== undefined && response?.ok) {
        // Quita el "Enviando…": cada formulario muestra su propio resultado
        const status = form.querySelector<HTMLElement>('[data-form-status]')
        if (status) status.hidden = true
        options.onSuccess(data, form)
        return
      }
      if (response?.status === 429) setStatus(form, 'error', messages.tooMany)
      else if (error?.issues?.length) {
        showFieldErrors(form, error.issues)
        setStatus(form, 'error', messages.invalid)
      } else
        setStatus(form, 'error', error?.message ?? messages.networkError, whatsapp, messages.whatsappLink)
      resetCaptcha(form)
    } catch {
      setStatus(form, 'error', messages.networkError, whatsapp, messages.whatsappLink)
      resetCaptcha(form)
    } finally {
      submit?.removeAttribute('aria-busy')
      if (submit) submit.disabled = false
    }
  }
}

export { setStatus as showFormStatus }
