#!/usr/bin/env node
// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * i18n CLI — extrae, sincroniza, traduce, revisa y valida los catálogos.
 *
 *   node tools/i18n.mjs --status
 *   node tools/i18n.mjs --translate en --provider deepl
 *   node tools/i18n.mjs --review en
 *   node tools/i18n.mjs --approve en --all
 *   node tools/i18n.mjs --check --strict
 *
 * Modelo:
 *   - `es` es la BASE (fuente de verdad). Se escribe a mano.
 *   - Cada idioma es `catalogs/<lang>/<area>.json` (clave plana → texto).
 *   - El estado del motor vive en `state/<lang>.json`: por clave, el hash del
 *     `es` con el que se tradujo + si es automática y si falta revisión.
 *   - `stale` NO se guarda: es `hash(es[key]) !== state[key].src`. Se deriva,
 *     así nunca se desincroniza.
 *
 * Motor: DeepL (por defecto). `--provider argos` usa argostranslate local.
 */

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CATALOGS_DIR = join(ROOT, 'src/shared/i18n/catalogs')
const STATE_DIR = join(ROOT, 'src/shared/i18n/state')
const BASE = 'es'

/** Idiomas destino = directorios dentro de catalogs/ (menos la base). */
function targetLocales() {
  return readdirSync(CATALOGS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== BASE)
    .map((entry) => entry.name)
    .sort()
}

function areas() {
  return readdirSync(join(CATALOGS_DIR, BASE))
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.replace(/\.json$/, ''))
    .sort()
}

// ── IO de catálogos y estado ────────────────────────────────────────────────

function catalogPath(locale, area) {
  return join(CATALOGS_DIR, locale, `${area}.json`)
}

function readJson(file, fallback) {
  if (!existsSync(file)) return fallback
  try {
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch (error) {
    fail(`JSON inválido en ${file}: ${error.message}`)
  }
}

/** Escribe JSON con claves ordenadas (diffs limpios y deterministas). */
function writeJson(file, data) {
  const sorted = {}
  for (const key of Object.keys(data).sort()) sorted[key] = data[key]
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`)
}

function readCatalog(locale, area) {
  return readJson(catalogPath(locale, area), {})
}

function writeCatalog(locale, area, data) {
  writeJson(catalogPath(locale, area), data)
}

function readState(locale) {
  return readJson(join(STATE_DIR, `${locale}.json`), { version: 1, keys: {} })
}

function writeState(locale, state) {
  writeJson(join(STATE_DIR, `${locale}.json`), state)
}

/**
 * Regenera `catalogs/index.ts` con TODAS las áreas (imports estáticos, para
 * que `MessageKey` incluya cada clave y un typo no compile). Crea los archivos
 * de área que falten en cada idioma destino.
 */
function writeCatalogIndex() {
  const list = areas()
  const locales = targetLocales()
  const ident = (name) => name.replace(/[^a-zA-Z0-9]+(.)/g, (_, letter) => letter.toUpperCase())
  const cap = (name) => name.charAt(0).toUpperCase() + name.slice(1)
  const lines = []
  const spreads = {}
  const exports = [`export const esCatalog = { ${list.map((area) => `...${ident(area)}Es`).join(', ')} }`]

  for (const area of list) lines.push(`import ${ident(area)}Es from './es/${area}.json'`)
  for (const locale of locales) {
    const parts = []
    for (const area of list) {
      if (!existsSync(catalogPath(locale, area))) writeCatalog(locale, area, {})
      lines.push(`import ${ident(area)}${cap(locale)} from './${locale}/${area}.json'`)
      parts.push(`...${ident(area)}${cap(locale)}`)
    }
    exports.push(`export const ${locale}Catalog = { ${parts.join(', ')} }`)
  }
  spreads['es'] = 'esCatalog'
  for (const locale of locales) spreads[locale] = `${locale}Catalog`
  const catalogEntries = ['es', ...locales].map((locale) => `${locale}: ${spreads[locale]}`).join(', ')

  const content = `// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Catálogos de traducción — ARCHIVO GENERADO por \`tools/i18n.mjs\`.
 *
 * \`es\` es la BASE (fuente de verdad, escrita a mano). Los demás idiomas se
 * generan con \`--translate\` y se revisan por PR. No editar a mano: corré
 * \`npm run i18n -- --sync\` tras agregar o quitar un área.
 */

${lines.join('\n')}

${exports.join('\n\n')}

export const catalogs = { ${catalogEntries} } as const

/** Toda clave declarada en la base. Un typo en \`t('...')\` no compila. */
type RawKey = keyof typeof esCatalog

/** Las claves de plural (\`x.one\`/\`x.other\`) se invocan con la clave base. */
type PluralBase<K extends string> = K extends \`\${infer Base}.one\`
  ? Base
  : K extends \`\${infer Base}.other\`
    ? Base
    : never

export type MessageKey = RawKey | PluralBase<RawKey & string>
`
  writeFileSync(join(CATALOGS_DIR, 'index.ts'), content)
}

/** Hash corto y estable del texto base (marca de versión de la traducción). */
function hash(text) {
  return createHash('sha256').update(text, 'utf-8').digest('hex').slice(0, 16)
}

/** Todos los mensajes del es: clave → { area, text }. */
function baseMessages() {
  const out = new Map()
  for (const area of areas()) {
    for (const [key, text] of Object.entries(readCatalog(BASE, area))) {
      out.set(key, { area, text })
    }
  }
  return out
}

function fail(message) {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

// ── .env (sin dependencias) ─────────────────────────────────────────────────

function loadEnvFile() {
  for (const name of ['.env.local', '.env']) {
    const file = join(ROOT, name)
    if (!existsSync(file)) continue
    for (const rawLine of readFileSync(file, 'utf-8').split('\n')) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq <= 0) continue
      const key = line.slice(0, eq).trim()
      let value = line.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = value
    }
  }
}

