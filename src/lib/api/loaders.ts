// Loaders de Astro Content Layer que leen de la API o, si no hay API configurada, de un JSON local.
// Corren en el build (Node), nunca en el navegador.
//
//   API_URL vacío   → src/content/*.json   (desarrollo, demo, CI)
//   API_URL con URL → GET {API_URL}/v1/...  (producción). Si la API falla, el build falla:
//                     preferimos no publicar a publicar datos viejos o de ejemplo.
import type { Loader, LoaderContext } from 'astro/loaders'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

interface HybridLoaderOptions {
  name: string
  /** Ruta del JSON local, relativa a la raíz del proyecto. Debe ser un arreglo de objetos con "id". */
  localFile: string
  apiUrl?: string
  /** Trae los items desde la API y los devuelve ya con la forma del esquema de la colección. */
  fetchRemote: (apiUrl: string) => Promise<Array<Record<string, unknown> & { id: string }>>
}

export function hybridLoader(options: HybridLoaderOptions): Loader {
  return {
    name: options.name,
    async load(context) {
      if (options.apiUrl) {
        context.logger.info(`Cargando desde la API ${options.apiUrl}`)
        const items = await options.fetchRemote(options.apiUrl.replace(/\/$/, ''))
        await fill(context, items)
        return
      }

      const root = fileURLToPath(context.config.root)
      const absolute = path.join(root, options.localFile)
      const loadLocal = async () => {
        const items = JSON.parse(await readFile(absolute, 'utf8'))
        if (!Array.isArray(items)) throw new Error(`${options.localFile} debe ser un arreglo`)
        await fill(context, items, options.localFile)
      }
      await loadLocal()

      // En desarrollo, recarga al editar el JSON
      context.watcher?.add(absolute)
      context.watcher?.on('change', async (changed) => {
        if (changed === absolute) await loadLocal()
      })
    },
  }
}

async function fill(context: LoaderContext, items: Array<Record<string, unknown>>, filePath?: string) {
  context.store.clear()
  for (const item of items) {
    const id = String(item.id)
    // filePath permite que image() resuelva rutas relativas al JSON
    const data = await context.parseData({ id, data: item, filePath })
    context.store.set({ id, data, filePath, digest: context.generateDigest(data) })
  }
}

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`GET ${url} respondió ${response.status}`)
  return (await response.json()) as T
}
