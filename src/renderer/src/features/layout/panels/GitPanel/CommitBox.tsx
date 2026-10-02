// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Caja de commit del panel de Git — con su PROPIO estado.
 *
 * Antes el mensaje vivía en el componente del panel (1500+ líneas con ramas,
 * historial, diffs, PRs y el árbol), así que **cada tecla re-renderizaba el
 * panel entero** — y con él el árbol, porque los `rowActions`/`onLasso` se
 * rehacían y el `memo` de cada fila fallaba.
 *
 * Dos decisiones acá:
 *
 * 1. El estado vive en este componente (`memo`), así escribir no toca al panel.
 * 2. El `<textarea>` es **no controlado** y solo se re-renderiza cuando cruza el
 *    borde "hay texto / no hay texto" (que es lo único que habilita botones).
 *    Teclear 40 caracteres = 4 renders en total (ida y vuelta del borde), no 40.
 *    Mismo criterio que el scroll del explorer, que solo actualiza al cruzar
 *    una fila.
 */

import { memo, useCallback, useRef, useState, type ChangeEvent, type JSX } from 'react'
import { ProductIcon } from '@services/productIcons/components'
import { t } from '@core/i18n'
import styles from './GitPanel.module.css'

interface CommitBoxProps {
  /** Hay algo preparado en el índice (habilita **Commit**). */
  hasStaged: boolean
  /** Hay algún cambio sin commitear (habilita **Todo**). */
  hasChanges: boolean
  /** Commit en curso: se bloquean los dos botones. */
  committing: boolean
  /**
   * Ejecuta el commit con el mensaje del input.
   *
   * Devuelve `true` si salió bien: recién ahí se limpia el input (si falla, el
   * mensaje queda para reintentar sin volver a escribirlo).
   */
  onCommit: (message: string, stageAll: boolean) => Promise<boolean>
}

export const CommitBox = memo(function CommitBox({
  hasStaged,
  hasChanges,
  committing,
  onCommit
}: CommitBoxProps): JSX.Element {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  /** Solo el borde "vacío / con texto": es lo único que cambia los botones. */
  const [hasText, setHasText] = useState(false)

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      const next = event.target.value.trim().length > 0
      if (next !== hasText) setHasText(next)
    },
    [hasText]
  )

  const run = useCallback(
    async (stageAll: boolean): Promise<void> => {
      const el = inputRef.current
      const text = el?.value.trim() ?? ''
      if (!text || committing) return
      if (await onCommit(text, stageAll)) {
        // Limpieza imperativa: el textarea no está controlado por React.
        if (el) el.value = ''
        setHasText(false)
      }
    },
    [committing, onCommit]
  )

  return (
    <div className={styles.commitBox}>
      <textarea
        ref={inputRef}
        className={styles.commitInput}
        onChange={handleChange}
        placeholder={t('git.mensaje.de.commit')}
        aria-label={t('git.mensaje.de.commit-2')}
        rows={2}
        spellCheck={false}
      />
      <div className={styles.commitActions}>
        <button
          type="button"
          className={styles.primary}
          disabled={committing || !hasText || !hasStaged}
          onClick={() => void run(false)}
        >
          <ProductIcon id="check" size={14} />
          {t('git.commit')}
        </button>
        <button
          type="button"
          className={styles.ghost}
          disabled={committing || !hasText || !hasChanges}
          title={t('git.stage.todo.commit')}
          onClick={() => void run(true)}
        >
          {t('git.todo')}
        </button>
      </div>
    </div>
  )
})