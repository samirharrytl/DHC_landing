import type { CollectionEntry } from 'astro:content'

export type Property = CollectionEntry<'properties'>['data']
export type PropertyImage = Property['images'][number]
export type FinancingAssumptions = CollectionEntry<'financing'>['data']
export type Developer = CollectionEntry<'developers'>['data']
