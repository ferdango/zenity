/** Validaciones de los formularios de registro. Devuelven el mensaje de error o null. */

const NAME = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateName(value: string, field: 'nombres' | 'apellidos'): string | null {
  const v = value.trim()
  if (!v) return field === 'nombres' ? 'Ingresa tus nombres' : 'Ingresa tus apellidos'
  if (v.length < 2) return 'Debe tener al menos 2 letras'
  if (!NAME.test(v)) return 'Usa solo letras y espacios'
  return null
}

/** Edad cumplida a la fecha de hoy a partir de "AAAA-MM-DD". */
export function ageFrom(iso: string, today = new Date()): number {
  const [y, m, d] = iso.split('-').map(Number)
  let age = today.getFullYear() - y
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1
  return age
}

export function validateBirthdate(value: string): string | null {
  if (!value) return 'Ingresa tu fecha de nacimiento'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00`).getTime())) return 'Fecha inválida'
  const age = ageFrom(value)
  if (age < 18) return 'Debes ser mayor de 18 años'
  if (age > 110) return 'Revisa el año de nacimiento'
  return null
}

/** DNI peruano: 8 dígitos. */
export function validateDni(value: string): string | null {
  if (!value) return 'Ingresa tu número de DNI'
  if (!/^\d{8}$/.test(value)) return 'El DNI tiene 8 dígitos'
  return null
}

export function validateEmail(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Ingresa tu correo electrónico'
  if (!EMAIL.test(v)) return 'Ingresa un correo válido, por ejemplo nombre@empresa.com'
  return null
}

/** Celular peruano: 9 dígitos que empiezan con 9 (sin el +51). */
export function validatePhone(digits: string): string | null {
  if (!digits) return 'Ingresa tu número de celular'
  if (!/^9\d{8}$/.test(digits)) return 'Debe tener 9 dígitos y empezar con 9'
  return null
}

export function formatPhone(digits: string): string {
  return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim()
}

export function validateAddress(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Ingresa tu dirección'
  if (v.length < 6) return 'Escribe la dirección completa (calle, número y distrito)'
  return null
}

export function validateCompanyName(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Ingresa la razón social'
  if (v.length < 3) return 'La razón social es muy corta'
  return null
}

/** Dígito verificador del RUC (módulo 11 de SUNAT). */
export function rucCheckDigit(first10: string): number {
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const sum = [...first10].reduce((acc, ch, i) => acc + Number(ch) * weights[i], 0)
  const digit = 11 - (sum % 11)
  return digit === 10 ? 0 : digit === 11 ? 1 : digit
}

export function validateRuc(value: string): string | null {
  if (!value) return 'Ingresa el RUC de tu empresa'
  if (!/^\d{11}$/.test(value)) return 'El RUC tiene 11 dígitos'
  if (!/^(10|15|16|17|20)/.test(value)) return 'El RUC debe empezar con 10, 15, 16, 17 o 20'
  if (rucCheckDigit(value.slice(0, 10)) !== Number(value[10])) return 'RUC inválido: revisa los dígitos'
  return null
}

/** "12500" → "12,500" (solo enteros, para montos en soles). */
export function formatAmountInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 9)
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function parseAmount(formatted: string): number {
  return Number(formatted.replace(/,/g, '')) || 0
}

export function validateIncome(formatted: string): string | null {
  const amount = parseAmount(formatted)
  if (!amount) return 'Ingresa el ingreso mínimo mensual'
  if (amount < 100) return 'El monto mínimo es S/ 100'
  return null
}
