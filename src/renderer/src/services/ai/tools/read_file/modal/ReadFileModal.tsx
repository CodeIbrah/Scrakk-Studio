// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `read_file`.
 *
 * La tool devuelve un JSON con el contenido + metadata (líneas, fin de línea,
 * BOM, warnings). Acá se muestra esa metadata en filas y el contenido en un
 * bloque monoespaciado.
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

interface ReadFilePayload {
  path?: string
  content?: string
  total_lines?: number
  original_line_ending?: string
  had_bom?: boolean
  normalization_warnings?: string[]
}

function parsePayload(result?: string): ReadFilePayload | null {
  if (!result) return null
  try {
    const parsed = JSON.parse(result) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as ReadFilePayload
  } catch {
    return null
  }
}

export function ReadFileModal({ args, result, status }: ToolModalContext): JSX.Element {
  const running = status === 'running' || status === 'streaming' || status === 'pending'
  if (running && !result) {
    return <ToolModalEmpty>{t('chat.tool.todavia.corriendo')}</ToolModalEmpty>
  }

  const path = typeof args.path === 'string' ? args.path : ''
  const payload = parsePayload(result)

  // Error de la tool o salida no-JSON: se vuelca tal cual.
  if (!payload || typeof payload.content !== 'string') {
    return (
      <ToolModalSection title={path || undefined}>
        <ToolModalCode>{result ?? t('chat.tool.sin.salida')}</ToolModalCode>
      </ToolModalSection>
    )
  }

  const warnings = Array.isArray(payload.normalization_warnings)
    ? payload.normalization_warnings
    : []
  const lines =
    typeof payload.total_lines === 'number'
      ? payload.total_lines
      : payload.content
        ? payload.content.split('\n').length
        : 0

  return (
    <>
      <ToolModalMeta
        items={[
          { label: t('chat.tool.ruta'), value: path || payload.path || '' },
          { label: t('chat.tool.lineas'), value: String(lines) },
          ...(payload.original_line_ending
            ? [{ label: t('chat.tool.estado'), value: payload.original_line_ending }]
            : []),
          ...(warnings.length > 0
            ? [{ label: t('chat.tool.detalles'), value: warnings.join(' · ') }]
            : [])
        ]}
      />
      <ToolModalSection title={t('chat.tool.contenido')}>
        <ToolModalCode>{payload.content}</ToolModalCode>
      </ToolModalSection>
    </>
  )
}
