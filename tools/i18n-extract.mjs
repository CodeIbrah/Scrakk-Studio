#!/usr/bin/env node
// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * i18n-extract — transforma la UI al catálogo i18n de UNA sola pasada.
 *
 * Uso:  node tools/i18n-extract.mjs [--apply] [--dry]
 *
 * Cubre TODOS los patrones de texto de UI:
 *   1. Texto JSX                     <p>Guardar</p>          → {t('clave')}
 *   2. Atributos de UI               title="Guardar"         → title={t('clave')}
 *   3. String en expresión JSX       {'Guardar'}             → {t('clave')}
 *   4. Template literals (JSX/función), con y sin ${}        → t('clave', { var })
 *   5. Propiedades de objeto de MÓDULO (label/title/… )      → get label() { return t(…) }
 *   6. Propiedades de objeto en FUNCIÓN                      → t('clave')
 *   7. Títulos de COMANDO (objetos con `run`)                → clave (la resuelve `msg()`)
 *   8. Argumentos de funciones de app                        → t('clave')
 *   9. new Error('…')                                        → new Error(t('clave'))
 *  10. return / variable / asignación / ternario / array / || → t('clave')
 *
 * El texto base (es) se registra en `src/shared/i18n/catalogs/es/<área>.json`
 * con una clave estable derivada del propio texto. Idempotente: correrlo de
 * nuevo no duplica nada. Después: `node tools/i18n.mjs --translate <lang>`.
 */

import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(ROOT, 'package.json'))
let parser
try {
  ;({ parse: parser } = require('@babel/parser'))
} catch {
  console.error('Falta @babel/parser (devDependency de vite). Instalá dependencias primero.')
  process.exit(1)
}

const APPLY = process.argv.includes('--apply')
const CATALOGS = join(ROOT, 'src/shared/i18n/catalogs')
const ROOTS = ['src/renderer/src', 'src/main']

/** Nada de esto se traduce (datos/modelo/terceros). */
const DENY = [
  'features/editor/', 'features/lsp/', 'features/quickfix/', 'features/debug/',
  'services/ai/', 'features/social/emoji/', 'services/extensions/types/',
  'features/editor/languages.ts', 'src/main/extensions/'
]

const UI_ATTRS = new Set([
  'placeholder', 'aria-label', 'title', 'alt', 'label', 'description', 'tooltip',
  'heading', 'subtitle', 'hint', 'emptyText', 'message', 'confirmLabel', 'cancelLabel'
])
const UI_KEYS = new Set([
  'label', 'title', 'message', 'description', 'tooltip', 'detail', 'hint', 'subtitle',
  'heading', 'placeholder', 'emptyText', 'confirmLabel', 'cancelLabel', 'errorText',
  'text', 'error', 'reason', 'line', 'body', 'caption', 'note', 'summary'
])
const DENY_ATTRS = new Set([
  'className', 'style', 'd', 'fill', 'stroke', 'viewBox', 'points', 'href', 'src', 'id',
  'key', 'ref', 'icon', 'size', 'width', 'height', 'role', 'type', 'name', 'value', 'rel',
  'color', 'fontFamily', 'transform'
])
const DENY_CALLS = new Set([
  'require', 'import', 'exec', 'execSync', 'execFile', 'spawn', 'spawnSync', 'fork', 'fetch',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'parseInt', 'parseFloat',
  'Number', 'String', 'Boolean', 'Array', 'Object', 'RegExp', 'Date', 'Buffer', 'Symbol',
  'encodeURIComponent', 'decodeURIComponent', 'atob', 'btoa', 'createHash', 'createRequire',
  'readFileSync', 'writeFileSync', 'existsSync', 'mkdirSync', 'readdirSync', 'join', 'resolve',
  'dirname', 'basename', 'extname', 'relative', 'normalize', 'isAbsolute', 'send', 'invoke',
  'emit', 'on', 'once', 'handle', 'addListener', 'removeListener', 'addEventListener',
  'removeEventListener', 'register', 'unregister', 'dispatch', 'expect'
])
const CODEISH = /[{};=]|=>|\bconst \b|\bfunction\b|\bawait\b|\breturn\b|<\/?[a-z]/

const inSet = (set, s) => (set ? set.has(s) : false)

