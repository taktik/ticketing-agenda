import { DecryptedContact, DecryptedContent, Measure } from '@icure/cardinal-sdk'
import React from 'react'
import { useGetHealthElementsQuery } from '../../../../../core/api/healthElementApi'
import { formatTimestampToHumanReadable } from '../../../../../helpers/dateFormaters'
import './index.css'

type ConsultationProps = {
  contact: DecryptedContact
}

export const Consultation = ({ contact }: ConsultationProps) => {
  const healthElementsIds = contact.subContacts.map((subContact) => subContact.healthElementId).filter((id): id is string => id !== undefined)
  const { data: healthElements } = useGetHealthElementsQuery(healthElementsIds, { skip: healthElementsIds.length === 0 })

  const getServicesContentValue = (content: DecryptedContent) => {
    if (!!content.stringValue) {
      return <p>{content.stringValue}</p>
    } else if (content.ratio) {
      const systolicPressure = content.ratio.find((el: Measure) => el.comment === 'systolicPressure')
      const diastolicPressure = content.ratio.find((el: Measure) => el.comment === 'diastolicPressure')
      return (
        <p>
          {systolicPressure?.value + ' ' + systolicPressure?.unit} / {diastolicPressure?.value + ' ' + diastolicPressure?.unit}
        </p>
      )
    } else {
      return <p>Nan</p>
    }
  }

  return (
    <div className="consultation">
      <div className="consultation__item">
        <h5>Date of visit:</h5>
        <p>{formatTimestampToHumanReadable(contact.openingDate)}</p>
      </div>

      {contact.services.map((service, index) => (
        <div className="consultation__item" key={index}>
          <h5>{service.label}:</h5>
          {getServicesContentValue(service.content.en)}
        </div>
      ))}

      {healthElements?.map((healthElement, index) => {
        const value = healthElement.descr

        const label = contact.subContacts.find((el) => el.healthElementId === healthElement.id)?.descr
        return (
          <div className="consultation__item" key={index}>
            <h5>{label}:</h5>
            <p>{value}</p>
          </div>
        )
      })}
    </div>
  )
}
