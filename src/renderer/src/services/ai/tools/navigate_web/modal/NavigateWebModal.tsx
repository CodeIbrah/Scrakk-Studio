// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `navigate_web`: la acción disparada y su target.
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

export function NavigateWebModal({ args, result, status }: ToolModalContext): JSX.Element {
  const action = typeof args.action === 'string' ? args.action : ''
  const target = typeof args.target === 'string' ? args.target : ''
  const running = status === 'running' || status === 'streaming' || status === 'pending'

  return (
    <>
      <ToolModalMeta
        items={[
          { label: t('chat.tool.operacion'), value: action || '—' },
          ...(target ? [{ label: t('chat.tool.destino'), value: target }] : [])
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
