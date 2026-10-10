// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Términos y condiciones — contrato compartido main ⇄ preload ⇄ renderer.
 *
 * Scrakk Studio (el editor) es software libre bajo Apache-2.0; estos términos
 * cubren el SERVICIO que se usa al crear una cuenta Scrakk: el login por email
 * y la mensajería social. No hay IA ni telemetría propia de por medio.
 *
 * La aceptación es **por cuenta** y se guarda en el servidor (con marca de
 * tiempo del server) como prueba. `LEGAL_VERSION` sube cuando cambian los
 * documentos y, al subir, se vuelve a pedir la aceptación.
 */

/** Versión vigente de los documentos legales (Términos + Privacidad). */
export const LEGAL_VERSION = '1.0.0'

/** Enlaces canónicos (la web es la fuente de verdad; se abren externos). */
export const LEGAL_LINKS = {
  terms: 'https://scrakk.art/terms',
  privacy: 'https://scrakk.art/privacy',
  license: 'https://scrakk.art/license'
} as const

/** Datos que se aceptan y se registran (por cuenta). */
export interface LegalConsent {
  /** Versión de los documentos aceptada (ver `LEGAL_VERSION`). */
  version: string
  /** Idioma en el que se mostraron los documentos al aceptar. */
  locale: string
}

/** ¿La versión aceptada sigue vigente? (si no, hay que volver a aceptar). */
export function consentIsCurrent(version: string | null | undefined): boolean {
  return version === LEGAL_VERSION
}
