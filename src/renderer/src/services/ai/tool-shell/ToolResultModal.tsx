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
 * Solo se abre para las tools SIN visual propio (`renderBody`): las que lo
 * tienen (el subagente, los diffs…) ya saben qué hacer al click y no queremos
 * pisarles la interacción.
 */

import type { JSX } from 'react'
import { showModal } from '@services/modals'
import { t } from '@core/i18n'
import styles from './ToolResultModal.module.css'

export interface ToolResultInput {
  /** Nombre visible de la tool (ya resuelto). */
  label: string
  /** Argumentos con los que se llamó. */
  args: Record<string, unknown>
  /** Resultado devuelto (texto). */
  result?: string
  /** `success` | `error` | `running`… */
  status: string
}

function ToolResultView({
  args,
  result,
  status,
  onClose
}: ToolResultInput & { onClose: () => void }): JSX.Element {
  const hasArgs = Object.keys(args).length > 0
  const isError = status === 'error'

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.status} data-error={isError ? '' : undefined}>
          {isError ? t('chat.tool.fallo') : t('chat.tool.resultado')}
        </span>
        <button type="button" className={styles.close} onClick={onClose}>
          {t('common.cerrar')}
        </button>
      </div>

      {hasArgs ? (
        <>
          <h4 className={styles.caption}>{t('chat.tool.argumentos')}</h4>
          <pre className={styles.code}>{JSON.stringify(args, null, 2)}</pre>
        </>
      ) : null}

      <h4 className={styles.caption}>{t('chat.tool.salida')}</h4>
      {result ? (
        <pre className={styles.code}>{result}</pre>
      ) : (
        <p className={styles.empty}>
          {status === 'running' ? t('chat.tool.todavia.corriendo') : t('chat.tool.sin.salida')}
        </p>
      )}
    </div>
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