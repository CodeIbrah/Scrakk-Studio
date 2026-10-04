// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `list_directory`.
 *
 * La salida cruda de la tool trae emojis (📁/📄). Acá se parsea a una lista con
 * los proicons de carpeta/archivo, agrupando nombre + carpeta.
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

interface DirectoryEntry {
  path: string
  isDir: boolean
}

/** Parsea las líneas `📁 path` / `📄 path` del resultado (sin emojis). */
function parseEntries(result?: string): DirectoryEntry[] {
  if (!result) return []
  const entries: DirectoryEntry[] = []
  for (const raw of result.split('\n')) {
    const match = /^(📁|📄)\s+(.+)$/.exec(raw.trim())
    if (!match) continue
    entries.push({ path: match[2].trim(), isDir: match[1] === '📁' })
  }
  return entries
}

function split(path: string): { name: string; dir: string } {
  const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '')
  const index = normalized.lastIndexOf('/')
  if (index < 0) return { name: normalized, dir: '' }
  return { name: normalized.slice(index + 1), dir: normalized.slice(0, index) }
}

export function ListDirectoryModal({ args, result, status }: ToolModalContext): JSX.Element {
  const path = typeof args.path === 'string' && args.path ? args.path : './'
  const entries = parseEntries(result)

  if (entries.length === 0) {
    return (
      <ToolModalSection title={path}>
        <ToolModalEmpty>{result ?? t('chat.tool.sin.salida')}</ToolModalEmpty>
      </ToolModalSection>
    )
  }

  const folders = entries.filter((entry) => entry.isDir).length

  return (
    <>
      <ToolModalMeta
        items={[
          { label: t('chat.tool.ruta'), value: path },
          {
            label: t('chat.tool.contenido'),
            value: `${entries.length} · ${folders} ${t('chat.tool.carpetas')}`
          }
        ]}
      />
      <ToolModalSection>
        <ToolModalList>
          {entries.map((entry) => {
            const { name, dir } = split(entry.path)
            return (
              <ToolModalRow
                key={entry.path}
                icon={entry.isDir ? 'folder' : 'file'}
                title={name}
                detail={dir || undefined}
                monospace
                tone={status === 'error' ? 'danger' : 'default'}
              />
            )
          })}
        </ToolModalList>
      </ToolModalSection>
    </>
  )
}
