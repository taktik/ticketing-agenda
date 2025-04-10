import * as React from 'react'

interface CopyJSONButtonProps {
  jsonData: object
  buttonTitle: string
  jsonName: string
}

export const CopyJSONButton: React.FC<CopyJSONButtonProps> = ({ jsonData, buttonTitle, jsonName }) => {
  const jsonString = JSON.stringify(jsonData, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const blobURL = URL.createObjectURL(blob)

  return (
    <a href={blobURL} download={jsonName}>
      <strong>{buttonTitle}</strong>
    </a>
  )
}
