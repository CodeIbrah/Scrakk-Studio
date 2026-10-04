// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Resultado de una tool, en un modal.
 *
 * Mismo patrón que el chat del subagente (`variant: 'plain'` montado dentro del
 * panel de chat): la fila de la tool es clickeable y acá se ve **qué recibió**
 * la IA — el resultado completo, que en la línea del chat no entra.
 *
 * OJO con el `plain`: el host NO aporta header, título visible ni padding (el
 * `spec.title` sólo se usa como `aria-label`). Todo eso lo pone esta vista.
 *
 * La interacción la decide cada tool con su `onOpen`: las que declaran `'self'`
 * (el subagente) nunca llegan acá.
 */

import type { JSX } from 'react'
import { showModal } from '@services/modals'
import { ToolCallIcon } from './ToolCallIcon'
import type { ToolModalBody, ToolModalContext } from '../tools/types'
import { t } from '@core/i18n'
import styles from './ToolResultModal.module.css'

export interface ToolResultInput {
  /** Nombre visible de la tool (ya resuelto). */
  label: string
  /** Nombre técnico de la tool: resuelve el ícono con el mapa canónico. */
  toolName: string
  /** Argumentos con los que se llamó. */
  args: Record<string, unknown>
  /** Resultado devuelto (texto). */
  result?: string
  /** `success` | `error` | `running`… */
  status: string
  /** Contexto extra que la tool pueda necesitar en su modal. */
  runId?: string
  toolCallId?: string
  originalContent?: string
  modifiedContent?: string
  /**
   * Cuerpo custom de la tool (su carpeta `modal/`). Si está, reemplaza el
   * volcado genérico de args + salida.
   */
  modal?: ToolModalBody
}

function statusLabel(status: string): string {
  if (status === 'error') return t('chat.tool.fallo')
  if (status === 'running' || status === 'streaming' || status === 'pending') {
    return t('chat.tool.corriendo')
  }
  return t('chat.tool.listo')
}

function ToolResultView({ onClose, ...input }: ToolResultInput & { onClose: () => void }): JSX.Element {
  const {
    label,
    toolName,
    args,
    result,
    status,
    runId,
    toolCallId,
    originalContent,
    modifiedContent,
    modal
  } = input
  // API que recibe el cuerpo custom de la tool (su carpeta `modal/`).
  const modalContext: ToolModalContext = {
    args,
    result,
    status,
    runId,
    toolCallId,
    originalContent,
    modifiedContent,
    close: onClose
  }
  const ModalBody = modal

  return (
    <div className={styles.panel}>
      <header className={styles.head}>
        <ToolCallIcon toolName={toolName} size={14} />
        <span className={styles.title}>{label}</span>
        <span className={styles.status} data-status={status}>
          {statusLabel(status)}
        </span>
        <button type="button" className={styles.close} onClick={onClose}>
          {t('common.cerrar')}
        </button>
      </header>

      <div className={styles.body}>
        {ModalBody ? (
          <ModalBody {...modalContext} />
        ) : (
          <ToolResultDefaultBody args={args} result={result} status={status} />
        )}
      </div>
    </div>
  )
}

/** Fallback: volcado crudo de argumentos + salida (lo que se veía antes). */
function ToolResultDefaultBody({
  args,
  result,
  status
}: {
  args: Record<string, unknown>
  result?: string
  status: string
}): JSX.Element {
  const hasArgs = Object.keys(args).length > 0
  const running = status === 'running' || status === 'streaming' || status === 'pending'
  return (
    <>
      {hasArgs ? (
        <section className={styles.section}>
          <h4 className={styles.caption}>{t('chat.tool.argumentos')}</h4>
          <pre className={styles.code}>{JSON.stringify(args, null, 2)}</pre>
        </section>
      ) : null}

      <section className={styles.section}>
        <h4 className={styles.caption}>{t('chat.tool.salida')}</h4>
        {result ? (
          <pre className={styles.code}>{result}</pre>
        ) : (
          <p className={styles.empty}>
            {running ? t('chat.tool.todavia.corriendo') : t('chat.tool.sin.salida')}
          </p>
        )}
      </section>
    </>
  )
}

/** Abre el modal con el resultado de esa tool. */
export function openToolResultModal(input: ToolResultInput): void {
  showModal({
    title: input.label,
    variant: 'plain',
    portalSelector: '[data-modal-portal="chat"]',
    render: ({ close }) => <ToolResultView {...input} onClose={close} />
  })
}