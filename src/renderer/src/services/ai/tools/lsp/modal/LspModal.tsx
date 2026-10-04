// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `lsp`.
 *
 * Muchas operaciones devuelven líneas `ruta:línea:columna`; esas se pintan
 * como lista con los proicons. El resto (hover, firmas, diagnósticos) va como
 * texto/bloque monoespaciado.
 */

import type { JSX } from 'react'
import {
  ToolModalCode,
  ToolModalEmpty,
  ToolModalList,
  ToolModalMeta,
  ToolModalRow,
  ToolModalSection,
  type ToolModalContext
} from '@services/ai/tool-shell'
import { t } from '@core/i18n'

interface Location {
  path: string
  line: number
  column: number
}

function parseLocations(result?: string): Location[] {
  if (!result) return []
  const locations: Location[] = []
  for (const raw of result.split('\n')) {
    const match = /^(.*):(\d+):(\d+)$/.exec(raw.trim())
    if (!match) continue
    locations.push({ path: match[1], line: Number(match[2]), column: Number(match[3]) })
  }
  return locations
}

export function LspModal({ args, result, status }: ToolModalContext): JSX.Element {
  const operation = typeof args.operation === 'string' ? args.operation : ''
  const filePath = typeof args.file_path === 'string' ? args.file_path : ''
  const running = status === 'running' || status === 'streaming' || status === 'pending'

  const meta = (
    <ToolModalMeta
      items={[
        { label: t('chat.tool.operacion'), value: operation || '—' },
        ...(filePath ? [{ label: t('chat.tool.ruta'), value: filePath }] : [])
      ]}
    />
  )

  if (running && !result) {
    return (
      <>
        {meta}
        <ToolModalEmpty>{t('chat.tool.todavia.corriendo')}</ToolModalEmpty>
      </>
    )
  }

  const locations = parseLocations(result)
  if (locations.length === 0) {
    return (
      <>
        {meta}
        <ToolModalSection title={t('chat.tool.resultados')}>
          <ToolModalCode>{result ?? t('chat.tool.sin.salida')}</ToolModalCode>
        </ToolModalSection>
      </>
    )
  }

  return (
    <>
      {meta}
      <ToolModalSection title={t('chat.tool.resultados')}>
        <ToolModalList>
          {locations.map((location, index) => (
            <ToolModalRow
              key={`${location.path}-${location.line}-${location.column}-${index}`}
              icon="server"
              title={location.path}
              meta={`${location.line}:${location.column}`}
              monospace
            />
          ))}
        </ToolModalList>
      </ToolModalSection>
    </>
  )
}
