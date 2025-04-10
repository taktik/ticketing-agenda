import { Button, ConfigProvider, Modal } from 'antd'
import React, { CSSProperties, ReactElement } from 'react'

import { DEFAULT_MODAL_WIDTH } from '../../../constants'
import { breakpoints, getWindowSize } from '../../../helpers/windowSize'

interface PatientFormModalProps {
  isVisible: boolean
  handleClose: () => void
  secondaryBtnTitle?: string
  handleClickSecondaryBtn?: () => void
  handleClickPrimaryBtn?: (value: unknown) => void
  primaryBtnTitle?: string | ReactElement
  children: ReactElement
  width?: number
  title: string
  customFooter?: ReactElement[]
  mode?: 'danger' | undefined
  primaryBtnDisabled?: boolean
  closable?: boolean
  blockAntModalBodyVerticalScroll?: boolean
}

export const getCustomModalResponsiveStyles = (mobileViewCondition: boolean) => {
  if (mobileViewCondition) {
    return {
      margin: 0,
      top: 0,
      height: '100vh',
      paddingTop: 20,
      paddingBottom: 0,
      display: 'flex',
      overflow: 'hidden',
      maxWidth: '100vw',
      width: '100vw',
    }
  } else {
    return {
      top: '5%',
      height: 'calc(100vh - 5%)',
      display: 'flex',
      overflow: 'hidden',
      maxWidth: '100vw',
      width: '100vw',
    }
  }
}

export const CustomModal = ({
  isVisible,
  handleClose,
  handleClickPrimaryBtn,
  handleClickSecondaryBtn,
  children,
  width,
  title,
  secondaryBtnTitle,
  primaryBtnTitle,
  customFooter,
  mode,
  primaryBtnDisabled,
  closable,
  blockAntModalBodyVerticalScroll,
}: PatientFormModalProps): ReactElement => {
  const { innerWidth } = getWindowSize()
  const modalStyles: { [key: string]: CSSProperties } = {
    header: {
      borderBottom: mode === 'danger' ? `1px solid #FAD1D1` : `1px solid #DCE7F2`,
      padding: innerWidth < breakpoints.md ? '16px' : '20px 24px',
      background: mode === 'danger' ? '#FDF3F3' : '#EEF6FE',
      borderRadius: '8px 8px 0px 0px',
      margin: 0,
    },
    mask: {
      background: 'rgba(8, 75, 131, 0.5)',
    },
    footer: {
      borderTop: mode === 'danger' ? `1px solid #FAD1D1` : `1px solid #DCE7F2`,
      padding: innerWidth < breakpoints.md ? '16px' : '20px 24px',
      margin: 0,
      background: 'white',
    },
    content: {
      padding: 0,
      background: 'white',

      maxHeight: '100%',
      height: innerWidth < breakpoints.md || blockAntModalBodyVerticalScroll ? '100%' : 'auto',
      width: '100vw',
      maxWidth: innerWidth < breakpoints.md ? '100vw' : (width ?? DEFAULT_MODAL_WIDTH),

      display: 'flex',
      flexDirection: 'column',
      paddingBottom: 0,
      overflow: 'hidden',
    },
    body: {
      flex: 1,
      display: 'flex',
      overflowY: blockAntModalBodyVerticalScroll ? 'hidden' : 'scroll',
    },
  }

  const getFooter = () => {
    if (customFooter) {
      return customFooter
    }

    return [
      secondaryBtnTitle && handleClose && (
        <Button key="back" onClick={handleClickSecondaryBtn ?? handleClose}>
          {secondaryBtnTitle}
        </Button>
      ),
      primaryBtnTitle && handleClickPrimaryBtn && (
        <Button key="submit" type="primary" danger={mode === 'danger'} onClick={handleClickPrimaryBtn} disabled={primaryBtnDisabled}>
          {primaryBtnTitle}
        </Button>
      ),
    ]
  }

  return (
    <ConfigProvider
      modal={{
        styles: modalStyles,
      }}
    >
      <Modal
        closable={closable ?? true}
        maskClosable={false}
        open={isVisible}
        title={title}
        onCancel={handleClose}
        footer={getFooter()}
        style={getCustomModalResponsiveStyles(innerWidth < breakpoints.md)}
        width={innerWidth < breakpoints.md ? '100vw' : (width ?? DEFAULT_MODAL_WIDTH)}
      >
        {children}
      </Modal>
    </ConfigProvider>
  )
}
