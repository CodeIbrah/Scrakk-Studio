// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Cuerpo del modal de `read_file`.
 *
 * La tool devuelve un JSON con el contenido + metadata (líneas, fin de línea,
 * BOM, warnings). El contenido NO se vuelca como texto: se monta una sesión
 * de Innerta Engine AISLADA (mismo patrón que la card de archivo compartido del
 * panel Social), en **sólo lectura** — se lee, se selecciona y se copia, pero
 * no se edita. La metadata va en filas arriba.
 */

import { useEffect, useRef, type JSX } from 'react'
import type { EditorEngine } from '@features/editor/engine'
import {
  ToolModalCode,
  ToolModalEmpty,
  ToolModalMeta,
  ToolModalSection,
  type ToolModalContext
} from '@services/ai/tool-shell'
import { t } from '@core/i18n'
import styles from './ReadFileModal.module.css'

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
  const hostRef = useRef<HTMLDivElement | null>(null)

  const running = status === 'running' || status === 'streaming' || status === 'pending'
  const path = typeof args.path === 'string' ? args.path : ''
  const payload = parsePayload(result)
  const content = typeof payload?.content === 'string' ? payload.content : null

  // Sesión de Innerta AISLADA por modal (su WASM + canvas), en sólo lectura.
  // Import DINÁMICO: el motor (y su WASM) no se carga hasta abrir el modal, así
  // el barrel de tools no arrastra el editor.
  useEffect(() => {
    if (content === null) return undefined
    const host = hostRef.current
    if (!host) return undefined

    let cancelled = false
    let engine: EditorEngine | null = null
    let raf = 0

    void import('@features/editor/engine').then(({ createIsolatedEditorEngine }) => {
      if (cancelled) return
      engine = createIsolatedEditorEngine()
      engine.attach(host)
      engine.loadFile(path || 'archivo', content)
      // Sólo lectura: bloquea tipeo, borrado, pegado, cortado y undo/redo.
      engine.setReadOnly?.(true)
      // `loadFile` enfoca el canvas; acá no queremos robarle el foco al chat.
      raf = requestAnimationFrame(() => {
        host.querySelector<HTMLCanvasElement>('canvas')?.blur()
      })
    })

    return () => {
      cancelled = true
      if (raf) cancelAnimationFrame(raf)
      engine?.destroy?.()
    }
  }, [content, path])

  // Error de la tool o salida no-JSON: se vuelca tal cual.
  if (content === null) {
    if (running && !result) {
      return <ToolModalEmpty>{t('chat.tool.todavia.corriendo')}</ToolModalEmpty>
    }
    return (
      <ToolModalSection title={path || undefined}>
        <ToolModalCode>{result ?? t('chat.tool.sin.salida')}</ToolModalCode>
      </ToolModalSection>
    )
  }

  const warnings = Array.isArray(payload?.normalization_warnings)
    ? payload.normalization_warnings
    : []
  const lines =
    typeof payload?.total_lines === 'number'
      ? payload.total_lines
      : content.split('\n').length

  return (
    <>
      <ToolModalMeta
        items={[
          { label: t('chat.tool.ruta'), value: path || payload?.path || '' },
          { label: t('chat.tool.lineas'), value: String(lines) },
          ...(payload?.original_line_ending
            ? [{ label: t('chat.tool.estado'), value: payload.original_line_ending }]
            : []),
          ...(warnings.length > 0
            ? [{ label: t('chat.tool.detalles'), value: warnings.join(' · ') }]
            : [])
        ]}
      />
      <ToolModalSection title={t('chat.tool.contenido')} grow>
        <div ref={hostRef} className={styles.embed} />
      </ToolModalSection>
    </>
  )
}