function isUi(text) {
  const t = text.trim()
  if (t.length < 2 || t.length > 200) return false
  if (!/[A-Za-zÀ-ÿ]/.test(t)) return false
  if (/^(https?:|\/|\.\/|\.\.\/|@|\.[a-z]|#)/.test(t)) return false
  if (/^[a-z0-9]+([-/._][a-z0-9]+)+$/.test(t)) return false
  if (/^[A-Z0-9_]{2,}$/.test(t)) return false
  if (CODEISH.test(t)) return false
  if (/&[a-z]+;|&#/.test(t)) return false
  if (!/\s/.test(t)) {
    if (/[áéíóúñÁÉÍÓÚÑ¿¡]/.test(t)) return true
    return /^[A-ZÀ-Þ][a-zà-ÿ]{2,}$/.test(t)
  }
  return t.split(' ').length <= 44
}

function areaFor(rel) {
  if (rel.startsWith('src/main')) return 'main'
  const p = rel.replace(/^src\/renderer\/src\//, '')
  const map = [
    [/^app\//, 'app'], [/^features\/settings\//, 'settings'], [/^features\/titlebar\//, 'titlebar'],
    [/^features\/statusbar\//, 'statusbar'], [/^features\/activitybar\//, 'activitybar'],
    [/^features\/layout\/panels\/GitPanel\//, 'git'], [/^features\/layout\//, 'layout'],
    [/^features\/explorer\//, 'explorer'], [/^features\/welcome\//, 'welcome'],
    [/^features\/onboarding\//, 'onboarding'], [/^features\/chat\//, 'chat'],
    [/^features\/social\//, 'social'], [/^features\/palette\//, 'palette'],
    [/^features\/providers\//, 'providers'], [/^features\/extensionviews\//, 'extensionviews'],
    [/^features\/git\//, 'git'], [/^components\//, 'common']
  ]
  for (const [re, area] of map) if (re.test(p)) return area
  const feat = p.match(/^features\/([a-z]+)\//)
  if (feat) return feat[1]
  const top = p.match(/^(services|components|core)\//)
  if (top) return top[1]
  return 'misc'
}

function slug(text) {
  const words = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/).slice(0, 5).filter(Boolean)
  return words.join('.') || 'texto'
}

// ── AST helpers ─────────────────────────────────────────────────────────────
function each(node, ancestors, visit) {
  if (!node || typeof node.type !== 'string') return
  visit(node, ancestors)
  ancestors.push(node)
  for (const key of Object.keys(node)) {
    if (['loc', 'start', 'end', 'extra', 'leadingComments', 'trailingComments', 'innerComments'].includes(key)) continue
    const value = node[key]
    if (Array.isArray(value)) {
      for (const child of value) if (child && typeof child.type === 'string') each(child, ancestors, visit)
    } else if (value && typeof value.type === 'string') {
      each(value, ancestors, visit)
    }
  }
  ancestors.pop()
}
const insideJsx = (a) => a.some((n) => n.type === 'JSXElement' || n.type === 'JSXFragment' || n.type === 'JSXExpressionContainer')
const insideFn = (a) => a.some((n) => n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression' || n.type === 'FunctionDeclaration' || n.type === 'ObjectMethod')
const insideCode = (a) => a.some((n) => n.type === 'JSXElement' && ['code', 'pre'].includes(n.openingElement?.name?.name))
function insideDeniedAttr(a) {
  for (let i = a.length - 1; i >= 0; i -= 1) {
    if (a[i].type === 'JSXAttribute') return DENY_ATTRS.has(a[i].name?.name)
    if (a[i].type === 'JSXElement') break
  }
  return false
}

// ── Catálogos ───────────────────────────────────────────────────────────────
const catalogs = {}
const additions = {}
for (const file of readdirSync(join(CATALOGS, 'es'))) {
  const area = file.replace(/\.json$/, '')
  const data = JSON.parse(readFileSync(join(CATALOGS, 'es', file), 'utf-8'))
  catalogs[area] = {}
  for (const [key, text] of Object.entries(data)) catalogs[area][text] = key
}
function keyFor(area, text) {
  if (!catalogs[area]) catalogs[area] = {}
  if (!additions[area]) additions[area] = {}
  if (catalogs[area][text]) return catalogs[area][text]
  const base = `${area}.${slug(text)}`
  let key = base
  let n = 2
  const taken = new Set([...Object.values(catalogs[area]), ...Object.keys(additions[area])])
  while (taken.has(key)) key = `${base}-${n++}`
  catalogs[area][text] = key
  additions[area][key] = text
  return key
}

// ── Recolección de archivos ─────────────────────────────────────────────────
const files = []
;(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(full)
  }
})(join(ROOT, ROOTS[0]))
;(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(full)
  }
})(join(ROOT, ROOTS[1]))

// ── Transformación ──────────────────────────────────────────────────────────
let totalEdits = 0
const changed = []

for (const file of files) {
  const rel = relative(ROOT, file)
  if (DENY.some((d) => rel.includes(d)) || rel.endsWith('.test.ts')) continue
  let code = readFileSync(file, 'utf-8')
  let ast
  try {
    ast = parser(code, { sourceType: 'module', plugins: ['jsx', 'typescript'], ranges: true })
  } catch {
    continue
  }
  const area = areaFor(rel)
  const edits = []
  const push = (node, text) => edits.push({ start: node.start, end: node.end, text })
  const key = (text) => keyFor(area, text)

  each(ast.program, [], (node, ancestors) => {
    // 1. texto JSX (preservando espacios alrededor)
    if (node.type === 'JSXText') {
      const raw = code.slice(node.start, node.end)
      const trimmed = raw.trim()
      if (isUi(trimmed) && !insideCode(ancestors)) {
        const at = node.start + raw.indexOf(trimmed)
        edits.push({ start: at, end: at + trimmed.length, text: `{t('${key(trimmed)}')}` })
      }
      return
    }
    // 2. atributos de UI
    if (node.type === 'JSXAttribute' && UI_ATTRS.has(node.name?.name) && node.value?.type === 'StringLiteral' && isUi(node.value.value)) {
      return push(node.value, `{t('${key(node.value.value)}')}`)
    }
    // 3. string dentro de expresión JSX
    if (node.type === 'JSXExpressionContainer' && node.expression?.type === 'StringLiteral' && isUi(node.expression.value)) {
      return push(node.expression, `t('${key(node.expression.value)}')`)
    }
    // 4. template literal (dentro de JSX o de una función)
    if (node.type === 'TemplateLiteral' && (insideJsx(ancestors) || insideFn(ancestors)) && !insideDeniedAttr(ancestors) && !insideCode(ancestors)) {
      const quasis = node.quasis.map((q) => q.value.cooked ?? q.value.raw)
      const vars = []
      let text = quasis[0]
      for (let i = 0; i < node.expressions.length; i += 1) {
        const expr = node.expressions[i]
        let name = expr.type === 'Identifier' ? expr.name : `v${i}`
        while (vars.some((v) => v.name === name)) name = `${name}_`
        vars.push({ name, src: code.slice(expr.start, expr.end) })
        text += `{${name}}` + quasis[i + 1]
      }
      if (!isUi(text)) return
      if (/[\\/]/.test(text) && !/\s/.test(text)) return
      const k = key(text)
      return push(node, vars.length === 0 ? `t('${k}')` : `t('${k}', { ${vars.map((v) => `${v.name}: ${v.src}`).join(', ')} })`)
    }
    // 5. propiedad de objeto de MÓDULO → getter (sigue al idioma)
    if (node.type === 'ObjectProperty' && node.value?.type === 'StringLiteral' && node.key?.type === 'Identifier' &&
      UI_KEYS.has(node.key.name) && !insideFn(ancestors) && !insideJsx(ancestors) && isUi(node.value.value)) {
      return push(node, `get ${node.key.name}() { return t('${key(node.value.value)}') }`)
    }
    // 6/7. propiedad de objeto en función → t(); comandos → clave
    if (node.type === 'ObjectProperty' && node.value?.type === 'StringLiteral' && isUi(node.value.value) &&
      (insideFn(ancestors) || insideJsx(ancestors))) {
      const object = ancestors[ancestors.length - 1]
      const isCommand = object?.type === 'ObjectExpression' &&
        object.properties.some((p) => (p.key?.name ?? p.key?.value) === 'run')
      const name = node.key?.type === 'Identifier' ? node.key.name : node.key?.value
      if (isCommand && name === 'title') return push(node.value, `'${key(node.value.value)}'`)
      if (UI_KEYS.has(name)) return push(node.value, `t('${key(node.value.value)}')`)
      return
    }
    // comandos ya migrados: title: t('x') → title: 'x'
    if (node.type === 'ObjectProperty' && node.key?.name === 'title' && node.value?.type === 'CallExpression' &&
      node.value.callee?.name === 't' && node.value.arguments?.[0]?.type === 'StringLiteral') {
      const object = ancestors[ancestors.length - 1]
      const isCommand = object?.type === 'ObjectExpression' &&
        object.properties.some((p) => (p.key?.name ?? p.key?.value) === 'run')
      if (isCommand) return push(node.value, `'${node.value.arguments[0].value}'`)
      return
    }
    // 8. argumento de función de app
    if (node.type === 'CallExpression' && node.callee?.type === 'Identifier' && !inSet(DENY_CALLS, node.callee.name)) {
      for (const arg of node.arguments) {
        if (arg.type === 'StringLiteral' && isUi(arg.value)) push(arg, `t('${key(arg.value)}')`)
      }
      return
    }
    // 9. new Error('…')
    if (node.type === 'NewExpression' && node.callee?.name === 'Error' && node.arguments?.[0]?.type === 'StringLiteral' && isUi(node.arguments[0].value)) {
      return push(node.arguments[0], `t('${key(node.arguments[0].value)}')`)
    }
    // 10. return / variable / asignación / ternario / array / ||
    if (node.type === 'ReturnStatement' && node.argument?.type === 'StringLiteral' && isUi(node.argument.value)) {
      return push(node.argument, `t('${key(node.argument.value)}')`)
    }
    if (node.type === 'VariableDeclarator' && node.init?.type === 'StringLiteral' && isUi(node.init.value)) {
      return push(node.init, `t('${key(node.init.value)}')`)
    }
    if (node.type === 'AssignmentExpression' && node.right?.type === 'StringLiteral' && isUi(node.right.value)) {
      return push(node.right, `t('${key(node.right.value)}')`)
    }
    if (node.type === 'LogicalExpression' && node.right?.type === 'StringLiteral' && isUi(node.right.value)) {
      return push(node.right, `t('${key(node.right.value)}')`)
    }
    if (node.type === 'ConditionalExpression' || node.type === 'ArrayExpression') {
      const values = node.type === 'ArrayExpression' ? node.elements : [node.consequent, node.alternate]
      for (const value of values) {
        if (value?.type === 'StringLiteral' && isUi(value.value)) push(value, `t('${key(value.value)}')`)
      }
    }
  })

  if (edits.length === 0) continue
  edits.sort((a, b) => b.start - a.start)
  for (const edit of edits) code = code.slice(0, edit.start) + edit.text + code.slice(edit.end)

  const importPath = rel.startsWith('src/main') ? '@shared/i18n' : '@core/i18n'
  if (!code.includes(`from '${importPath}'`)) {
    const imports = [...code.matchAll(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm)]
    if (imports.length > 0) {
      const last = imports[imports.length - 1]
      const at = last.index + last[0].length
      code = `${code.slice(0, at)}\nimport { t } from '${importPath}'${code.slice(at)}`
    }
  }

  totalEdits += edits.length
  changed.push([edits.length, rel])
  if (APPLY) writeFileSync(file, code)
}

console.log(`\n${APPLY ? 'APLICADO' : 'DRY RUN'} · ${changed.length} archivos · ${totalEdits} reemplazos`)
console.log('nuevas claves:', Object.values(additions).reduce((n, a) => n + Object.keys(a).length, 0))

if (APPLY) {
  for (const [area, entries] of Object.entries(additions)) {
    const file = join(CATALOGS, 'es', `${area}.json`)
    const existing = existsSync(file) ? JSON.parse(readFileSync(file, 'utf-8')) : {}
    const merged = { ...existing, ...entries }
    const sorted = {}
    for (const k of Object.keys(merged).sort()) sorted[k] = merged[k]
    writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`)
  }
  // Quita imports de `t` que quedaron sin uso (los títulos de comando pasaron
  // a ser claves resueltas por `msg()`).
  spawnSync('node', [join(ROOT, 'tools/i18n.mjs'), '--sync'], { stdio: 'ignore' })
  console.log('catálogos actualizados · corré `node tools/i18n.mjs --translate <lang>`')
}
