// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Sobre de un mensaje `codefile` — formato custom que el parser entiende.
 *
 * Un mensaje con `kind = 'codefile'` guarda en su `body` UNA sola línea JSON
 * con los metadatos del archivo compartido. El contenido NO viaja acá: vive en
 * R2 (bucket privado) y este sobre lleva la `key` para pedirlo.
 *
 * Por qué una línea JSON y no un fence con marcadores: el body puede contener
 * cualquier cosa si algún día se agrega un transporte inline, y un JSON de una
 * línea se parsea sin ambigüedad ni escaping. Hoy el contenido va SIEMPRE a
 * R2, así que el body es solo este sobre (~250 chars, entra en el cap de 4000
 * sin tocar el CHECK de la DB).
 *
 * Formato (v1):
 *   {"v":1,"kind":"codefile","name":"server.ts","lang":"typescript",
 *    "lines":184,"size":6231,"sha":"<hex>","key":"<r2>/<uuid>","expiresAt":"…"}
 */

import { SOCIAL_RULES } from './social'

/** Metadatos de un archivo compartido. */
export interface SocialCodeFile {
  /** Versión del sobre. Sube si cambia el formato (el decode es estricto). */
  v: 1
  kind: 'codefile'
  /** Nombre visible (basename). */
  name: string
  /** languageId (`detectLanguageFromPath`) — para el ícono y el parser. */
  lang: string
  /** Líneas del archivo (límite de UX + server-side). */
  lines: number
  /** Caracteres del contenido (límite server-side). */
  size: number
  /** sha256 hex del contenido — integridad al descargar. */
  sha: string
  /** Key del objeto en R2 (bucket privado `scrakk-chat-files`). */
  key: string
  /** ISO: cuándo lo borra el lifecycle de R2. */
  expiresAt: string
}

/** Límites denormalizados para el render (vienen de SOCIAL_RULES). */
export const CODE_FILE_LIMITS = {
  lines: SOCIAL_RULES.codeFileMaxLines,
  chars: SOCIAL_RULES.codeFileMaxChars,
  ttlDays: SOCIAL_RULES.codeFileTtlDays,
  perConversation: SOCIAL_RULES.codeFileQuotaPerConversation
} as const

/** Resultado de validar un contenido antes de compartirlo. */
export type CodeFileCheck = { ok: true; lines: number } | { ok: false; error: string }

/** Cuenta líneas de un texto (una cadena vacía tiene 0). */
export function countLines(content: string): number {
  if (content.length === 0) return 0
  let lines = 1
  for (let i = 0; i < content.length; i += 1) {
    if (content.charCodeAt(i) === 10) lines += 1
  }
  return lines
}

/**
 * Valida el contenido contra los límites (líneas y caracteres). Lo llama el
 * cliente para dar feedback inmediato y el server (Edge Function) para que un
 * cliente modificado no se salte nada.
 */
export function checkCodeFileContent(content: string): CodeFileCheck {
  const chars = content.length
  if (chars === 0) return { ok: false, error: 'El archivo está vacío.' }
  if (chars > CODE_FILE_LIMITS.chars) {
    return { ok: false, error: `El archivo supera los ${CODE_FILE_LIMITS.chars} caracteres.` }
  }
  const lines = countLines(content)
  if (lines > CODE_FILE_LIMITS.lines) {
    return { ok: false, error: `El archivo supera las ${CODE_FILE_LIMITS.lines} líneas.` }
  }
  return { ok: true, lines }
}

/** Serializa el sobre a una línea JSON (lo que va en `body`). */
export function encodeCodeFile(meta: SocialCodeFile): string {
  return JSON.stringify(meta)
}

/**
 * Decodifica el `body` de un mensaje `codefile`. Devuelve `null` si el sobre
 * está corrupto o no matchea la versión: el render cae a texto plano en vez de
 * romper.
 */
export function decodeCodeFile(body: string): SocialCodeFile | null {
  let raw: unknown
  try {
    raw = JSON.parse(body)
  } catch {
    return null
  }
  if (typeof raw !== 'object' || raw === null) return null
  const meta = raw as Record<string, unknown>

  if (meta.v !== 1) return null
  if (meta.kind !== 'codefile') return null
  if (typeof meta.name !== 'string' || meta.name.length === 0 || meta.name.length > 255) return null
  if (typeof meta.lang !== 'string' || meta.lang.length > 64) return null
  if (typeof meta.lines !== 'number' || !Number.isFinite(meta.lines) || meta.lines < 0) return null
  if (typeof meta.size !== 'number' || !Number.isFinite(meta.size) || meta.size < 0) return null
  if (typeof meta.sha !== 'string' || !/^[a-f0-9]{64}$/.test(meta.sha)) return null
  if (typeof meta.key !== 'string' || meta.key.length === 0 || meta.key.length > 512) return null
  if (meta.key.includes('..')) return null
  if (typeof meta.expiresAt !== 'string') return null

  return {
    v: 1,
    kind: 'codefile',
    name: meta.name,
    lang: meta.lang,
    lines: meta.lines,
    size: meta.size,
    sha: meta.sha,
    key: meta.key,
    expiresAt: meta.expiresAt
  }
}

/** ¿Vencido? (el lifecycle de R2 ya lo pudo borrar). */
export function isCodeFileExpired(meta: SocialCodeFile, now = Date.now()): boolean {
  const t = Date.parse(meta.expiresAt)
  return Number.isFinite(t) && t <= now
}

/** Días que le quedan (0 si vencido). */
export function codeFileDaysLeft(meta: SocialCodeFile, now = Date.now()): number {
  const t = Date.parse(meta.expiresAt)
  if (!Number.isFinite(t)) return 0
  return Math.max(0, Math.ceil((t - now) / 86_400_000))
}

/** Tamaño legible (para el header de la card). */
export function formatFileSize(chars: number): string {
  if (chars < 1024) return `${chars} B`
  if (chars < 1024 * 1024) return `${(chars / 1024).toFixed(1)} KB`
  return `${(chars / (1024 * 1024)).toFixed(1)} MB`
}
