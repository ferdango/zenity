/**
 * Consultas simuladas a RENIEC (DNI) y SUNAT (RUC) para el prototipo.
 * No hay red: los datos se generan a partir del número, así que el mismo documento
 * siempre devuelve la misma persona o empresa. Las respuestas tienen la forma que
 * tendría la de un servicio real, para poder reemplazar estas funciones por una API.
 */

export interface ReniecPerson {
  dni: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  /** AAAA-MM-DD */
  fechaNacimiento: string
  /** Calle y número */
  domicilio: string
  distrito: string
}

export interface Activity {
  ciiu: string
  descripcion: string
}

export interface SunatCompany {
  ruc: string
  razonSocial: string
  nombreComercial: string | null
  tipoContribuyente: string
  estado: string
  condicion: string
  domicilioFiscal: string
  /** Distrito, provincia y departamento */
  ubigeo: string
  /** AAAA-MM-DD */
  fechaInscripcion: string
  inicioActividades: string
  emisorElectronicoDesde: string
  actividadPrincipal: Activity
  actividadesSecundarias: Activity[]
  sistemaEmision: string
  sistemaContabilidad: string
  comercioExterior: string
  comprobantes: string[]
  trabajadores: number
}

export type Lookup<T> = { ok: true; data: T } | { ok: false; error: string }

type Rand = () => number

