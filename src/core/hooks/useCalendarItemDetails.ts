import { useGetAgendaQuery } from '../api/agendaApi'
import { useGetCalendarItemPatientIdQuery, useGetCalendarItemQuery } from '../api/calendarItemApi'
import { useGetCalendarItemTypeQuery } from '../api/calendarItemTypeApi'
import { useGetEncryptedPatientByIdQuery } from '../api/patientApi'

export const useCalendarItemDetails = (calendarItemId?: string) => {
  const {
    data: calendarItem,
    isLoading: calendarItemLoading,
    error: calendarItemError,
  } = useGetCalendarItemQuery(calendarItemId ?? '', {
    skip: !calendarItemId,
  })

  const {
    data: calendarItemType,
    isLoading: calendarItemTypeLoading,
    error: calendarItemTypeError,
  } = useGetCalendarItemTypeQuery(calendarItem?.calendarItemTypeId ?? '', {
    skip: !calendarItem?.calendarItemTypeId,
  })

  const {
    data: patientId,
    isLoading: patientIdLoading,
    error: patientIdError,
  } = useGetCalendarItemPatientIdQuery(calendarItem!, {
    skip: !calendarItem,
  })

  const {
    data: patient,
    isLoading: patientLoading,
    error: patientError,
  } = useGetEncryptedPatientByIdQuery(patientId ?? '', {
    skip: !patientId,
  })

  const {
    data: agenda,
    isLoading: agendaLoading,
    error: agendaError,
  } = useGetAgendaQuery(calendarItem?.agendaId ?? '', {
    skip: !calendarItem?.agendaId,
  })

  return {
    calendarItem,
    calendarItemType,
    patient,
    agenda,
    isLoading: calendarItemLoading || calendarItemTypeLoading || patientLoading || agendaLoading || patientIdLoading,
    error: calendarItemError || calendarItemTypeError || patientError || agendaError || patientIdError,
  }
}
