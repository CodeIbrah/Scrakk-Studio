// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Saludos horarios del estado vacío.
 * 152 frases reales, naturales y coloquiales, repartidas en 4 franjas:
 * madrugada (0-6), mañana (6-12), tarde (12-18) y noche (18-24).
 * Español neutro (tuteo), sin regionalismos.
 * El marcador `{name}` se reemplaza por un nombre (hoy: "amigo").
 */

import { t, type MessageKey } from '@core/i18n'

export type TimeSlot = 'madrugada' | 'manana' | 'tarde' | 'noche'

const NAME_FALLBACK = 'amigo'

const MADRUGADA: MessageKey[] = [
  'greetings.madrugada.0',
  'greetings.madrugada.1',
  'greetings.madrugada.2',
  'greetings.madrugada.3',
  'greetings.madrugada.4',
  'greetings.madrugada.5',
  'greetings.madrugada.6',
  'greetings.madrugada.7',
  'greetings.madrugada.8',
  'greetings.madrugada.9',
  'greetings.madrugada.10',
  'greetings.madrugada.11',
  'greetings.madrugada.12',
  'greetings.madrugada.13',
  'greetings.madrugada.14',
  'greetings.madrugada.15',
  'greetings.madrugada.16',
  'greetings.madrugada.17',
  'greetings.madrugada.18',
  'greetings.madrugada.19',
  'greetings.madrugada.20',
  'greetings.madrugada.21',
  'greetings.madrugada.22',
  'greetings.madrugada.23',
  'greetings.madrugada.24',
  'greetings.madrugada.25',
  'greetings.madrugada.26',
  'greetings.madrugada.27',
  'greetings.madrugada.28',
  'greetings.madrugada.29',
  'greetings.madrugada.30',
  'greetings.madrugada.31',
  'greetings.madrugada.32',
  'greetings.madrugada.33',
  'greetings.madrugada.34',
  'greetings.madrugada.35',
  'greetings.madrugada.36',
  'greetings.madrugada.37'
]

const MANANA: MessageKey[] = [
  'greetings.manana.0',
  'greetings.manana.1',
  'greetings.manana.2',
  'greetings.manana.3',
  'greetings.manana.4',
  'greetings.manana.5',
  'greetings.manana.6',
  'greetings.manana.7',
  'greetings.manana.8',
  'greetings.manana.9',
  'greetings.manana.10',
  'greetings.manana.11',
  'greetings.manana.12',
  'greetings.manana.13',
  'greetings.manana.14',
  'greetings.manana.15',
  'greetings.manana.16',
  'greetings.manana.17',
  'greetings.manana.18',
  'greetings.manana.19',
  'greetings.manana.20',
  'greetings.manana.21',
  'greetings.manana.22',
  'greetings.manana.23',
  'greetings.manana.24',
  'greetings.manana.25',
  'greetings.manana.26',
  'greetings.manana.27',
  'greetings.manana.28',
  'greetings.manana.29',
  'greetings.manana.30',
  'greetings.manana.31',
  'greetings.manana.32',
  'greetings.manana.33',
  'greetings.manana.34',
  'greetings.manana.35',
  'greetings.manana.36',
  'greetings.manana.37'
]

const TARDE: MessageKey[] = [
  'greetings.tarde.0',
  'greetings.tarde.1',
  'greetings.tarde.2',
  'greetings.tarde.3',
  'greetings.tarde.4',
  'greetings.tarde.5',
  'greetings.tarde.6',
  'greetings.tarde.7',
  'greetings.tarde.8',
  'greetings.tarde.9',
  'greetings.tarde.10',
  'greetings.tarde.11',
  'greetings.tarde.12',
  'greetings.tarde.13',
  'greetings.tarde.14',
  'greetings.tarde.15',
  'greetings.tarde.16',
  'greetings.tarde.17',
  'greetings.tarde.18',
  'greetings.tarde.19',
  'greetings.tarde.20',
  'greetings.tarde.21',
  'greetings.tarde.22',
  'greetings.tarde.23',
  'greetings.tarde.24',
  'greetings.tarde.25',
  'greetings.tarde.26',
  'greetings.tarde.27',
  'greetings.tarde.28',
  'greetings.tarde.29',
  'greetings.tarde.30',
  'greetings.tarde.31',
  'greetings.tarde.32',
  'greetings.tarde.33',
  'greetings.tarde.34',
  'greetings.tarde.35',
  'greetings.tarde.36',
  'greetings.tarde.37'
]

const NOCHE: MessageKey[] = [
  'greetings.noche.0',
  'greetings.noche.1',
  'greetings.noche.2',
  'greetings.noche.3',
  'greetings.noche.4',
  'greetings.noche.5',
  'greetings.noche.6',
  'greetings.noche.7',
  'greetings.noche.8',
  'greetings.noche.9',
  'greetings.noche.10',
  'greetings.noche.11',
  'greetings.noche.12',
  'greetings.noche.13',
  'greetings.noche.14',
  'greetings.noche.15',
  'greetings.noche.16',
  'greetings.noche.17',
  'greetings.noche.18',
  'greetings.noche.19',
  'greetings.noche.20',
  'greetings.noche.21',
  'greetings.noche.22',
  'greetings.noche.23',
  'greetings.noche.24',
  'greetings.noche.25',
  'greetings.noche.26',
  'greetings.noche.27',
  'greetings.noche.28',
  'greetings.noche.29',
  'greetings.noche.30',
  'greetings.noche.31',
  'greetings.noche.32',
  'greetings.noche.33',
  'greetings.noche.34',
  'greetings.noche.35',
  'greetings.noche.36',
  'greetings.noche.37'
]

interface TimeSlotConfig {
  slot: TimeSlot
  from: number
  to: number
  greetings: MessageKey[]
}

const SLOTS: TimeSlotConfig[] = [
  { slot: 'madrugada', from: 0, to: 6, greetings: MADRUGADA },
  { slot: 'manana', from: 6, to: 12, greetings: MANANA },
  { slot: 'tarde', from: 12, to: 18, greetings: TARDE },
  { slot: 'noche', from: 18, to: 24, greetings: NOCHE }
]

/** Franja horaria según la hora del sistema (0-23). */
export function getTimeSlot(hour: number): TimeSlot {
  const config = SLOTS.find((item) => hour >= item.from && hour < item.to)
  return (config ?? SLOTS[0]).slot
}

/** Elige una frase al azar de la franja correspondiente a la hora. */
export function pickGreeting(hour: number): string {
  const config = SLOTS.find((item) => hour >= item.from && hour < item.to) ?? SLOTS[0]
  const greetings = config.greetings
  const phrase = greetings[Math.floor(Math.random() * greetings.length)] ?? greetings[0]
  return t(phrase, { name: NAME_FALLBACK })
}
