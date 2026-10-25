// Puntos de referencia para "Cerca de" en Todos los inmuebles (/capital/inmuebles).
// Coordenadas de OpenStreetMap (Nominatim), con 5 decimales (~1 m). Los distritos usan un punto
// central aproximado: sirve para ordenar por cercanía cuando un inmueble todavía no tiene su ubicación exacta.

export interface Lugar {
  slug: string
  name: string
  lat: number
  lng: number
}

export interface CentroDistrito extends Lugar {
  /** Otros slugs con los que el panel puede haber creado el distrito ("magdalena", "surco") */
  aliases?: string[]
}

export const LUGARES: { group: string; places: Lugar[] }[] = [
  {
    group: 'Zonas y centros comerciales',
    places: [
      { slug: 'parque-kennedy', name: 'Parque Kennedy (Miraflores)', lat: -12.12178, lng: -77.03042 },
      { slug: 'larcomar', name: 'Larcomar (Miraflores)', lat: -12.13222, lng: -77.03023 },
      {
        slug: 'centro-financiero-san-isidro',
        name: 'Centro financiero de San Isidro',
        lat: -12.09483,
        lng: -77.02539,
      },
      { slug: 'jockey-plaza', name: 'Jockey Plaza (Surco)', lat: -12.0862, lng: -76.97538 },
      {
        slug: 'real-plaza-salaverry',
        name: 'Real Plaza Salaverry (Jesús María)',
        lat: -12.08988,
        lng: -77.05272,
      },
      { slug: 'plaza-san-miguel', name: 'Plaza San Miguel', lat: -12.07694, lng: -77.08272 },
      { slug: 'plaza-mayor-lima', name: 'Plaza Mayor de Lima', lat: -12.04594, lng: -77.03057 },
      { slug: 'estadio-nacional', name: 'Estadio Nacional', lat: -12.06707, lng: -77.03387 },
      { slug: 'gamarra', name: 'Gamarra (La Victoria)', lat: -12.06528, lng: -77.01238 },
      { slug: 'megaplaza', name: 'MegaPlaza (Independencia)', lat: -11.99459, lng: -77.06312 },
      { slug: 'aeropuerto', name: 'Aeropuerto Jorge Chávez', lat: -12.01943, lng: -77.11941 },
    ],
  },
  {
    group: 'Universidades',
    places: [
      { slug: 'universidad-de-lima', name: 'Universidad de Lima', lat: -12.08553, lng: -76.9707 },
      { slug: 'pucp', name: 'PUCP (San Miguel)', lat: -12.06917, lng: -77.07993 },
      { slug: 'universidad-del-pacifico', name: 'Universidad del Pacífico', lat: -12.08388, lng: -77.04832 },
      { slug: 'upc-monterrico', name: 'UPC Monterrico', lat: -12.10403, lng: -76.96297 },
      { slug: 'san-marcos', name: 'Universidad San Marcos', lat: -12.0565, lng: -77.0845 },
      { slug: 'uni', name: 'UNI', lat: -12.02038, lng: -77.04817 },
      { slug: 'utec', name: 'UTEC (Barranco)', lat: -12.13514, lng: -77.02213 },
      { slug: 'usil', name: 'USIL (La Molina)', lat: -12.07281, lng: -76.95386 },
    ],
  },
]

