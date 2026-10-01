// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Archivos del chat social — cliente de la Edge Function `social-file`.
 *
 * La app NO tiene credenciales de R2: todo pasa por la función, que valida
 * JWT + autoría + límites + cupo. Acá solo se firma la request con el token de
 * la cuenta y se devuelve lo que la función responde.
 */

import { getClientFor } from '../supabaseClient'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../account/config'
import type { DirectMessage } from '@shared/social'

import { t } from '@shared/i18n'

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/social-file`

export interface CodeFileUpload {
  name: string
  lang: string
  content: string
  replyTo?: string | null
}

/**
 * El INSERT del mensaje lo hace la Edge Function (así la cuota y el rate limit
 * de la DB aplican): acá solo llega el mensaje ya creado.
 */
export interface CodeFileUploadResult {
  message: DirectMessage
}

interface CallResult<T> {
  ok: boolean
  data?: T
  error?: string
}

/** Token de la cuenta (la función valida ese JWT). */
async function accountToken(accountId: string): Promise<string | null> {
  const client = await getClientFor(accountId)
  if (!client) return null
  const { data } = await client.auth.getSession()
  return data.session?.access_token ?? null
}

async function call<T>(accountId: string, body: Record<string, unknown>): Promise<CallResult<T>> {
  const token = await accountToken(accountId)
  if (!token) return { ok: false, error: t('main.cuenta.no.encontrada-2') }

  let res: Response
  try {
    res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify(body)
    })
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }

  const text = await res.text()
  let parsed: unknown = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = null
  }
  if (!res.ok) {
    const message = (parsed as { error?: string } | null)?.error ?? `Error ${res.status}`
    return { ok: false, error: message }
  }
  return { ok: true, data: parsed as T }
}

/** Sube el contenido: la función valida, sube a R2 e inserta el mensaje. */
export function uploadCodeFile(
  accountId: string,
  peerId: string,
  file: CodeFileUpload
): Promise<CallResult<CodeFileUploadResult>> {
  return call<CodeFileUploadResult>(accountId, { action: 'upload', peerId, ...file })
}

/** URL firmada (TTL corto) para que el receptor baje el contenido. */
export function codeFileSignedUrl(
  accountId: string,
  messageId: string
): Promise<CallResult<{ url: string; expiresIn: number }>> {
  return call(accountId, { action: 'url', messageId })
}

/** Borra el objeto en R2 (libera cupo). */
export function deleteCodeFileObject(
  accountId: string,
  messageId: string
): Promise<CallResult<{ ok: boolean }>> {
  return call(accountId, { action: 'delete', messageId })
}
