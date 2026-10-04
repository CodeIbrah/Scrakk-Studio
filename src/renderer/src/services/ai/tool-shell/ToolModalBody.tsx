// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * ToolModalBody — primitivas del CUERPO de los modales de tools.
 *
 * El modal genérico (`ToolResultModal`) pone el header (ícono + label + estado
 * + cerrar) y el scroll; cada tool pinta su interior con esto. Así todos se
 * ven igual sin que cada `modal/` replique layout ni CSS.
 */

import type { JSX, ReactNode } from 'react'
import { ProductIcon } from '@services/productIcons/components'
import styles from './ToolModalBody.module.css'

/** Sección con caption opcional (p. ej. "Salida"). */
export function ToolModalSection({
  title,
  children
}: {
  title?: ReactNode
  children: ReactNode
}): JSX.Element {
  return (
    <section className={styles.section}>
      {title !== undefined ? <h4 className={styles.caption}>{title}</h4> : null}
      {children}
    </section>
  )
}

/** Bloque monoespaciado: contenido de archivos, salida de comandos, etc. */
export function ToolModalCode({ children }: { children: ReactNode }): JSX.Element {
  return <pre className={styles.code}>{children}</pre>
}

/** Párrafo normal. */
export function ToolModalText({ children }: { children: ReactNode }): JSX.Element {
  return <p className={styles.text}>{children}</p>
}

/** Texto vacío / sin datos. */
export function ToolModalEmpty({ children }: { children: ReactNode }): JSX.Element {
  return <p className={styles.empty}>{children}</p>
}

/** Lista vertical de filas. */
export function ToolModalList({ children }: { children: ReactNode }): JSX.Element {
  return <ul className={styles.list}>{children}</ul>
}

export interface ToolModalRowProps {
  /** Id de productIcons (p. ej. 'folder', 'file-text'). */
  icon?: string
  title: ReactNode
  detail?: ReactNode
  meta?: ReactNode
  tone?: 'default' | 'muted' | 'danger' | 'success'
  monospace?: boolean
}

/** Fila: ícono + título + detalle + meta a la derecha. */
export function ToolModalRow({
  icon,
  title,
  detail,
  meta,
  tone = 'default',
  monospace = false
}: ToolModalRowProps): JSX.Element {
  return (
    <li className={styles.row} data-tone={tone}>
      {icon ? (
        <span className={styles.rowIcon} aria-hidden="true">
          <ProductIcon id={icon} size={14} />
        </span>
      ) : null}
      <span className={styles.rowMain}>
        <span className={styles.rowTitle} data-mono={monospace ? '' : undefined}>
          {title}
        </span>
        {detail !== undefined ? <span className={styles.rowDetail}>{detail}</span> : null}
      </span>
      {meta !== undefined ? <span className={styles.rowMeta}>{meta}</span> : null}
    </li>
  )
}

/** Tabla de detalles: label + valor (ruta, líneas, estado…). */
export function ToolModalMeta({
  items
}: {
  items: Array<{ label: ReactNode; value: ReactNode }>
}): JSX.Element {
  return (
    <dl className={styles.meta}>
      {items.map((item, index) => (
        <div key={index} className={styles.metaItem}>
          <dt className={styles.metaLabel}>{item.label}</dt>
          <dd className={styles.metaValue}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Chip de estado (exit code, success/error, etc.). */
export function ToolModalBadge({
  tone = 'muted',
  children
}: {
  tone?: 'muted' | 'danger' | 'success' | 'accent'
  children: ReactNode
}): JSX.Element {
  return (
    <span className={styles.badge} data-tone={tone}>
      {children}
    </span>
  )
}