// ── Estado de traducción (missing / stale / review) ─────────────────────────

/**
 * @returns {Array<{key,area,text,status}>}
 *   status: 'missing' (no está en el destino) | 'stale' (el es cambió)
 *           | 'ok'
 */
function analyze(locale, only) {
  const state = readState(locale)
  const rows = []
  for (const [key, { area, text }] of baseMessages()) {
    if (only && area !== only) continue
    const catalog = readCatalog(locale, area)
    const translated = catalog[key]
    const entry = state.keys[key]
    let status = 'ok'
    if (translated === undefined || translated === '') status = 'missing'
    else if (!entry || entry.src !== hash(text)) status = 'stale'
    rows.push({ key, area, text, status, needsReview: entry?.needsReview === true })
  }
  return rows
}

// ── Providers ───────────────────────────────────────────────────────────────

const PROTECTED = /\{([a-zA-Z0-9_.]+)\}/g

function escapeXml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function unescapeXml(text) {
  return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}

/** Envuelve `{placeholders}` en un tag que DeepL no traduce. */
function protect(text) {
  return escapeXml(text).replace(PROTECTED, '<x>{$1}</x>')
}

function restore(text) {
  return unescapeXml(text.replace(/<\/?x>/g, ''))
}

/** Compara los placeholders del origen con los del resultado. */
function placeholdersMatch(source, translated) {
  const of = (text) => [...text.matchAll(PROTECTED)].map((m) => m[1]).sort()
  return JSON.stringify(of(source)) === JSON.stringify(of(translated))
}

const AREA_CONTEXT = {
  common: 'Short, reusable user-interface labels of a desktop code editor (buttons and actions).',
  appearance:
    'The Appearance settings page of a desktop code editor. It covers color themes ' +
    '(which can be light or dark), fonts, and the interface language.',
  _default: 'Short user-interface text of Scrakk Studio, a desktop code editor.'
}

const CUSTOM_INSTRUCTIONS = [
  'This is user-interface text for Scrakk Studio, a desktop code editor.',
  'Keep labels short and natural; use sentence case; do not end short labels with a period.',
  'Never translate these product names: Scrakk, Scrakk Studio, KolarGrep, Innerta, SEF, VSIX.'
]

function deeplConfig() {
  const key = process.env.DEEPL_API_KEY
  if (!key) fail('Falta DEEPL_API_KEY (poné la key de DeepL en .env).')
  // Las keys del plan Free terminan en `:fx` y viven en api-free.
  const host = key.trim().endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com'
  return { key: key.trim(), host }
}

