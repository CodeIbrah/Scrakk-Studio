// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `move_file`: origen → destino.
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

export function MoveFileModal({ args, result, status }: ToolModalContext): JSX.Element {
  const source = typeof args.source === 'string' ? args.source : ''
  const destination = typeof args.destination === 'string' ? args.destination : ''
  const running = status === 'running' || status === 'streaming' || status === 'pending'

  return (
    <>
      <ToolModalMeta
        items={[
          { label: t('chat.tool.origen'), value: source || '—' },
          { label: t('chat.tool.destino'), value: destination || '—' }
        ]}
      />
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