/** Generador pseudoaleatorio con semilla (FNV-1a + mulberry32). */
function seeded(text: string): Rand {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  let state = hash >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T>(rand: Rand, list: readonly T[]): T => list[Math.floor(rand() * list.length)]
const between = (rand: Rand, min: number, max: number) => min + Math.floor(rand() * (max - min + 1))
const pad = (n: number) => String(n).padStart(2, '0')
const isoDate = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

// ── Personas (RENIEC) ─────────────────────────────────────────

const MALE = ['Luis', 'Carlos', 'José', 'Juan', 'Jorge', 'Miguel', 'César', 'Víctor', 'Ricardo', 'Diego', 'Renzo', 'Gonzalo', 'Martín', 'Andrés', 'Alonso', 'Sebastián', 'Rodrigo', 'Daniel', 'Javier', 'Raúl']
const FEMALE = ['María', 'Rosa', 'Ana', 'Carmen', 'Lucía', 'Valeria', 'Camila', 'Daniela', 'Fiorella', 'Milagros', 'Gabriela', 'Andrea', 'Patricia', 'Claudia', 'Sofía', 'Ximena', 'Alessandra', 'Jimena', 'Paola', 'Mariana']
const MIDDLE_MALE = ['Alberto', 'Enrique', 'Antonio', 'Manuel', 'Eduardo', 'Fernando', 'Ignacio', 'Pablo', 'Rafael', 'Alonso']
const MIDDLE_FEMALE = ['Elena', 'Isabel', 'Fernanda', 'Lucía', 'Teresa', 'Alejandra', 'Victoria', 'Cecilia', 'Beatriz', 'Pilar']
const SURNAMES = [
  'Quispe', 'Flores', 'Sánchez', 'Rodríguez', 'García', 'Rojas', 'Mendoza', 'Huamán', 'Vásquez', 'Chávez',
  'Ramírez', 'Torres', 'Castillo', 'Gutiérrez', 'Díaz', 'Mamani', 'Salazar', 'Vargas', 'Paredes', 'Cárdenas',
  'Espinoza', 'Ríos', 'Ramos', 'Silva', 'Medina', 'Castro', 'Romero', 'Herrera', 'Zevallos', 'Valdivia',
  'Aguilar', 'Benavides', 'Gamarra', 'Palacios', 'Villanueva', 'León', 'Navarro', 'Ortiz', 'Cáceres', 'Delgado',
]

interface Place {
  distrito: string
  calles: string[]
}

const LIMA: Place[] = [
  { distrito: 'Miraflores', calles: ['Av. José Larco', 'Calle Schell', 'Av. Benavides', 'Calle Berlín', 'Av. Del Ejército'] },
  { distrito: 'San Isidro', calles: ['Av. Javier Prado Este', 'Calle Las Begonias', 'Av. Camino Real', 'Calle Los Laureles'] },
  { distrito: 'Santiago de Surco', calles: ['Av. Primavera', 'Av. Caminos del Inca', 'Jr. Monte Rosa', 'Av. El Polo'] },
  { distrito: 'San Borja', calles: ['Av. San Luis', 'Av. Aviación', 'Calle Las Artes Norte', 'Av. San Borja Sur'] },
  { distrito: 'Jesús María', calles: ['Av. Salaverry', 'Av. Brasil', 'Jr. Huiracocha', 'Av. Cuba'] },
  { distrito: 'Lince', calles: ['Av. Arequipa', 'Av. Petit Thouars', 'Jr. León Velarde', 'Av. César Vallejo'] },
  { distrito: 'Magdalena del Mar', calles: ['Av. Sucre', 'Jr. Bolognesi', 'Av. Javier Prado Oeste'] },
  { distrito: 'Pueblo Libre', calles: ['Av. Bolívar', 'Av. La Mar', 'Jr. Andrés Avelino Cáceres'] },
  { distrito: 'La Molina', calles: ['Av. La Fontana', 'Av. Raúl Ferrero', 'Calle Los Fresnos'] },
  { distrito: 'Barranco', calles: ['Av. Grau', 'Jr. Domeyer', 'Av. Pedro de Osma'] },
  { distrito: 'San Miguel', calles: ['Av. La Marina', 'Av. Universitaria', 'Jr. Cusco'] },
  { distrito: 'Los Olivos', calles: ['Av. Antúnez de Mayolo', 'Av. Carlos Izaguirre', 'Jr. Las Palmeras'] },
  { distrito: 'Cercado de Lima', calles: ['Jr. de la Unión', 'Jr. Huancavelica', 'Av. Tacna', 'Jr. Ica'] },
]

/** DNI que suelen escribirse "de prueba": RENIEC no los encuentra. */
function isPlaceholder(digits: string): boolean {
  return /^(\d)\1+$/.test(digits) || ['12345678', '87654321', '01234567'].includes(digits)
}

function personFrom(dni: string): ReniecPerson {
  const rand = seeded(`dni:${dni}`)
  const female = rand() < 0.5
  const first = pick(rand, female ? FEMALE : MALE)
  const middles = (female ? MIDDLE_FEMALE : MIDDLE_MALE).filter((name) => name !== first)
  const paterno = pick(rand, SURNAMES)
  const place = pick(rand, LIMA)
  return {
    dni,
    nombres: rand() < 0.7 ? `${first} ${pick(rand, middles)}` : first,
    apellidoPaterno: paterno,
    apellidoMaterno: pick(rand, SURNAMES.filter((surname) => surname !== paterno)),
    // Siempre mayor de edad (1962–2005)
    fechaNacimiento: isoDate(between(rand, 1962, 2005), between(rand, 1, 12), between(rand, 1, 28)),
    domicilio: `${pick(rand, place.calles)} ${between(rand, 100, 3400)}`,
    distrito: place.distrito,
  }
}

/** Consulta de DNI (RENIEC). */
export async function consultarDni(dni: string): Promise<Lookup<ReniecPerson>> {
  await wait(1100 + (Number(dni.slice(-2)) % 5) * 80)
  if (isPlaceholder(dni)) return { ok: false, error: 'No encontramos este DNI en RENIEC. Revisa el número.' }
  return { ok: true, data: personFrom(dni) }
}

// ── Empresas (SUNAT) ──────────────────────────────────────────

interface Sector {
  heads: string[]
  brand: (name: string) => string
  activity: Activity
  comercioExterior?: string
  guias?: boolean
}

const SECTORS: Sector[] = [
  {
    heads: ['Comercializadora', 'Distribuidora', 'Importaciones'],
    brand: (name) => `${name} Market`,
    activity: { ciiu: '4690', descripcion: 'Venta al por mayor no especializada' },
    comercioExterior: 'Importador',
    guias: true,
  },
  {
    heads: ['Confecciones', 'Textiles', 'Industria Textil'],
    brand: (name) => `${name} Moda`,
    activity: { ciiu: '1410', descripcion: 'Fabricación de prendas de vestir, excepto prendas de piel' },
  },
  {
    heads: ['Transportes', 'Servicios Logísticos', 'Operadora Logística'],
    brand: (name) => `${name} Cargo`,
    activity: { ciiu: '5229', descripcion: 'Otras actividades de apoyo al transporte' },
    guias: true,
  },
  {
    heads: ['Inversiones Gastronómicas', 'Restaurantes', 'Corporación Gastronómica'],
    brand: (name) => `Cocina ${name}`,
    activity: { ciiu: '5610', descripcion: 'Actividades de restaurantes y de servicio móvil de comidas' },
  },
  {
    heads: ['Soluciones Tecnológicas', 'Software', 'Tecnologías Digitales'],
    brand: (name) => `${name} Labs`,
    activity: { ciiu: '6201', descripcion: 'Actividades de programación informática' },
  },
  {
    heads: ['Constructora', 'Edificaciones', 'Inmobiliaria y Constructora'],
    brand: (name) => `${name} Obras`,
    activity: { ciiu: '4100', descripcion: 'Construcción de edificios' },
    guias: true,
  },
  {
    heads: ['Agroexportadora', 'Agrícola', 'Agroindustrias'],
    brand: (name) => `${name} Fruits`,
    activity: { ciiu: '0122', descripcion: 'Cultivo de frutas tropicales y subtropicales' },
    comercioExterior: 'Exportador',
    guias: true,
  },
  {
    heads: ['Boticas', 'Distribuidora Farmacéutica', 'Droguería'],
    brand: (name) => `Farma ${name}`,
    activity: { ciiu: '4772', descripcion: 'Venta al por menor de productos farmacéuticos y médicos' },
  },
  {
    heads: ['Inmobiliaria', 'Inversiones Inmobiliarias', 'Desarrollos Urbanos'],
    brand: (name) => `${name} Homes`,
    activity: { ciiu: '6810', descripcion: 'Actividades inmobiliarias con bienes propios o arrendados' },
  },
  {
    heads: ['Centro de Estudios', 'Corporación Educativa', 'Academia'],
    brand: (name) => `${name} Academy`,
    activity: { ciiu: '8549', descripcion: 'Otros tipos de enseñanza n.c.p.' },
  },
]

const BRANDS = [
  { name: 'Los Andes', short: 'Andes' },
  { name: 'del Pacífico', short: 'Pacífico' },
  { name: 'Santa Rosa', short: 'Santa Rosa' },
  { name: 'San Martín', short: 'San Martín' },
  { name: 'del Sur', short: 'Sur' },
  { name: 'Altamar', short: 'Altamar' },
  { name: 'Costa Verde', short: 'Costa Verde' },
  { name: 'Amazonía', short: 'Amazonía' },
  { name: 'Huascarán', short: 'Huascarán' },
  { name: 'Misti', short: 'Misti' },
  { name: 'Paracas', short: 'Paracas' },
  { name: 'Inti', short: 'Inti' },
  { name: 'Kallpa', short: 'Kallpa' },
  { name: 'Chavín', short: 'Chavín' },
  { name: 'Nazca', short: 'Nazca' },
]

const FORMS = [
  { suffix: 'S.A.C.', tipo: 'Sociedad anónima cerrada', weight: 0.55 },
  { suffix: 'E.I.R.L.', tipo: 'Empresa individual de responsabilidad limitada', weight: 0.2 },
  { suffix: 'S.R.L.', tipo: 'Sociedad comercial de responsabilidad limitada', weight: 0.15 },
  { suffix: 'S.A.', tipo: 'Sociedad anónima', weight: 0.1 },
]

const SECONDARY: Activity[] = [
  { ciiu: '4610', descripcion: 'Venta al por mayor a cambio de una retribución o por contrata' },
  { ciiu: '7020', descripcion: 'Actividades de consultoría de gestión' },
  { ciiu: '4791', descripcion: 'Venta al por menor por correo y por Internet' },
  { ciiu: '7310', descripcion: 'Publicidad' },
  { ciiu: '8299', descripcion: 'Otras actividades de servicios de apoyo a las empresas n.c.p.' },
]

const REGIONS: { departamento: string; provincia: string; places: Place[] }[] = [
  { departamento: 'Lima', provincia: 'Lima', places: LIMA },
  {
    departamento: 'Arequipa',
    provincia: 'Arequipa',
    places: [
      { distrito: 'Yanahuara', calles: ['Av. Ejército', 'Calle Misti', 'Av. Emmel'] },
      { distrito: 'Cayma', calles: ['Av. Cayma', 'Av. Bolognesi'] },
    ],
  },
  {
    departamento: 'La Libertad',
    provincia: 'Trujillo',
    places: [
      { distrito: 'Trujillo', calles: ['Av. España', 'Jr. Pizarro', 'Jr. Independencia'] },
      { distrito: 'Víctor Larco Herrera', calles: ['Av. Larco', 'Av. Húsares de Junín'] },
    ],
  },
  { departamento: 'Piura', provincia: 'Piura', places: [{ distrito: 'Piura', calles: ['Av. Grau', 'Av. Sánchez Cerro'] }] },
  { departamento: 'Cusco', provincia: 'Cusco', places: [{ distrito: 'Wanchaq', calles: ['Av. de la Cultura', 'Av. Garcilaso'] }] },
  { departamento: 'Lambayeque', provincia: 'Chiclayo', places: [{ distrito: 'Chiclayo', calles: ['Av. Balta', 'Av. Salaverry'] }] },
]

/** Negocios típicos de una persona natural (RUC 10); null = servicios profesionales. */
const SMALL_BUSINESSES: { prefix: string | null; activity: Activity }[] = [
  {
    prefix: 'Bodega',
    activity: { ciiu: '4711', descripcion: 'Venta al por menor en comercios no especializados con predominio de alimentos y bebidas' },
  },
  {
    prefix: 'Minimarket',
    activity: { ciiu: '4711', descripcion: 'Venta al por menor en comercios no especializados con predominio de alimentos y bebidas' },
  },
  { prefix: 'Librería', activity: { ciiu: '4761', descripcion: 'Venta al por menor de libros, periódicos y artículos de papelería' } },
  { prefix: 'Ferretería', activity: { ciiu: '4752', descripcion: 'Venta al por menor de artículos de ferretería, pinturas y vidrio' } },
  { prefix: 'Taller', activity: { ciiu: '4520', descripcion: 'Mantenimiento y reparación de vehículos automotores' } },
  { prefix: null, activity: { ciiu: '7490', descripcion: 'Otras actividades profesionales, científicas y técnicas n.c.p.' } },
]

/** Año aproximado de inscripción según la numeración del RUC 20 (los más nuevos empiezan con 206…). */
function inscriptionYear(ruc: string): number {
  const n = Math.max(100, Number(ruc.slice(2, 5)))
  const year = n < 500 ? 1993 + ((n - 100) / 400) * 17 : n < 600 ? 2010 + ((n - 500) / 100) * 6 : 2016 + (n - 600) * 0.8
  return Math.min(2025, Math.floor(year))
}

function electronicSince(rand: Rand, inscripcion: string): string {
  const year = Math.max(Number(inscripcion.slice(0, 4)), 2016) + between(rand, 0, 3)
  const date = isoDate(Math.min(year, 2024), between(rand, 1, 12), 1)
  return date < inscripcion ? addDays(inscripcion, 30) : date
}

function pickForm(rand: Rand) {
  let roll = rand()
  for (const form of FORMS) {
    roll -= form.weight
    if (roll < 0) return form
  }
  return FORMS[0]
}

function companyFrom(ruc: string): SunatCompany {
  const rand = seeded(`ruc:${ruc}`)
  const sector = pick(rand, SECTORS)
  const brand = pick(rand, BRANDS)
  const form = pickForm(rand)
  const region = rand() < 0.7 ? REGIONS[0] : pick(rand, REGIONS.slice(1))
  const place = pick(rand, region.places)
  const fechaInscripcion = isoDate(inscriptionYear(ruc), between(rand, 1, 12), between(rand, 1, 28))
  const office = rand() < 0.4 ? ` Of. ${between(rand, 2, 12)}0${between(rand, 1, 9)}` : ''
  const comprobantes = ['Factura', 'Boleta de venta', 'Nota de crédito']
  if (rand() < 0.5) comprobantes.push('Nota de débito')
  if (sector.guias) comprobantes.push('Guía de remisión')
  const secondary = SECONDARY.filter(() => rand() < 0.3).slice(0, 2)
  return {
    ruc,
    razonSocial: `${pick(rand, sector.heads)} ${brand.name} ${form.suffix}`,
    nombreComercial: rand() < 0.75 ? sector.brand(brand.short) : null,
    tipoContribuyente: form.tipo,
    estado: 'Activo',
    condicion: 'Habido',
    domicilioFiscal: `${pick(rand, place.calles)} ${between(rand, 100, 3400)}${office}`,
    ubigeo: `${place.distrito}, ${region.provincia}, ${region.departamento}`,
    fechaInscripcion,
    inicioActividades: addDays(fechaInscripcion, between(rand, 0, 45)),
    emisorElectronicoDesde: electronicSince(rand, fechaInscripcion),
    actividadPrincipal: sector.activity,
    actividadesSecundarias: secondary,
    sistemaEmision: rand() < 0.8 ? 'Computarizado' : 'Manual/Computarizado',
    sistemaContabilidad: 'Computarizado',
    comercioExterior: sector.comercioExterior && rand() < 0.8 ? sector.comercioExterior : 'Sin actividad',
    comprobantes,
    trabajadores: Math.round(2 + rand() ** 2 * (form.suffix === 'E.I.R.L.' ? 25 : 180)),
  }
}

/** RUC 10 (DNI dentro del RUC), 15, 16 o 17: persona natural con negocio. */
function naturalPersonBusiness(ruc: string): SunatCompany {
  const owner = personFrom(ruc.startsWith('10') ? ruc.slice(2, 10) : `ruc${ruc}`)
  const rand = seeded(`ruc:${ruc}`)
  const business = pick(rand, SMALL_BUSINESSES)
  const firstName = owner.nombres.split(' ')[0]
  const birthYear = Number(owner.fechaNacimiento.slice(0, 4))
  const fechaInscripcion = isoDate(between(rand, Math.min(birthYear + 20, 2024), 2024), between(rand, 1, 12), between(rand, 1, 28))
  return {
    ruc,
    razonSocial: `${owner.apellidoPaterno} ${owner.apellidoMaterno} ${owner.nombres}`,
    nombreComercial: business.prefix ? `${business.prefix} ${firstName}` : null,
    tipoContribuyente: 'Persona natural con negocio',
    estado: 'Activo',
    condicion: 'Habido',
    domicilioFiscal: owner.domicilio,
    ubigeo: `${owner.distrito}, Lima, Lima`,
    fechaInscripcion,
    inicioActividades: addDays(fechaInscripcion, between(rand, 0, 30)),
    emisorElectronicoDesde: electronicSince(rand, fechaInscripcion),
    actividadPrincipal: business.activity,
    actividadesSecundarias: [],
    sistemaEmision: 'Computarizado',
    sistemaContabilidad: 'Manual/Computarizado',
    comercioExterior: 'Sin actividad',
    comprobantes: business.prefix ? ['Boleta de venta', 'Factura'] : ['Recibo por honorarios', 'Factura'],
    trabajadores: business.prefix ? between(rand, 0, 4) : 0,
  }
}

/** Consulta RUC (SUNAT). El RUC ya debe tener formato y dígito verificador válidos. */
export async function consultarRuc(ruc: string): Promise<Lookup<SunatCompany>> {
  await wait(1300 + (Number(ruc.slice(-2)) % 5) * 90)
  const body = ruc.slice(2, 10)
  if (/^(\d)\1+$/.test(body) || (ruc.startsWith('10') && isPlaceholder(body))) {
    return { ok: false, error: 'No encontramos este RUC en SUNAT. Revisa el número.' }
  }
  return { ok: true, data: ruc.startsWith('20') ? companyFrom(ruc) : naturalPersonBusiness(ruc) }
}
