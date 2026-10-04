// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `list_browser_tabs`: el aviso que dejó la tool (la
 * lista real vive en el panel de browser).
 */

import type { JSX } from 'react'
import {
  ToolModalEmpty,
  ToolModalSection,
  ToolModalText,
  type ToolModalContext
} from '@services/ai/tool-shell'
import { t } from '@core/i18n'

export function BrowserTabsModal({ result, status }: ToolModalContext): JSX.Element {
  const running = status === 'running' || status === 'streaming' || status === 'pending'
  return (
    <ToolModalSection>
      {result ? (
        <ToolModalText>{result}</ToolModalText>
      ) : (
        <ToolModalEmpty>
          {running ? t('chat.tool.todavia.corriendo') : t('chat.tool.sin.salida')}
        </ToolModalEmpty>
      )}
    </ToolModalSection>
  )
}