/** Lima Metropolitana y Callao. El slug es el que arma el API con el nombre del distrito. */
export const DISTRITOS: CentroDistrito[] = [
  { slug: 'ancon', name: 'Ancón', lat: -11.69678, lng: -77.11161 },
  { slug: 'ate', name: 'Ate', lat: -12.03873, lng: -76.89687, aliases: ['ate-vitarte'] },
  { slug: 'barranco', name: 'Barranco', lat: -12.14396, lng: -77.02027 },
  { slug: 'brena', name: 'Breña', lat: -12.0597, lng: -77.05012 },
  { slug: 'callao', name: 'Callao', lat: -12.048, lng: -77.122 },
  { slug: 'carabayllo', name: 'Carabayllo', lat: -11.79499, lng: -76.98929 },
  { slug: 'chorrillos', name: 'Chorrillos', lat: -12.19235, lng: -77.00896 },
  { slug: 'cieneguilla', name: 'Cieneguilla', lat: -12.07317, lng: -76.77707 },
  { slug: 'comas', name: 'Comas', lat: -11.93286, lng: -77.04067 },
  { slug: 'el-agustino', name: 'El Agustino', lat: -12.04205, lng: -76.99571 },
  { slug: 'independencia', name: 'Independencia', lat: -11.98931, lng: -77.04732 },
  { slug: 'jesus-maria', name: 'Jesús María', lat: -12.07819, lng: -77.0464 },
  { slug: 'la-molina', name: 'La Molina', lat: -12.0901, lng: -76.92268 },
  { slug: 'la-perla', name: 'La Perla', lat: -12.0716, lng: -77.11739 },
  { slug: 'la-victoria', name: 'La Victoria', lat: -12.07399, lng: -77.0182 },
  {
    slug: 'lima-cercado',
    name: 'Lima Cercado',
    lat: -12.05,
    lng: -77.042,
    aliases: ['cercado-de-lima', 'lima'],
  },
  { slug: 'lince', name: 'Lince', lat: -12.0853, lng: -77.03699 },
  { slug: 'los-olivos', name: 'Los Olivos', lat: -11.96599, lng: -77.07307 },
  { slug: 'lurin', name: 'Lurín', lat: -12.23817, lng: -76.78389 },
  {
    slug: 'magdalena-del-mar',
    name: 'Magdalena del Mar',
    lat: -12.09571,
    lng: -77.06822,
    aliases: ['magdalena'],
  },
  { slug: 'miraflores', name: 'Miraflores', lat: -12.1215, lng: -77.02591 },
  { slug: 'pueblo-libre', name: 'Pueblo Libre', lat: -12.07664, lng: -77.06786 },
  { slug: 'puente-piedra', name: 'Puente Piedra', lat: -11.87677, lng: -77.07467 },
  { slug: 'rimac', name: 'Rímac', lat: -12.0203, lng: -77.03546 },
  { slug: 'san-borja', name: 'San Borja', lat: -12.09645, lng: -76.99569 },
  { slug: 'san-isidro', name: 'San Isidro', lat: -12.0979, lng: -77.03537 },
  {
    slug: 'san-juan-de-lurigancho',
    name: 'San Juan de Lurigancho',
    lat: -11.94875,
    lng: -76.97791,
    aliases: ['sjl'],
  },
  {
    slug: 'san-juan-de-miraflores',
    name: 'San Juan de Miraflores',
    lat: -12.15539,
    lng: -76.97244,
    aliases: ['sjm'],
  },
  { slug: 'san-luis', name: 'San Luis', lat: -12.07236, lng: -76.99589 },
  {
    slug: 'san-martin-de-porres',
    name: 'San Martín de Porres',
    lat: -11.98783,
    lng: -77.09826,
    aliases: ['smp'],
  },
  { slug: 'san-miguel', name: 'San Miguel', lat: -12.07911, lng: -77.09479 },
  { slug: 'santa-anita', name: 'Santa Anita', lat: -12.04327, lng: -76.96195 },
  { slug: 'santiago-de-surco', name: 'Santiago de Surco', lat: -12.1251, lng: -76.98216, aliases: ['surco'] },
  { slug: 'surquillo', name: 'Surquillo', lat: -12.1142, lng: -77.0105 },
  { slug: 'villa-el-salvador', name: 'Villa El Salvador', lat: -12.21689, lng: -76.94915 },
  { slug: 'villa-maria-del-triunfo', name: 'Villa María del Triunfo', lat: -12.17664, lng: -76.91897 },
]
