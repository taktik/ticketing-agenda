import { Descriptions, Space, Typography } from 'antd'
import dayjs from 'dayjs'
import { FC, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { appointmentDuration, AppointmentForm, formatDateTime, FormProcedure, languageMapping } from '../CreateEvent'
import './index.css'
import { ProcedureSelection } from '../../../../helpers/transformProcedures'

const { Title, Text } = Typography

interface StepCreateEventResultProps {
  formValues: AppointmentForm
  selections: ProcedureSelection[]
  isCreateLoading: boolean
  isCreateEventSuccess: boolean
}
export const StepCreateEventResult = ({ formValues, selections, isCreateLoading, isCreateEventSuccess }: StepCreateEventResultProps) => {
  const { t, i18n } = useTranslation()
  const langCode = useMemo(() => {
    return languageMapping[i18n.language] || 'FR' // Fallback
  }, [i18n.language])

  return (
    <>
      {isCreateLoading && <div>Loading</div>}
      {!isCreateLoading && isCreateEventSuccess && <div>Success !</div>}
      {!isCreateLoading && !isCreateEventSuccess && <div>Failure !</div>}
    </>
  )
}
