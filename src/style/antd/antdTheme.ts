import { PRIMARY_COLOR } from '../../constants'
const PRIMARY_COLOR_ALPHA = `${PRIMARY_COLOR}1a`

export const ANTD_NEW_THEME = {
  token: {
    colorPrimary: PRIMARY_COLOR,
  },
  components: {
    Button: {
      colorLink: '#084B83',
      colorLinkActive: '#3D87C5',
      colorLinkHover: '#3D87C5',
      defaultShadow: 'none',
      primaryShadow: 'none',
      paddingInline: 16,
      contentFontSizeLG: 14,
      colorPrimary: PRIMARY_COLOR,
    },
    DatePicker: {
      fontSizeLG: 13,
      fontSize: 13,
      borderRadius: 0,
      hoverBorderColor: PRIMARY_COLOR,
      colorPrimary: PRIMARY_COLOR,
      activeBorderColor: PRIMARY_COLOR,
      controlOutline: PRIMARY_COLOR_ALPHA,
    },
    Form: {
      itemMarginBottom: 0,
    },
    Tooltip: {
      colorBgSpotlight: '#1F2C4E',
    },
    Menu: {
      itemHoverBg: PRIMARY_COLOR_ALPHA,
      itemSelectedBg: PRIMARY_COLOR,
      itemSelectedColor: '#ffffff',
      itemMarginBlock: '0.75rem',
      itemPaddingInline: 0,
      itemMarginInline: 0,
      itemBg: '#ffffff',
      subMenuItemBg: '#ffffff',
      itemBorderRadius: 0,
    },
    Calendar: {
      colorPrimary: PRIMARY_COLOR,
    },
    Modal: {
      margin: 0,
    },
    Input: {
      fontSizeLG: 13,
      fontSize: 13,
      borderRadius: 0,
      hoverBorderColor: PRIMARY_COLOR,
      colorPrimary: PRIMARY_COLOR,
      activeBorderColor: PRIMARY_COLOR,
      controlOutline: PRIMARY_COLOR_ALPHA,
    },
    InputNumber: {
      fontSizeLG: 13,
      fontSize: 13,
    },
    List: {
      itemPadding: '0',
    },
    Select: {
      fontSizeLG: 13,
      fontSize: 13,
      hoverBorderColor: PRIMARY_COLOR,
      optionSelectedBg: PRIMARY_COLOR_ALPHA,
      controlOutline: PRIMARY_COLOR_ALPHA,
      optionSelectedColor: PRIMARY_COLOR,
      activeBorderColor: PRIMARY_COLOR,
      colorPrimary: PRIMARY_COLOR,
    },
    Popconfirm: {
      colorWarning: '#EB3437',
      colorTextHeading: '#EB3437',
    },
  },
}
