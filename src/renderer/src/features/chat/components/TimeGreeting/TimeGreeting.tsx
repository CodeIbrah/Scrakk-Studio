// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

import { useEffect, useState, type JSX } from 'react'
import { useLocale } from '@core/i18n'
import { getTimeSlot, pickGreeting } from './greetings'
import styles from './TimeGreeting.module.css'

/**
 * Saludo horario del estado vacío (arriba del input).
 * Se elige una frase de la franja actual (madrugada/mañana/tarde/noche);
 * el intervalo revisa cada minuto y re-elige si la franja cambió.
 */
export function TimeGreeting(): JSX.Element {
  const locale = useLocale()
  const [greeting, setGreeting] = useState(() => pickGreeting(new Date().getHours()))

  // Al cambiar de idioma se re-elige la frase en el idioma nuevo.
  useEffect(() => {
    setGreeting(pickGreeting(new Date().getHours()))
  }, [locale])

  useEffect(() => {
    let currentSlot = getTimeSlot(new Date().getHours())
    const check = (): void => {
      const nextSlot = getTimeSlot(new Date().getHours())
      if (nextSlot !== currentSlot) {
        currentSlot = nextSlot
        setGreeting(pickGreeting(new Date().getHours()))
      }
    }
    const timer = window.setInterval(check, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return <p className={styles.greeting}>{greeting}</p>
}
