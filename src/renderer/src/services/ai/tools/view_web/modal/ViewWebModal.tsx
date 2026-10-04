// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `view_web`: la URL pedida y el aviso que dejó la tool.
 */

import type { JSX } from 'react'
import {
  ToolModalEmpty,
  ToolModalMeta,
  ToolModalSection,
  ToolModalText,
  type ToolModalContext
} from '@services/ai/tool-shell'
import { t } from '@core/i18n'

export function ViewWebModal({ args, result, status }: ToolModalContext): JSX.Element {
  const url = typeof args.url === 'string' ? args.url : ''
  const running = status === 'running' || status === 'streaming' || status === 'pending'

  return (
    <>
      <ToolModalMeta items={[{ label: t('chat.tool.url'), value: url || '—' }]} />
      <ToolModalSection>
        {result ? (
          <ToolModalText>{result}</ToolModalText>
        ) : (
          <ToolModalEmpty>
            {running ? t('chat.tool.todavia.corriendo') : t('chat.tool.sin.salida')}
          </ToolModalEmpty>
        )}
      </ToolModalSection>
    </>
  )
}