const DEEPL_TARGET = { en: 'EN-US' }

async function deeplUsage() {
  const { key, host } = deeplConfig()
  const response = await fetch(`${host}/v2/usage`, {
    headers: { Authorization: `DeepL-Auth-Key ${key}` }
  })
  if (!response.ok) fail(`DeepL /usage ${response.status}: ${await response.text()}`)
  return response.json()
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Traduce un lote con DeepL. Devuelve `{ texts, billed }`.
 * Reintenta 429/5xx con backoff; 456 (cuota) corta de inmediato.
 */
async function deeplBatch(items, { locale, area }) {
  const { key, host } = deeplConfig()
  const target = DEEPL_TARGET[locale] ?? locale.toUpperCase()
  const body = {
    text: items.map((item) => protect(item.text)),
    source_lang: 'ES',
    target_lang: target,
    context: AREA_CONTEXT[area] ?? AREA_CONTEXT._default,
    custom_instructions: CUSTOM_INSTRUCTIONS,
    preserve_formatting: true,
    model_type: 'quality_optimized',
    tag_handling: 'xml',
    ignore_tags: ['x'],
    show_billed_characters: true
  }

  let lastError = ''
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(`${host}/v2/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (response.ok) {
      const payload = await response.json()
      const texts = payload.translations.map((entry) => restore(entry.text))
      const billed = payload.translations.reduce(
        (total, entry) => total + (entry.billed_characters ?? 0),
        0
      )
      return { texts, billed }
    }

    const detail = await response.text()
    if (response.status === 456) {
      fail(`DeepL: cuota agotada (456). ${detail}`)
    }
    if (response.status === 400 || response.status === 403) {
      fail(`DeepL ${response.status}: ${detail}`)
    }
    lastError = `${response.status} ${detail}`
    const retryAfter = Number(response.headers.get('retry-after'))
    const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt
    console.warn(`   ↻ DeepL ${response.status}; reintento en ${wait}ms`)
    await sleep(wait)
  }
  fail(`DeepL no respondió tras varios intentos: ${lastError}`)
}

/** Provider local (offline) vía argostranslate. Requiere `pip install argostranslate`. */
function argosBatch(items, { locale }) {
  const to = (DEEPL_TARGET[locale] ?? locale).slice(0, 2).toLowerCase()
  const script = [
    'import sys, json',
    'from argostranslate import translate',
    'data = json.load(sys.stdin)',
    `out = [translate.translate(text, "es", "${to}") for text in data]`,
    'json.dump(out, sys.stdout)'
  ].join('\n')
  const result = spawnSync('python3', ['-c', script], {
    input: JSON.stringify(items.map((item) => item.text)),
    encoding: 'utf-8'
  })
  if (result.status !== 0) {
    fail(
      'argos falló. Instalá el motor local:\n' +
        '  pip install argostranslate\n' +
        '  python3 -c "import argostranslate.package as p; p.update_package_index(); ' +
        'p.install_from_index([x for x in p.get_available_packages() if x.from_code==\'es\' ' +
        'and x.to_code==\'en\'][0])"\n' +
        `${result.stderr ?? ''}`
    )
  }
  return { texts: JSON.parse(result.stdout), billed: 0 }
}

const PROVIDERS = {
  deepl: deeplBatch,
  argos: async (items, options) => argosBatch(items, options)
}

/** Agrupa por tamaño (DeepL: ≤50 textos y ≤128 KiB por request). */
function batches(items, maxItems = 50, maxBytes = 100_000) {
  const out = []
  let current = []
  let bytes = 0
  for (const item of items) {
    const size = Buffer.byteLength(item.text, 'utf-8')
    if (current.length > 0 && (current.length >= maxItems || bytes + size > maxBytes)) {
      out.push(current)
      current = []
      bytes = 0
    }
    current.push(item)
    bytes += size
  }
  if (current.length > 0) out.push(current)
  return out
}

// ── Comandos ────────────────────────────────────────────────────────────────

function cmdStatus(options) {
  const locales = options.lang ? [options.lang] : targetLocales()
  console.log(`\nCatálogo base (es): ${baseMessages().size} claves\n`)
  for (const locale of locales) {
    const rows = analyze(locale, options.only)
    const total = rows.length
    const missing = rows.filter((row) => row.status === 'missing').length
    const stale = rows.filter((row) => row.status === 'stale').length
    const review = rows.filter((row) => row.needsReview).length
    console.log(
      `${locale.padEnd(4)} ${String(total).padStart(4)} claves · ` +
        `${String(missing).padStart(4)} missing · ${String(stale).padStart(4)} stale · ` +
        `${String(review).padStart(4)} sin revisar`
    )
    if (options.json) {
      console.log(JSON.stringify({ locale, total, missing, stale, review }))
    }
  }
  console.log('')
}

function cmdSync(options) {
  const locales = options.lang ? [options.lang] : targetLocales()
  const base = baseMessages()
  for (const locale of locales) {
    const state = readState(locale)
    let pruned = 0
    let created = 0
    for (const area of areas()) {
      const catalog = readCatalog(locale, area)
      const before = Object.keys(catalog).length
      const next = {}
      for (const key of Object.keys(catalog)) {
        if (base.has(key)) next[key] = catalog[key]
      }
      if (before !== Object.keys(next).length) pruned += before - Object.keys(next).length
      if (!existsSync(catalogPath(locale, area))) created += 1
      writeCatalog(locale, area, next)
    }
    let statePruned = 0
    for (const key of Object.keys(state.keys)) {
      if (!base.has(key)) {
        delete state.keys[key]
        statePruned += 1
      }
    }
    writeState(locale, state)
    console.log(`${locale}: ${pruned} claves podadas, ${statePruned} del estado, ${created} áreas creadas`)
  }
  writeCatalogIndex()
}

async function cmdTranslate(options) {
  const locale = options.lang ?? (typeof options.translate === 'string' ? options.translate : undefined) ?? options._[0]
  if (!locale) fail('Falta el idioma destino: --translate <lang>')
  if (!targetLocales().includes(locale)) {
    fail(`Idioma "${locale}" sin catálogo. Creá el directorio catalogs/${locale}/ primero.`)
  }
  const providerName = options.provider ?? 'deepl'
  const provider = PROVIDERS[providerName]
  if (!provider) fail(`Provider desconocido: ${providerName} (usá deepl | argos)`)

  const rows = analyze(locale, options.only).filter((row) => {
    if (options.force) return true
    return row.status === 'missing' || row.status === 'stale'
  })
  const targets = options.limit ? rows.slice(0, Number(options.limit)) : rows

  if (targets.length === 0) {
    console.log(`\n✓ ${locale}: nada para traducir (todo al día).\n`)
    return
  }
  console.log(
    `\nTraduciendo ${targets.length} claves (${providerName})` +
      `${options.only ? ` · área ${options.only}` : ''}${options.dryRun ? ' · DRY RUN' : ''}\n`
  )

  const byArea = new Map()
  for (const row of targets) {
    if (!byArea.has(row.area)) byArea.set(row.area, [])
    byArea.get(row.area).push(row)
  }

  const state = readState(locale)
  // Glosario curado: coincidencia EXACTA del texto base → traducción fija.
  // Resuelve las strings cortas que el motor no puede desambiguar sin contexto
  // ("Claro" → "Sure") y garantiza consistencia de términos entre áreas.
  const glossary = readJson(join(ROOT, 'src/shared/i18n/glossary.json'), {})[locale] ?? {}
  let billed = 0
  let curated = 0
  const warnings = []

  for (const [area, items] of byArea) {
    if (options.dryRun) {
      console.log(`  ${area}: ${items.length} claves (${providerName})`)
      continue
    }
    const catalog = readCatalog(locale, area)
    const pending = []
    for (const item of items) {
      const known = glossary[item.text]
      if (known !== undefined) {
        catalog[item.key] = known
        state.keys[item.key] = {
          src: hash(item.text),
          area,
          machine: false,
          needsReview: false,
          at: new Date().toISOString(),
          source: 'glossary'
        }
        curated += 1
      } else {
        pending.push(item)
      }
    }
    for (const batch of batches(pending)) {
      const { texts, billed: batchBilled } = await provider(batch, { locale, area, options })
      billed += batchBilled
      // Respiro entre requests: cortesía con el rate limit del plan Free.
      if (providerName === 'deepl') await sleep(250)
      batch.forEach((item, index) => {
        const translated = texts[index]
        catalog[item.key] = translated
        state.keys[item.key] = {
          src: hash(item.text),
          area,
          machine: true,
          needsReview: true,
          at: new Date().toISOString()
        }
        if (!placeholdersMatch(item.text, translated)) {
          warnings.push(`${item.key}: placeholders distintos a los del origen`)
        }
      })
    }
    writeCatalog(locale, area, catalog)
    console.log(`  ${area}: ${items.length} claves${curated > 0 ? ` (${items.length - pending.length} del glosario)` : ''}`)
  }

  if (!options.dryRun) writeState(locale, state)
  if (!options.dryRun) writeCatalogIndex()

  if (billed > 0) console.log(`\n  Caracteres facturados: ${billed.toLocaleString('en-US')}`)
  if (warnings.length > 0) {
    console.log(`\n  ⚠ ${warnings.length} claves con placeholders sospechosos:`)
    for (const warning of warnings) console.log(`    - ${warning}`)
  }
  console.log(`\n✓ Listo. Revisá con: node tools/i18n.mjs --review ${locale}\n`)
}

function cmdReview(options) {
  const locale = options.lang ?? (typeof options.review === 'string' ? options.review : undefined) ?? options._[0]
  if (!locale) fail('Falta el idioma: --review <lang>')
  const rows = analyze(locale, options.only).filter((row) => row.needsReview)
  if (rows.length === 0) {
    console.log(`\n✓ ${locale}: no queda nada pendiente de revisión.\n`)
    return
  }
  console.log(`\n### Revisión de traducciones · \`${locale}\` (${rows.length})\n`)
  console.log('| Clave | es | ' + locale + ' |')
  console.log('| --- | --- | --- |')
  for (const row of rows) {
    const translated = readCatalog(locale, row.area)[row.key] ?? '—'
    const clean = (text) => `\`${String(text).replace(/\|/g, '\\|')}\``
    console.log(`| ${clean(row.key)} | ${clean(row.text)} | ${clean(translated)} |`)
  }
  console.log('')
}

function cmdApprove(options) {
  const locale = options.lang ?? (typeof options.approve === 'string' ? options.approve : undefined) ?? options._[0]
  if (!locale) fail('Falta el idioma: --approve <lang>')
  const state = readState(locale)
  const keys = options.keys ? String(options.keys).split(',').map((key) => key.trim()) : null
  let approved = 0
  for (const [key, entry] of Object.entries(state.keys)) {
    if (!entry.needsReview) continue
    if (!options.all && keys && !keys.includes(key)) continue
    if (!options.all && !keys && options.area && entry.area !== options.area) continue
    if (!options.all && !keys && !options.area) continue
    entry.needsReview = false
    entry.approvedAt = new Date().toISOString()
    approved += 1
  }
  writeState(locale, state)
  console.log(`\n✓ ${approved} claves aprobadas en ${locale}.\n`)
}

function cmdCheck(options) {
  const locales = options.lang ? [options.lang] : targetLocales()
  let failures = 0
  for (const locale of locales) {
    const rows = analyze(locale, options.only)
    const missing = rows.filter((row) => row.status === 'missing').length
    const stale = rows.filter((row) => row.status === 'stale').length
    const review = rows.filter((row) => row.needsReview).length
    const bad = missing + stale + review
    failures += bad
    const mark = bad === 0 ? '✓' : '✖'
    console.log(
      `${mark} ${locale}: ${missing} missing · ${stale} stale · ${review} sin revisar`
    )
  }
  if (failures > 0 && options.strict) {
    console.error('\n✖ i18n: hay traducciones incompletas (modo estricto).\n')
    process.exit(1)
  }
  if (failures > 0) console.log('\n(i18n: avisos; usá --strict para bloquear)\n')
}

function cmdExtract() {
  const used = new Set()
  const files = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (['node_modules', 'out', 'dist', 'target'].includes(entry.name)) continue
        walk(full)
      } else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full)
    }
  }
  for (const root of ['src/renderer/src', 'src/main']) walk(join(ROOT, root))

  const call = /(?<!\.)\b(?:t|translateKey)\(\s*['"]([^'"]+)['"]/g
  for (const file of files) {
    // Sin comentarios: hay ejemplos de `t('...')` en docs del código que no
    // son uso real (darían falsos positivos).
    const text = readFileSync(file, 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    for (const match of text.matchAll(call)) used.add(match[1])
  }

  const base = baseMessages()
  const defined = new Set(base.keys())
  const undefinedKeys = [...used].filter((key) => !defined.has(key)).sort()
  // Una clave base con variantes de plural (`x.one`/`x.other`) se considera
  // usada si el código llama a la familia (`x`).
  const unused = [...defined]
    .filter((key) => !used.has(key) && !used.has(key.replace(/\.(one|other)$/, '')))
    .sort()

  console.log(`\nUsadas en código: ${used.size} · declaradas en es: ${defined.size}\n`)
  if (undefinedKeys.length > 0) {
    console.log(`✖ Usadas pero NO declaradas (${undefinedKeys.length}):`)
    for (const key of undefinedKeys) console.log(`   ${key}`)
  }
  if (unused.length > 0) {
    console.log(`\n· Declaradas y sin uso (${unused.length}):`)
    for (const key of unused) console.log(`   ${key}`)
  }
  if (undefinedKeys.length === 0 && unused.length === 0) console.log('✓ Todo consistente.\n')
  else console.log('')
}

async function cmdDoctor() {
  const usage = await deeplUsage()
  console.log('\n✓ DeepL responde')
  console.log(`  Usado:  ${usage.character_count.toLocaleString('en-US')} caracteres`)
  console.log(`  Límite: ${usage.character_limit.toLocaleString('en-US')} caracteres`)
  console.log(`  Restante: ${(usage.character_limit - usage.character_count).toLocaleString('en-US')}\n`)
}

// ── Parseo de flags ─────────────────────────────────────────────────────────

function parseArgs(argv) {
  const options = { _: [] }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('--')) {
      options._.push(arg)
      continue
    }
    const name = arg.slice(2)
    const camel = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    const next = argv[index + 1]
    if (next && !next.startsWith('--')) {
      options[camel] = next
      index += 1
    } else {
      options[camel] = true
    }
  }
  return options
}

