// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Errores del envío de mensajes.
 *
 * Regresión: `sendMessage` traducía CUALQUIER `42501` como "solo puedes
 * escribirle a tus amigos". Pero 42501 es `insufficient_privilege`, el código
 * genérico de falta de permiso: también salía cuando el request llegaba sin
 * JWT (token vencido / cliente firmado en vuelo), y ahí el mensaje era falso
 * — más encima decía "amigos" cuando la amistad sí existía, que fue
 * exactamente lo que pasó: 450 mensajes y 9 amistades intactos, y la app
 * diciendo que no podías escribirle a tu amigo.
 */

import { describe, it, expect } from 'vitest'
import {
  describeSendError,
  looksLikeMissingSession
} from '../src/main/social/service'

describe('looksLikeMissingSession', () => {
  it('detecta los textos de sesión ausente/vencida', () => {
    expect(looksLikeMissingSession('JWT expired')).toBe(true)
    expect(looksLikeMissingSession('Invalid JWT structure')).toBe(true)
    expect(looksLikeMissingSession('invalid claim: sub')).toBe(true)
    expect(looksLikeMissingSession('Auth session missing!')).toBe(true)
    expect(looksLikeMissingSession('No authorization header')).toBe(true)
  })

  it('NO confunde la RLS de amistad con falta de sesión', () => {
    expect(
      looksLikeMissingSession('new row violates row-level security policy for table "messages"')
    ).toBe(false)
    expect(looksLikeMissingSession('msg_ratelimited')).toBe(false)
    expect(looksLikeMissingSession(undefined)).toBe(false)
  })
})

describe('describeSendError', () => {
  it('el slowmode de la DB tiene su mensaje (no "amigos")', () => {
    expect(describeSendError('msg_ratelimited', '22023')).toBe('msg_ratelimited')
  })

  it('los guards de la DB se distinguen', () => {
    expect(describeSendError('reply_not_in_dm', '22023')).toMatch(/otro chat/)
    expect(describeSendError('messages_immutable', '42501')).toMatch(/no se puede modificar/)
    expect(describeSendError('not_sender', '42501')).toMatch(/editar/)
  })

  it('42501 de RLS de verdad SÍ dice "amigos"', () => {
    expect(
      describeSendError('new row violates row-level security policy for table "messages"', '42501')
    ).toMatch(/amigos/)
  })

  it('un fallo de PRIVILEGIOS de la DB NO culpa al usuario', () => {
    // Este es el bug real que tuvo el chat roto durante días: la migración 0022
    // revocó EXECUTE sobre is_codefile_body, que un CHECK de `messages` llama.
    // PostgREST devolvía 42501 "permission denied for function is_codefile_body"
    // y la app lo mostraba como "no sos amigo" / "sin permiso".
    const msg = describeSendError('permission denied for function is_codefile_body', '42501')
    expect(msg).not.toMatch(/amigos/)
    expect(msg).not.toMatch(/sin permiso para enviar/i)
    expect(msg).toMatch(/servidor/i)
    expect(describeSendError('permission denied for table messages', '42501')).toMatch(/servidor/i)
  })

  it('42501 sin causa reconocida tampoco culpa al usuario', () => {
    expect(describeSendError('algo raro', '42501')).not.toMatch(/amigos/)
    expect(describeSendError('algo raro', '42501')).toMatch(/servidor/i)
  })

  it('sesión ausente/vencida pide loguearse, no amistad', () => {
    expect(describeSendError('JWT expired', '42501')).not.toMatch(/amigos/)
    expect(describeSendError('JWT expired', '42501')).toMatch(/sesión/i)
  })
})