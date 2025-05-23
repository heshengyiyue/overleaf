import { useProjectSettingsContext } from '@/features/editor-left-menu/context/project-settings-context'
import {
  Dropdown,
  DropdownMenu,
  DropdownToggle,
} from '@/features/ui/components/bootstrap-5/dropdown-menu'
import OLButton from '@/features/ui/components/ol/ol-button'
import OLModal, {
  OLModalBody,
  OLModalFooter,
  OLModalHeader,
  OLModalTitle,
} from '@/features/ui/components/ol/ol-modal'
import MaterialIcon from '@/shared/components/material-icon'
import useEventListener from '@/shared/hooks/use-event-listener'
import { FC, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  useCodeMirrorStateContext,
  useCodeMirrorViewContext,
} from './codemirror-context'
import { mathPreviewStateField } from '../extensions/math-preview'
import { getTooltip } from '@codemirror/view'
import ReactDOM from 'react-dom'
import OLDropdownMenuItem from '@/features/ui/components/ol/ol-dropdown-menu-item'
import { useIsNewEditorEnabled } from '@/features/ide-redesign/utils/new-editor-utils'

const MathPreviewTooltipContainer: FC = () => {
  const state = useCodeMirrorStateContext()
  const view = useCodeMirrorViewContext()

  const mathPreviewState = state.field(mathPreviewStateField, false)

  if (!mathPreviewState) {
    return null
  }

  const { tooltip, mathContent } = mathPreviewState

  if (!tooltip || !mathContent) {
    return null
  }

  const tooltipView = getTooltip(view, tooltip)

  if (!tooltipView) {
    return null
  }

  return ReactDOM.createPortal(
    <MathPreviewTooltip mathContent={mathContent} />,
    tooltipView.dom
  )
}

const MathPreviewTooltip: FC<{ mathContent: HTMLDivElement }> = ({
  mathContent,
}) => {
  const { t } = useTranslation()

  const newEditor = useIsNewEditorEnabled()

  const [showDisableModal, setShowDisableModal] = useState(false)
  const { setMathPreview } = useProjectSettingsContext()
  const openDisableModal = useCallback(() => setShowDisableModal(true), [])
  const closeDisableModal = useCallback(() => setShowDisableModal(false), [])

  const onHide = useCallback(() => {
    window.dispatchEvent(new Event('editor:hideMathTooltip'))
  }, [])

  const mathRef = useRef<HTMLSpanElement>(null)

  const keyDownListener = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onHide()
      }
    },
    [onHide]
  )

  useEventListener('keydown', keyDownListener)

  useLayoutEffect(() => {
    if (mathRef.current) {
      mathRef.current.replaceChildren(mathContent)
    }
  }, [mathContent])

  return (
    <>
      <div className="ol-cm-math-tooltip">
        <span ref={mathRef} />

        <Dropdown align="end">
          <DropdownToggle
            id="some-id"
            className="math-tooltip-options-toggle"
            variant="secondary"
            size="sm"
          >
            <MaterialIcon
              type="more_vert"
              accessibilityLabel={t('more_options')}
            />
          </DropdownToggle>
          <DropdownMenu flip={false}>
            <OLDropdownMenuItem
              onClick={onHide}
              description={t('temporarily_hides_the_preview')}
              trailingIcon={
                <span className="math-tooltip-options-keyboard-shortcut">
                  Esc
                </span>
              }
            >
              {t('hide')}
            </OLDropdownMenuItem>
            <OLDropdownMenuItem
              onClick={openDisableModal}
              description={t('permanently_disables_the_preview')}
            >
              {t('disable')}
            </OLDropdownMenuItem>
          </DropdownMenu>
        </Dropdown>
      </div>

      {showDisableModal && (
        <OLModal show onHide={closeDisableModal}>
          <OLModalHeader>
            <OLModalTitle>{t('disable_equation_preview')}</OLModalTitle>
          </OLModalHeader>

          <OLModalBody>
            {t('disable_equation_preview_confirm')}
            <br />
            {newEditor ? (
              <Trans
                i18nKey="disable_equation_preview_enable_in_settings"
                components={{ b: <strong /> }}
              />
            ) : (
              <Trans
                i18nKey="disable_equation_preview_enable"
                components={{ b: <strong /> }}
              />
            )}
          </OLModalBody>

          <OLModalFooter>
            <OLButton variant="secondary" onClick={closeDisableModal}>
              {t('cancel')}
            </OLButton>
            <OLButton variant="danger" onClick={() => setMathPreview(false)}>
              {t('disable')}
            </OLButton>
          </OLModalFooter>
        </OLModal>
      )}
    </>
  )
}

export default MathPreviewTooltipContainer