const HELP = `
i18n CLI — catálogos de traducción de Scrakk Studio

  --status                      Cobertura por idioma (missing / stale / sin revisar)
  --extract                     Claves usadas en el código vs declaradas en 'es'
  --sync                        Poda claves que ya no están en el base
  --translate <lang>            Traduce lo faltante/desactualizado
      [--provider deepl|argos]      motor (default: deepl)
      [--only <area>] [--limit <n>] [--force] [--dry-run]
  --review <lang>               Tabla markdown es → <lang> de lo pendiente de revisar
  --approve <lang> --all        Aprueba lo pendiente (limpia 'needsReview')
  --check [--strict]            Valida el estado; --strict falla si hay pendientes
  --doctor                      Verifica las credenciales de DeepL y la cuota

Modelo:
  - 'es' es la BASE (fuente de verdad) y se escribe a mano.
  - Cada idioma vive en src/shared/i18n/catalogs/<lang>/<area>.json.
  - state/<lang>.json guarda, por clave, el hash del 'es' traducido + flags.
  - 'stale' se deriva (hash(es) !== state.src): nunca se desincroniza.
`

async function main() {
  loadEnvFile()
  const options = parseArgs(process.argv.slice(2))

  if (options.help || Object.keys(options).length === 1) {
    console.log(HELP)
    return
  }

  if (options.status) return cmdStatus(options)
  if (options.extract) return cmdExtract(options)
  if (options.sync) return cmdSync(options)
  if (options.translate) return cmdTranslate(options)
  if (options.review) return cmdReview(options)
  if (options.approve) return cmdApprove(options)
  if (options.check) return cmdCheck(options)
  if (options.doctor) return cmdDoctor(options)

  fail(`Nada que hacer. Ver --help.`)
}

main().catch((error) => fail(error?.stack ?? String(error)))
