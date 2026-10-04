// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `file_search`: los archivos/carpetas encontrados.
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

interface SearchResult {
  path: string
  name: string
  isDirectory: boolean
}

function parseResults(result?: string): SearchResult[] {
  if (!result) return []
  try {
    const parsed = JSON.parse(result) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((raw) => raw as { path?: string; name?: string; isDirectory?: boolean })
      .filter((raw) => typeof raw.path === 'string')
      .map((raw) => ({
        path: raw.path as string,
        name: typeof raw.name === 'string' ? raw.name : ((raw.path as string).split('/').pop() ?? ''),
        isDirectory: raw.isDirectory === true
      }))
  } catch {
    return []
  }
}

export function FileSearchModal({ args, result, status }: ToolModalContext): JSX.Element {
  const query = typeof args.query === 'string' ? args.query : ''
  const running = status === 'running' || status === 'streaming' || status === 'pending'
  if (running && !result) {
    return <ToolModalEmpty>{t('chat.tool.todavia.corriendo')}</ToolModalEmpty>
  }

  const results = parseResults(result)
  if (results.length === 0) {
    const raw = result?.trim() ?? ''
    const looksJson = raw.startsWith('[') || raw.startsWith('{')
    return (
      <>
        <ToolModalMeta items={[{ label: t('chat.tool.consulta'), value: query || '—' }]} />
        {raw && !looksJson ? (
          <ToolModalEmpty>{raw}</ToolModalEmpty>
        ) : (
          <ToolModalEmpty>{t('chat.tool.sin.resultados')}</ToolModalEmpty>
        )}
      </>
    )
  }

  return (
    <>
      <ToolModalMeta
        items={[
          { label: t('chat.tool.consulta'), value: query || '—' },
          { label: t('chat.tool.resultados'), value: String(results.length) }
        ]}
      />
      <ToolModalSection>
        <ToolModalList>
          {results.map((entry) => (
            <ToolModalRow
              key={entry.path}
              icon={entry.isDirectory ? 'folder' : 'file'}
              title={entry.name || entry.path}
              detail={entry.path}
              monospace
            />
          ))}
        </ToolModalList>
      </ToolModalSection>
    </>
  )
}
