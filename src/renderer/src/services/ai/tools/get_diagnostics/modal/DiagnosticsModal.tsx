// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `get_diagnostics`: los diagnósticos por archivo.
 */

import type { JSX } from 'react'
import {
  ToolModalEmpty,
  ToolModalList,
  ToolModalMeta,
  ToolModalRow,
  ToolModalSection,
  type ToolModalContext
} from '@services/ai/tool-shell'
import { t } from '@core/i18n'

interface FileDiagnostics {
  path: string
  messages: string[]
}

function parseDiagnostics(result?: string): FileDiagnostics[] {
  if (!result) return []
  try {
    const parsed = JSON.parse(result) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return []
    return Object.entries(parsed as Record<string, unknown>)
      .map(([path, value]) => ({
        path,
        messages: Array.isArray(value) ? value.map((item) => String(item)) : []
      }))
      .filter((entry) => entry.messages.length > 0)
  } catch {
    return []
  }
}

export function DiagnosticsModal({ args, result, status }: ToolModalContext): JSX.Element {
  const paths = Array.isArray(args.paths) ? args.paths.map(String) : []
  const running = status === 'running' || status === 'streaming' || status === 'pending'
  if (running && !result) {
    return <ToolModalEmpty>{t('chat.tool.todavia.corriendo')}</ToolModalEmpty>
  }

  const files = parseDiagnostics(result)
  const total = files.reduce((sum, file) => sum + file.messages.length, 0)

  if (total === 0) {
    const raw = result?.trim() ?? ''
    const looksJson = raw.startsWith('{') || raw.startsWith('[')
    return (
      <>
        <ToolModalMeta
          items={[{ label: t('chat.tool.archivos'), value: String(paths.length) }]}
        />
        <ToolModalEmpty>
          {raw && !looksJson ? raw : t('chat.tool.sin.resultados')}
        </ToolModalEmpty>
      </>
    )
  }

  return (
    <>
      <ToolModalMeta
        items={[
          { label: t('chat.tool.resultados'), value: String(total) },
          { label: t('chat.tool.archivos'), value: String(files.length) }
        ]}
      />
      {files.map((file) => (
        <ToolModalSection key={file.path} title={file.path}>
          <ToolModalList>
            {file.messages.map((message, index) => (
              <ToolModalRow key={index} icon="alert" title={message} tone="danger" />
            ))}
          </ToolModalList>
        </ToolModalSection>
      ))}
    </>
  )
}
