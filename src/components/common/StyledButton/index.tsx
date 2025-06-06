import type { ButtonProps } from 'antd'
import { Button } from 'antd'
import React from 'react'
import './index.css'

export enum ButtonStyleType {
  Default = 'defaultAntd',
  Icon = 'icon',
  Warning = 'warning',
  Success = 'success',
  NoBorder = 'noBorder',
  BlackTheme = 'blackTheme',
  BlackThemeActive = 'blackThemeActive',
  RedTheme = 'redTheme',
}

export interface StyledButtonProps extends ButtonProps {
  stylingType?: ButtonStyleType
}

const getStylingClasses = (type: ButtonStyleType): string => {
  switch (type) {
    case ButtonStyleType.Icon:
      return 'styled-button-icon'
    case ButtonStyleType.Warning:
      return 'styled-button-warning'
    case ButtonStyleType.Success:
      return 'styled-button-success'
    case ButtonStyleType.NoBorder:
      return 'styled-button-no-border'
    case ButtonStyleType.BlackTheme:
      return 'styled-button-black-theme'
    case ButtonStyleType.BlackThemeActive:
      return 'styled-button-black-theme-active'
    case ButtonStyleType.RedTheme:
      return 'styled-button-red-theme'
    case ButtonStyleType.Default:
    default:
      return ''
  }
}

export const StyledButton: React.FC<StyledButtonProps> = ({ stylingType = ButtonStyleType.Default, className, children, ...restAntdButtonProps }) => {
  const stylingClass = getStylingClasses(stylingType)

  const combinedClassName = `
    ${stylingClass}
    ${className || ''} 
  `
    .trim()
    .replace(/\s+/g, ' ')

  return (
    <Button className={combinedClassName || undefined} {...restAntdButtonProps}>
      {children}
    </Button>
  )
}
