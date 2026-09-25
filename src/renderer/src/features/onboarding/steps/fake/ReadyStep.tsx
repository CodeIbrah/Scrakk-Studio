// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Paso 6 — Listo. FAKE: solo UI (lee las elecciones del wizard; no toca
 * servicios).
 *
 * Reúne lo elegido y deja volver a cualquier paso con "Cambiar" (usa
 * `openStep`, no un índice hardcodeado). Separa lo que YA se aplicó de lo
 * que es vista previa, para no vender humo.
 */

import type { JSX } from 'react'
import type { StepContext } from '../../types'
import { PreviewNote, SectionLabel, Stack, SummaryRow } from '../kit'

import { t } from '@core/i18n'
/** Pasos revisables desde el resumen (id + etiqueta + qué mostrar si no eligió). */
const REVIEW: { stepId: string; label: string; fallback: string }[] = [
  { stepId: 'theme', get label() { return t('onboarding.apariencia') }, get fallback() { return t('onboarding.sin.cambios') } },
  { stepId: 'privacy', get label() { return t('onboarding.privacidad') }, get fallback() { return t('onboarding.sin.responder') } },
  { stepId: 'keymap', get label() { return t('onboarding.atajos') }, get fallback() { return t('onboarding.sin.elegir') } }
]

/** Ids de los pasos que aplican de verdad (el resto es vista previa). */
const REAL_STEP_IDS = new Set(['theme', 'privacy'])

export function ReadyStep({ choices, openStep }: StepContext): JSX.Element {
  const applied = REVIEW.filter((item) => REAL_STEP_IDS.has(item.stepId))

  return (
    <Stack gap={4}>
      <Stack gap={3}>
        <SectionLabel>{t('onboarding.lo.que.elegiste')}</SectionLabel>
        <Stack gap={2}>
          {REVIEW.map((item) => (
            <SummaryRow
              key={item.stepId}
              label={item.label}
              value={choices[item.stepId] ?? item.fallback}
              onAction={() => openStep(item.stepId)}
            />
          ))}
        </Stack>
      </Stack>

      <PreviewNote>
        {applied.length > 0
          ? t('onboarding.apariencia.y.privacidad.ya.quedaron')
          : t('onboarding.todo.lo.de.arriba.es')}
      </PreviewNote>
    </Stack>
  )
}
