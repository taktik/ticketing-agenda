import { Button, ConfigProvider, Modal, Popconfirm } from 'antd'
import React, { CSSProperties, ReactElement } from 'react'

import { DEFAULT_MODAL_WIDTH } from '../../../constants'
import { breakpoints, getWindowSize } from '../../../helpers/windowSize'

interface CustomModalProps {
  isVisible: boolean
  handleClose: () => void
  handleClickPrimaryBtn?: (value: unknown) => void
  handleClickSecondaryBtn?: () => void
  handleClickDeleteBtn?: () => void
  primaryBtnTitle?: string | ReactElement
  secondaryBtnTitle?: string
  deleteBtnTitle?: string
  children: ReactElement
  width?: number
  title: string
  customFooter?: ReactElement[]
  mode?: 'danger' | undefined
  primaryBtnDisabled?: boolean
  closable?: boolean
  blockAntModalBodyVerticalScroll?: boolean
  noFooter?: boolean
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
  handleClickDeleteBtn,
  primaryBtnTitle,
  secondaryBtnTitle,
  deleteBtnTitle,
  children,
  width,
  title,
  customFooter,
  mode,
  primaryBtnDisabled,
  closable,
  blockAntModalBodyVerticalScroll,
  noFooter,
}: CustomModalProps): ReactElement => {
  const { innerWidth } = getWindowSize()
  const modalStyles: { [key: string]: CSSProperties } = {
    header: {
      borderBottom: mode === 'danger' ? `1px solid #FAD1D1` : `1px solid #DCE7F2`,
      padding: innerWidth < breakpoints.md ? '16px' : '20px 24px',
      background: mode === 'danger' ? '#FDF3F3' : '#F4F4F4',
      borderRadius: '8px 8px 0px 0px',
      margin: 0,
    },
    mask: {
      background: 'rgba(8, 75, 131, 0.5)',
    },
    footer: {
      display: noFooter ? 'none' : 'inherit',
      borderTop: mode === 'danger' ? `1px solid #FAD1D1` : `1px solid #DCE7F2`,
      padding: innerWidth < breakpoints.md ? '16px' : '20px 24px',
      margin: 0,
      background: 'white',
    },
    content: {
      padding: 0,
      background: 'white',
      borderRadius: 0,

      maxHeight: '100%',
      height: innerWidth < breakpoints.md ? '100%' : 'auto',
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
    const deleteButton = deleteBtnTitle && handleClickDeleteBtn && (
      <Button type="primary" danger key="tertiary" onClick={handleClickDeleteBtn}>
        {deleteBtnTitle}
      </Button>
    )

    const secondaryButton = secondaryBtnTitle && handleClose && (
      <Button key="back" onClick={handleClickSecondaryBtn ?? handleClose}>
        {secondaryBtnTitle}
      </Button>
    )

    const primaryButton = primaryBtnTitle && handleClickPrimaryBtn && (
      <Button key="submit" type="primary" danger={mode === 'danger'} onClick={handleClickPrimaryBtn} disabled={primaryBtnDisabled}>
        {primaryBtnTitle}
      </Button>
    )

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <div>{deleteButton}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {secondaryButton}
          {primaryButton}
        </div>
      </div>
    )
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
