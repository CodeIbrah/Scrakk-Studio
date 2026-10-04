// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `execute_command`: comando, exit code y salida.
 */

import type { JSX } from 'react'
import {
  ToolModalBadge,
  ToolModalCode,
  ToolModalEmpty,
  ToolModalMeta,
  ToolModalSection,
  type ToolModalContext
} from '@services/ai/tool-shell'
import { t } from '@core/i18n'

interface TerminalPayload {
  command?: string
  output?: string
  exitCode?: number
  timedOut?: boolean
}

function parsePayload(result?: string): TerminalPayload | null {
  if (!result) return null
  try {
    const parsed = JSON.parse(result) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as TerminalPayload
  } catch {
    return null
  }
}

export function ExecuteCommandModal({ args, result, status }: ToolModalContext): JSX.Element {
  const running = status === 'running' || status === 'streaming' || status === 'pending'
  if (running && !result) {
    return <ToolModalEmpty>{t('chat.tool.todavia.corriendo')}</ToolModalEmpty>
  }

  const payload = parsePayload(result)
  const command =
    payload?.command ?? (typeof args.command === 'string' ? args.command : '')
  const output = typeof payload?.output === 'string' ? payload.output : result ?? ''
  const exitCode = typeof payload?.exitCode === 'number' ? payload.exitCode : undefined

  const statusChip =
    exitCode !== undefined ? (
      <ToolModalBadge tone={exitCode === 0 ? 'success' : 'danger'}>{`exit ${exitCode}`}</ToolModalBadge>
    ) : null
  const timeoutChip = payload?.timedOut ? (
    <ToolModalBadge tone="danger">{t('chat.tool.tiempo.agotado')}</ToolModalBadge>
  ) : null

  return (
    <>
      <ToolModalMeta
        items={[
          { label: t('chat.tool.comando'), value: command || '—' },
          {
            label: t('chat.tool.estado'),
            value:
              statusChip || timeoutChip ? (
                <>
                  {statusChip}
                  {statusChip && timeoutChip ? ' ' : null}
                  {timeoutChip}
                </>
              ) : (
                t('chat.tool.listo')
              )
          }
        ]}
      />
      <ToolModalSection title={t('chat.tool.salida')}>
        <ToolModalCode>{output || t('chat.tool.sin.salida')}</ToolModalCode>
      </ToolModalSection>
    </>
  )
}
