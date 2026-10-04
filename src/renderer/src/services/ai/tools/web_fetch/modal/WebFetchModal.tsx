// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `web_fetch`: la página traída como markdown + su URL.
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

export function WebFetchModal({ args, result, status }: ToolModalContext): JSX.Element {
  const url = typeof args.url === 'string' ? args.url : ''
  const running = status === 'running' || status === 'streaming' || status === 'pending'

  if (!result) {
    return (
      <ToolModalSection title={url || undefined}>
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
          { label: t('chat.tool.url'), value: url || '—' },
          { label: t('chat.tool.contenido'), value: `${result.length}` }
        ]}
      />
      <ToolModalSection title={t('chat.tool.contenido')}>
        <ToolModalCode>{result}</ToolModalCode>
      </ToolModalSection>
    </>
  )
}
