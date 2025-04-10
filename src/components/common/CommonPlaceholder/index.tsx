import React, { ReactNode } from 'react'

import './index.css'

interface CommonPlaceholderProps {
  title: string
  content: string | ReactNode
}
export const CommonPlaceholder = ({ title, content }: CommonPlaceholderProps): JSX.Element => {
  return (
    <div className="CommonPlaceholder">
      <div className="CommonPlaceholder__container">
        <h6>{title}</h6>
        {typeof content === 'string' ? <p>{content}</p> : <>{content}</>}
      </div>
    </div>
  )
}
