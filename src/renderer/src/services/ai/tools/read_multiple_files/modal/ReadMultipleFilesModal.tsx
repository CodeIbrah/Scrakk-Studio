// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `read_multiple_files`.
 *
 * La tool devuelve un mapa `{ ruta: { success, content?, error? } }`. Acá se
 * muestra una sección por archivo con su contenido (o el error).
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

interface FileEntry {
  path: string
  success: boolean
  content?: string
  error?: string
}

function parseEntries(result?: string): FileEntry[] {
  if (!result) return []
  try {
    const parsed = JSON.parse(result) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return []
    return Object.entries(parsed as Record<string, unknown>).map(([path, value]) => {
      const entry = (value ?? {}) as { success?: boolean; content?: string; error?: string }
      return {
        path,
        success: entry.success === true,
        content: typeof entry.content === 'string' ? entry.content : undefined,
        error: typeof entry.error === 'string' ? entry.error : undefined
      }
    })
  } catch {
    return []
  }
}

export function ReadMultipleFilesModal({ result, status }: ToolModalContext): JSX.Element {
  const running = status === 'running' || status === 'streaming' || status === 'pending'
  if (running && !result) {
    return <ToolModalEmpty>{t('chat.tool.todavia.corriendo')}</ToolModalEmpty>
  }

  const entries = parseEntries(result)
  if (entries.length === 0) {
    return <ToolModalCode>{result ?? t('chat.tool.sin.salida')}</ToolModalCode>
  }

  const ok = entries.filter((entry) => entry.success).length

  return (
    <>
      <ToolModalMeta
        items={[
          {
            label: t('chat.tool.archivos'),
            value: `${entries.length} · ${ok} ok`
          }
        ]}
      />
      {entries.map((entry) => (
        <ToolModalSection key={entry.path} title={entry.path}>
          {entry.success ? (
            <ToolModalCode>{entry.content ?? ''}</ToolModalCode>
          ) : (
            <ToolModalEmpty>{entry.error ?? t('chat.tool.sin.salida')}</ToolModalEmpty>
          )}
        </ToolModalSection>
      ))}
    </>
  )
}
