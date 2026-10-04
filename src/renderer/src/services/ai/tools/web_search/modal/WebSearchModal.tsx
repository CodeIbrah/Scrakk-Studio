// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `web_search`.
 *
 * La tool devuelve texto con el formato `1. Título\n   url\n   snippet`. Acá
 * se parsea a una lista legible.
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

interface SearchHit {
  title: string
  url: string
  snippet: string
}

function parseResults(result?: string): SearchHit[] {
  if (!result) return []
  const hits: SearchHit[] = []
  for (const block of result.split(/\n{2,}/)) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const first = lines[0] ?? ''
    const match = /^\d+\.\s*(.+)$/.exec(first)
    if (!match) continue
    hits.push({
      title: match[1],
      url: lines[1] ?? '',
      snippet: lines.slice(2).join(' ')
    })
  }
  return hits
}

export function WebSearchModal({ args, result, status }: ToolModalContext): JSX.Element {
  const query = typeof args.query === 'string' ? args.query : ''
  const running = status === 'running' || status === 'streaming' || status === 'pending'
  if (running && !result) {
    return <ToolModalEmpty>{t('chat.tool.todavia.corriendo')}</ToolModalEmpty>
  }

  const hits = parseResults(result)
  if (hits.length === 0) {
    return (
      <>
        <ToolModalMeta items={[{ label: t('chat.tool.consulta'), value: query || '—' }]} />
        <ToolModalEmpty>{result?.trim() || t('chat.tool.sin.resultados')}</ToolModalEmpty>
      </>
    )
  }

  return (
    <>
      <ToolModalMeta
        items={[
          { label: t('chat.tool.consulta'), value: query || '—' },
          { label: t('chat.tool.resultados'), value: String(hits.length) }
        ]}
      />
      <ToolModalSection>
        <ToolModalList>
          {hits.map((hit, index) => (
            <ToolModalRow
              key={`${hit.url}-${index}`}
              icon="globe"
              title={hit.title}
              detail={hit.url + (hit.snippet ? ` — ${hit.snippet}` : '')}
            />
          ))}
        </ToolModalList>
      </ToolModalSection>
    </>
  )
}
