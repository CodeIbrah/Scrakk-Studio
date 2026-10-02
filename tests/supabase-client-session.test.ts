// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache License 2.0.
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Sesión del cliente Supabase por cuenta.
 *
 * Regresión del bug que dejó el chat inutilizable DESPUÉS de un login exitoso:
 * `getClientFor` cachea el cliente por cuenta, y el login guardaba tokens
 * nuevos sin tocar ese cache. Se seguía usando el cliente previo (sin sesión →
 * rol `anon`, que no tiene NINGÚN grant sobre `messages`), así que cada INSERT
 * moría con 42501 `permission denied for table messages`.
 *
 * En los logs de Postgres se veía así:
 *   sesión nueva           2026-10-02 01:26:42.718
 *   refresh token nuevo    2026-10-02 01:26:42.731  (revoked: false)
 *   INSERT rechazado       2026-10-02 01:26:47.002  ← 5s después, ya logueado
 */

import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

const src = (rel: string): string =>
  readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')

const CLIENT = 'src/main/supabaseClient.ts'
const ACCOUNT = 'src/main/account/service.ts'

describe('cliente por cuenta — la sesión no puede quedar desfasada', () => {
  it('getClientFor verifica la sesión antes de entregar el cliente', () => {
    const code = src(CLIENT)
    expect(code).toContain('ensureSession(client, accountId)')
    // Y el helper inyecta los tokens GUARDADOS cuando no hay sesión en memoria.
    const helper = code.slice(code.indexOf('async function ensureSession'))
    expect(helper).toContain('client.auth.getSession()')
    expect(helper).toContain('client.auth.setSession(')
    expect(helper).toContain('account.accessToken')
  })

  it('el login invalida el cliente cacheado antes de usarlo', () => {
    const code = src(ACCOUNT)
    const login = code.slice(code.indexOf('export async function verifyCode'))
    const idxUpsert = login.indexOf('upsertAccount(')
    const idxForget = login.indexOf('forgetClient(userId)')
    const idxGet = login.indexOf('getClientFor(userId)')
    expect(idxUpsert).toBeGreaterThan(-1)
    expect(idxForget).toBeGreaterThan(idxUpsert)
    expect(idxGet).toBeGreaterThan(idxForget)
  })

  it('reconstruir un cliente NO cierra la sesión (no usa signOut)', () => {
    const code = src(CLIENT)
    const forget = code.slice(code.indexOf('export function forgetClient'))
    expect(forget.slice(0, 400)).not.toContain('signOut')
  })

  it('el error de 42501 no se traduce siempre como "amigos"', () => {
    const social = src('src/main/social/service.ts')
    expect(social).toContain('describeSendError')
    // El mensaje de amistad sólo puede salir si el texto habla de políticas, y
    // los fallos de infraestructura tienen su propio mensaje.
    const start = social.indexOf('export function describeSendError')
    const end = social.indexOf('export async function sendMessage', start)
    const fn = social.slice(start, end === -1 ? start + 3000 : end)
    expect(fn).toContain('row-level security')
    expect(fn).toContain('permission denied for function')
    expect(fn).toContain('error.interno.del.servidor')
  })
})