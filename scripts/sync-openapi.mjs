// Copia el contrato de la API a openapi/depahost-api.json y regenera los tipos.
//   pnpm api:sync                         → desde ../depahost-api/openapi.json (repos lado a lado)
//   OPENAPI_URL=https://api.depahostperu.com/openapi.json pnpm api:sync   → desde la API publicada
import { execSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'

const target = new URL('../openapi/depahost-api.json', import.meta.url)
const source = process.env.OPENAPI_URL

const spec = source
  ? await (await fetch(source)).text()
  : await readFile(new URL('../../depahost-api/openapi.json', import.meta.url), 'utf8')

JSON.parse(spec) // falla aquí si no es JSON válido
await writeFile(target, spec)
console.log(`Contrato copiado desde ${source ?? '../depahost-api/openapi.json'}`)
execSync('pnpm api:types', { stdio: 'inherit' })
