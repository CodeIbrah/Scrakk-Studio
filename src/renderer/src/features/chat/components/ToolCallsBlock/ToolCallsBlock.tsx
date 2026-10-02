// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * ToolCallsBlock — renders a list of tool calls from an assistant message.
 *
 * Resuelve el meta de cada tool desde el registry (label, íconos, si es
 * expandible, renderBody custom, modo plain) — la UI usa la configuración
 * real de cada tool, no defaults.
 */

import type { JSX } from 'react'
import { memo } from 'react'
import { ToolCallShell, ToolCallIcon, type ToolCallExecution } from '@services/ai/tool-shell'
import type { ToolCallInfo, ToolResultInfo, ToolCallStatusType } from '@services/chat/types'
import { registry } from '@services/ai/tools'
import { sessionIdForToolCall } from '@services/ai/agents'
import { openToolResultModal } from './ToolResultModal'
import styles from './ToolCallsBlock.module.css'

import { t } from '@core/i18n'

/** Argumentos del tool call (JSON de la IA; `{}` si viene a medias). */
function parseToolArgs(tc: ToolCallInfo): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(tc.function.arguments || '{}')
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

interface ToolCallsBlockProps {
  toolCalls: ToolCallInfo[]
  toolResults?: Record<string, ToolResultInfo>
  /** Overall status — 'running' while executing, 'success'/'error' after. */
  status?: ToolCallStatusType
}

export const ToolCallsBlock = memo(function ToolCallsBlock({
  toolCalls,
  toolResults,
  status = 'running'
}: ToolCallsBlockProps): JSX.Element {
  return (
    <div className={styles.block}>
      {toolCalls.map((tc) => {
        const resultInfo = toolResults?.[tc.id]
        const callStatus: ToolCallStatusType = resultInfo
          ? resultInfo.success ? 'success' : 'error'
          : status

        // Config real de la tool: label, expandible, renderBody, plain…
        const meta = registry.get(tc.function.name)?.meta

        // Las tools SIN visual propio son clickeables: abren su resultado en un
        // modal (mismo patrón que el subagente). Las que traen `renderBody`
        // (subagente, diffs…) ya tienen su propia interacción y no se tocan.
        const openable = !meta?.renderBody
        const openResult = openable
          ? () =>
              openToolResultModal({
                label: meta?.label ?? tc.function.name,
                args: parseToolArgs(tc),
                result: resultInfo?.content,
                status: callStatus
              })
          : undefined

        const execution: ToolCallExecution = {
          toolCall: tc,
          status: callStatus,
          result: resultInfo?.content,
          filePath: resultInfo?.filePath,
          originalContent: resultInfo?.originalContent,
          modifiedContent: resultInfo?.modifiedContent,
          runId: resultInfo?.runId ?? sessionIdForToolCall(tc.id),
          toolCallId: tc.id,
        }

        return openResult ? (
          <button
            key={tc.id}
            type="button"
            className={[styles.toolRow, styles.clickable].join(' ')}
            onClick={openResult}
            title={t('chat.tool.ver.resultado')}
          >
            <span className={styles.toolIconBox}>
              <ToolCallIcon toolName={tc.function.name} icon={meta?.icon} size={13} />
            </span>
            <div className={styles.toolVisual}>
              <ToolCallShell execution={execution} meta={meta} />
            </div>
          </button>
        ) : (
          <div key={tc.id} className={styles.toolRow}>
            <span className={styles.toolIconBox}>
              <ToolCallIcon toolName={tc.function.name} icon={meta?.icon} size={13} />
            </span>
            <div className={styles.toolVisual}>
              <ToolCallShell execution={execution} meta={meta} />
            </div>
          </div>
        )
      })}
    </div>
  )
})
