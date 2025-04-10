import React from 'react'
import { Spin } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

import './index.css'

//Please ensure that the parent element where you intend to place the SpinLoader has the CSS property 'position: relative;' set.

export const SpinLoader = () => {
  const antIcon = <LoadingOutlined style={{ fontSize: 42 }} spin />
  return (
    <div className="SpinLoader">
      <Spin size="large" indicator={antIcon} />
    </div>
  )
}
