/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config'

// getViteConfig permite que los tests importen módulos de Astro (astro:env, etc.)
export default getViteConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
})
