import { Agenda, CalendarItemType, HealthcareParty } from '@icure/cardinal-sdk'
import { v4 } from 'uuid'

export interface ProcedureVariant {
  procedureId: string
  attendees: number
  duration: number
  procedure: CalendarItemType
}

export interface ProcedureSelection {
  id: string
  serviceId: string | undefined | null
  agendaId: string | undefined | null
  displayText: string
  serviceName: string
  procedureName: string
  variants: ProcedureVariant[]
  procedureDetails: string
  displayTextByLanguage: { [key: string]: string }
  service: HealthcareParty | undefined
}

/*
 * Transforms flat lists of services and procedures into a structured list
 * of unique "Procedure Selections" grouped by service and procedure name.
 */
export function transformProceduresForSelection(allServices: HealthcareParty[], allProcedures: CalendarItemType[], allAgendas: Agenda[]): ProcedureSelection[] {
  const serviceMap = new Map(allServices.map((service) => [service.id, service]))
  const agendaMap = new Map(allAgendas.map((agenda) => [agenda.author, agenda]))

  const publicProcedures = allProcedures.filter((procedure) => (procedure.otherInfos?.['isPublic'] ?? 'false').toLowerCase() === 'true')

  const groupedProcedures = new Map<string, CalendarItemType[]>()
  for (const procedure of publicProcedures) {
    const groupKey = `${procedure.healthcarePartyId}|${procedure.name}`
    if (!groupedProcedures.has(groupKey)) {
      groupedProcedures.set(groupKey, [])
    }
    groupedProcedures.get(groupKey)!.push(procedure)
  }

  const procedureSelections = Array.from(groupedProcedures.values()).map((proceduresInGroup) => {
    const firstProcedure = proceduresInGroup[0]
    const serviceId = firstProcedure.healthcarePartyId || ''
    const procedureName = firstProcedure.name || 'Unnamed Procedure'
    const serviceObject = serviceMap.get(serviceId)
    const agendaObject = agendaMap.get(serviceId)
    const serviceName = serviceObject?.name || 'Unknown Service'

    const languages = ['FR', 'NL', 'DE', 'EN']

    const displayTextByLanguage = Object.fromEntries(
      languages.map((lang) => {
        const servicePart = serviceObject?.descr?.[lang] || serviceName
        const procedurePart = firstProcedure.subjectByLanguage?.[lang] || procedureName
        return [lang, `${servicePart} - ${procedurePart}`]
      }),
    )

    const variants = proceduresInGroup
      .map((p) => {
        const order = parseInt(p.otherInfos?.['order'] || '0', 10)
        return {
          procedureId: p.id,
          attendees: isNaN(order) ? 1 : order + 1,
          duration: p.duration || 0,
          procedure: p,
        }
      })
      .sort((a, b) => a.attendees - b.attendees)

    return {
      id: v4(),
      serviceId: agendaObject?.author,
      agendaId: agendaObject?.id,
      displayText: `${serviceName} - ${procedureName}`,
      serviceName: serviceName,
      procedureName: procedureName,
      variants: variants,
      procedureDetails: firstProcedure.otherInfos?.['procedureDetails'] || '',
      displayTextByLanguage: displayTextByLanguage,
      service: serviceObject,
    }
  })

  return procedureSelections
}
