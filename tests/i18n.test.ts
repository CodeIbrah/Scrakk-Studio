// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

import { describe, expect, it, vi } from 'vitest'
import { interpolate, translate, type Catalogs } from '@shared/i18n/engine'
import { catalogs } from '@shared/i18n/catalogs'
import { getLocale, resolveLocale, setLocale, subscribeToLocale } from '@shared/i18n'

const catalogsFixture: Catalogs = {
  es: {
    'a.simple': 'Guardar',
    'a.vars': 'Hola {name}, tienes {n} mensajes',
    'a.count.one': 'Tienes 1 skill',
    'a.count.other': 'Tienes {count} skills',
    'a.only.one': 'Solo base uno',
    'a.only.other': 'Solo base varios'
  },
  en: {
    'a.simple': 'Save',
    'a.vars': 'Hi {name}, you have {n} messages',
    'a.count.one': 'You have 1 skill',
    'a.count.other': 'You have {count} skills'
  }
}

describe('i18n · interpolación', () => {
  it('reemplaza {placeholders} por su valor', () => {
    expect(interpolate('Hola {name}, tienes {n}', { name: 'Ana', n: 3 })).toBe(
      'Hola Ana, tienes 3'
    )
  })

  it('deja intactos los placeholders sin valor', () => {
    expect(interpolate('Hola {name} {otro}', { name: 'Ana' })).toBe('Hola Ana {otro}')
  })

  it('sin vars devuelve el texto tal cual', () => {
    expect(interpolate('Hola {name}')).toBe('Hola {name}')
  })
})

describe('i18n · translate', () => {
  it('usa el idioma pedido cuando la clave existe', () => {
    const result = translate(catalogsFixture, 'en', 'es', 'a.simple')
    expect(result.text).toBe('Save')
    expect(result.missing).toBe(false)
    expect(result.fellBackToBase).toBe(false)
  })

  it('interpola en el idioma pedido', () => {
    const result = translate(catalogsFixture, 'en', 'es', 'a.vars', { name: 'Ana', n: 2 })
    expect(result.text).toBe('Hi Ana, you have 2 messages')
  })

  it('cae al idioma base si falta en el pedido (y lo reporta)', () => {
    const fixture: Catalogs = { es: { 'x': 'Solo español' }, en: {} }
    const result = translate(fixture, 'en', 'es', 'x')
    expect(result.text).toBe('Solo español')
    expect(result.fellBackToBase).toBe(true)
    expect(result.missing).toBe(false)
  })

  it('si no existe en ningún catálogo, devuelve la clave y marca missing', () => {
    const result = translate(catalogsFixture, 'en', 'es', 'no.existe')
    expect(result.text).toBe('no.existe')
    expect(result.missing).toBe(true)
  })
})

describe('i18n · plural', () => {
  it('count === 1 usa la variante .one', () => {
    expect(translate(catalogsFixture, 'en', 'es', 'a.count', { count: 1 }).resolvedKey).toBe(
      'a.count.one'
    )
    expect(translate(catalogsFixture, 'en', 'es', 'a.count', { count: 1 }).text).toBe(
      'You have 1 skill'
    )
  })

  it('count !== 1 usa la variante .other', () => {
    expect(translate(catalogsFixture, 'en', 'es', 'a.count', { count: 3 }).text).toBe(
      'You have 3 skills'
    )
    expect(translate(catalogsFixture, 'en', 'es', 'a.count', { count: 0 }).text).toBe(
      'You have 0 skills'
    )
  })

  it('si el destino no tiene plurales, cae a los del base', () => {
    const result = translate(catalogsFixture, 'en', 'es', 'a.only', { count: 2 })
    expect(result.text).toBe('Solo base varios')
    expect(result.fellBackToBase).toBe(true)
  })

  it('sin variantes de plural usa la clave base', () => {
    expect(translate(catalogsFixture, 'en', 'es', 'a.simple', { count: 5 }).text).toBe('Save')
  })

  it('acepta count como string numérico', () => {
    expect(translate(catalogsFixture, 'en', 'es', 'a.count', { count: '1' }).text).toBe(
      'You have 1 skill'
    )
  })
})

describe('i18n · idioma activo', () => {
  it('resolveLocale devuelve el idioma explícito', () => {
    expect(resolveLocale('en')).toBe('en')
    expect(resolveLocale('es')).toBe('es')
  })

  it('resolveLocale("system") cae al base sin navigator (entorno node)', () => {
    expect(resolveLocale('system')).toBe('es')
  })

  it('setLocale notifica a los suscriptores una sola vez por cambio', () => {
    setLocale('es')
    const listener = vi.fn()
    const unsubscribe = subscribeToLocale(listener)
    setLocale('en')
    setLocale('en')
    expect(getLocale()).toBe('en')
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    setLocale('es')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('i18n · integridad de catálogos', () => {
  it('el idioma inglés cubre todas las claves del base', () => {
    const missing = Object.keys(catalogs.es).filter((key) => !(key in catalogs.en))
    expect(missing).toEqual([])
  })

  it('los catálogos no tienen valores vacíos', () => {
    for (const [locale, catalog] of Object.entries(catalogs)) {
      for (const [key, value] of Object.entries(catalog)) {
        expect(value, `${locale}:${key}`).not.toBe('')
      }
    }
  })
})
