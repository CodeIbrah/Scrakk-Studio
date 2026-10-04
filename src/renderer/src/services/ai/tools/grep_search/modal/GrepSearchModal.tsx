// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `grep_search`: los matches agrupados por archivo, con
 * su número de línea.
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

interface GrepMatch {
  file: string
  line: number
  content: string
}

function parseMatches(result?: string): GrepMatch[] {
  if (!result) return []
  try {
    const parsed = JSON.parse(result) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((raw) => raw as { file?: string; line?: number; content?: string })
      .filter((raw) => typeof raw.file === 'string')
      .map((raw) => ({
        file: raw.file as string,
        line: typeof raw.line === 'number' ? raw.line : 0,
        content: typeof raw.content === 'string' ? raw.content : ''
      }))
  } catch {
    return []
  }
}

export function GrepSearchModal({ args, result, status }: ToolModalContext): JSX.Element {
  const query = typeof args.query === 'string' ? args.query : ''
  const running = status === 'running' || status === 'streaming' || status === 'pending'
  if (running && !result) {
    return <ToolModalEmpty>{t('chat.tool.todavia.corriendo')}</ToolModalEmpty>
  }

  const matches = parseMatches(result)
  if (matches.length === 0) {
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

  const groups = new Map<string, GrepMatch[]>()
  for (const match of matches) {
    const list = groups.get(match.file)
    if (list) list.push(match)
    else groups.set(match.file, [match])
  }

  return (
    <>
      <ToolModalMeta
        items={[
          { label: t('chat.tool.consulta'), value: query || '—' },
          { label: t('chat.tool.resultados'), value: String(matches.length) }
        ]}
      />
      {[...groups.entries()].map(([file, items]) => (
        <ToolModalSection key={file} title={file}>
          <ToolModalList>
            {items.map((match, index) => (
              <ToolModalRow
                key={`${match.line}-${index}`}
                icon="clipboard-search"
                title={match.content.trim() || '—'}
                meta={String(match.line)}
                monospace
              />
            ))}
          </ToolModalList>
        </ToolModalSection>
      ))}
    </>
  )
}
