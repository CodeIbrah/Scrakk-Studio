// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `skill`: el cuerpo (markdown) de la skill cargada.
 */

import type { JSX } from 'react'
import {
  ToolModalCode,
  ToolModalEmpty,
  ToolModalMeta,
  ToolModalSection,
  type ToolModalContext
} from '@services/ai/tool-shell'
import { t } from '@core/i18n'

export function SkillModal({ args, result, status }: ToolModalContext): JSX.Element {
  const name = typeof args.name === 'string' ? args.name : ''
  const running = status === 'running' || status === 'streaming' || status === 'pending'

  if (!result) {
    return (
      <ToolModalSection title={name || undefined}>
        <ToolModalEmpty>
          {running ? t('chat.tool.todavia.corriendo') : t('chat.tool.sin.salida')}
        </ToolModalEmpty>
      </ToolModalSection>
    )
  }

  return (
    <>
      <ToolModalMeta
        items={[
          { label: t('chat.tool.habilidades'), value: name || '—' },
          { label: t('chat.tool.lineas'), value: String(result.split('\n').length) }
        ]}
      />
      <ToolModalSection title={t('chat.tool.contenido')}>
        <ToolModalCode>{result}</ToolModalCode>
      </ToolModalSection>
    </>
  )
}
