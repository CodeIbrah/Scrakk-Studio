// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `adjust_timeout`: los segundos que se extendió.
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

export function TimeoutModal({ args, result, status }: ToolModalContext): JSX.Element {
  const seconds = Number(args.additional_seconds ?? 0)
  const running = status === 'running' || status === 'streaming' || status === 'pending'

  return (
    <>
      <ToolModalMeta
        items={[{ label: t('chat.tool.estado'), value: `${seconds}s` }]}
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
