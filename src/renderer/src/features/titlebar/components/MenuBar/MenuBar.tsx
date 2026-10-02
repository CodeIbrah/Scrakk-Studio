// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent
} from 'react'
import { Modal, ContextMenu, type ContextMenuItem } from '@ui'
import { isHistoryViewOpen, setSkillsViewOpen, subscribeToHistoryView, toggleHistoryView, useLayout } from '@features/layout'
import { getEditorFiles, requestCloseFile } from '@features/editor'
import { openFilesViaDialog, openFolderViaDialog } from '@features/explorer'
import { useTheme } from '@core/theme/ThemeProvider'
import styles from './MenuBar.module.css'

import { t, useLocale } from '@core/i18n'
type MenuId = 'file' | 'edit' | 'view' | 'help'

const MENU_IDS: MenuId[] = ['file', 'edit', 'view', 'help']

function runCommand(command: string): void {
  try {
    document.execCommand(command)
  } catch {
    // Comando no soportado por el entorno: no-op.
  }
}

/**
 * Barra de menús de la titlebar (Archivo / Editar / Ver / Ayuda).
 * Usa el sistema centralizado de ContextMenu para renderizar los dropdowns
 * vía portal y alineados a cada botón.
 */
export function MenuBar(): JSX.Element {
  const { theme, toggleTheme } = useTheme()
  const { slots, toggleSlotPanel, openPanelTab } = useLayout()

  // El historial ya no es un panel: es una vista dentro del chat. El menú
  // Ver necesita su estado para el check, así que se suscribe al store.
  const [historyOpen, setHistoryOpen] = useState(() => isHistoryViewOpen())
  useEffect(() => subscribeToHistoryView(() => setHistoryOpen(isHistoryViewOpen())), [])

  const [openMenu, setOpenMenu] = useState<MenuId | null>(null)
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<MenuId, HTMLButtonElement>>(new Map())

  const close = useCallback(() => {
    setOpenMenu(null)
    setAnchor(null)
  }, [])

  const openMenuFor = useCallback((menuId: MenuId): void => {
    const btn = buttonRefs.current.get(menuId)
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    setAnchor({ x: rect.left, y: rect.bottom + 2 })
    setOpenMenu(menuId)
  }, [])

  // ── Acciones del menú Archivo ────────────────────────────────────────────
  // Salen de `@features/explorer` (mismas que la bienvenida): antes estaban
  // duplicadas acá y allá.
  const closeActiveFile = useCallback((): void => {
    const { activePath } = getEditorFiles()
    // Guardia dirty: ofrece Guardar/Cerrar sin guardar antes de tirar el buffer.
    if (activePath) requestCloseFile(activePath)
  }, [])

  const locale = useLocale()
  const menuDefinitions = useMemo<Record<MenuId, { label: string; items: ContextMenuItem[] }>>(() => {
    return {
      file: {
        label: t('menu.file'),
        items: [
          {
            label: t('menu.file.openFile'),
            shortcut: 'Ctrl+O',
            onClick: () => void openFilesViaDialog()
          },
          {
            label: t('menu.file.openFolder'),
            shortcut: 'Ctrl+Shift+O',
            onClick: () => void openFolderViaDialog()
          },
          {
            label: t('menu.file.closeFile'),
            shortcut: 'Ctrl+W',
            separatorBefore: true,
            onClick: closeActiveFile
          },
          {
            label: t('menu.file.closeWindow'),
            shortcut: 'Alt+F4',
            separatorBefore: true,
            onClick: () => window.api?.windowControls.close()
          }
        ]
      },
      edit: {
        label: t('menu.edit'),
        items: [
          {
            label: t('menu.edit.copy'),
            shortcut: 'Ctrl+C',
            onClick: () => runCommand('copy')
          },
          {
            label: t('menu.edit.paste'),
            shortcut: 'Ctrl+V',
            onClick: () => runCommand('paste')
          },
          {
            label: t('menu.edit.selectAll'),
            shortcut: 'Ctrl+A',
            separatorBefore: true,
            onClick: () => runCommand('selectAll')
          }
        ]
      },
      view: {
        label: t('menu.view'),
        items: [
          {
            label: theme === 'dark' ? t('menu.view.lightMode') : t('menu.view.darkMode'),
            onClick: toggleTheme
          },
          {
            label: t('menu.view.chatPanel'),
            checked: slots.right === 'chat',
            separatorBefore: true,
            onClick: () => toggleSlotPanel('right', 'chat')
          },
          {
            label: t('menu.view.chatHistory'),
            checked: historyOpen,
            onClick: () => {
              openPanelTab('right', 'chat')
              // Abrir historial cierra la vista de skills (comparten el panel).
              setSkillsViewOpen(false)
              toggleHistoryView()
            }
          },
          {
            label: t('menu.view.explorerPanel'),
            checked: slots.left === 'explorer',
            onClick: () => toggleSlotPanel('left', 'explorer')
          }
        ]
      },
      help: {
        label: t('menu.help'),
        items: [
          {
            label: t('menu.help.about'),
            onClick: () => setAboutOpen(true)
          }
        ]
      }
    }
  }, [
    locale,
    theme,
    toggleTheme,
    slots,
    toggleSlotPanel,
    openPanelTab,
    historyOpen,
    openFilesViaDialog,
    openFolderViaDialog,
    closeActiveFile
  ])

  const handleButtonClick = (menuId: MenuId): void => {
    if (openMenu === menuId) {
      close()
    } else {
      openMenuFor(menuId)
    }
  }

  const handleButtonEnter = (menuId: MenuId): void => {
    if (openMenu && openMenu !== menuId) {
      openMenuFor(menuId)
    }
  }

  const handleButtonKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    menuId: MenuId
  ): void => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openMenuFor(menuId)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const index = MENU_IDS.indexOf(menuId)
      const direction = event.key === 'ArrowRight' ? 1 : -1
      const nextId = MENU_IDS[(index + direction + MENU_IDS.length) % MENU_IDS.length]
      const nextBtn = buttonRefs.current.get(nextId)
      nextBtn?.focus()
      if (openMenu) {
        openMenuFor(nextId)
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  return (
    <div
      ref={rootRef}
      className={styles.menubar}
      role="menubar"
      aria-label={t('titlebar.menu.de.la.aplicacion')}
    >
      {MENU_IDS.map((menuId) => {
        const menu = menuDefinitions[menuId]
        const isOpen = openMenu === menuId
        const buttonClasses = [styles.button, isOpen ? styles.buttonOpen : null]
          .filter(Boolean)
          .join(' ')

        return (
          <div key={menuId} className={styles.menu}>
            <button
              ref={(node) => {
                if (node) buttonRefs.current.set(menuId, node)
                else buttonRefs.current.delete(menuId)
              }}
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={isOpen}
              className={buttonClasses}
              onClick={() => handleButtonClick(menuId)}
              onMouseEnter={() => handleButtonEnter(menuId)}
              onKeyDown={(event) => handleButtonKeyDown(event, menuId)}
            >
              {menu.label}
            </button>
          </div>
        )
      })}
      <div className={styles.menu}>
        <button
          type="button"
          role="menuitem"
          className={styles.button}
          onClick={() => toggleSlotPanel('bottom', 'innerta-terminal')}
        >
          {t('titlebar.terminal')}
        </button>
      </div>

      {openMenu && anchor ? (
        <ContextMenu
          items={menuDefinitions[openMenu].items}
          x={anchor.x}
          y={anchor.y}
          onClose={close}
        />
      ) : null}

      <Modal open={aboutOpen} onClose={() => setAboutOpen(false)} title={t('titlebar.acerca.de.scrakk.studio')}>
        <div className={styles.about}>
          <p>
            <strong>{t('titlebar.scrakk.studio')}</strong> {t('titlebar.chat.modular.para.agentes.ia')}
          </p>
          <p>
            {t('titlebar.react.typescript.electron.sistema.de')}
          </p>
          <p className={styles.aboutVersion}>v{__APP_VERSION__}</p>
        </div>
      </Modal>
    </div>
  )
}