import { Agenda, CalendarItemType, HealthcareParty } from '@icure/cardinal-sdk'
import { getIntegerProperty, getStringProperty, getTranslationForEntity, languages } from '../components/common/helpers'
import { FormProcedure } from '../components/Calendar/CreateEvent/CreateEvent'

export interface ProcedureVariant {
  id: string
  procedureId: string
  attendees: number
  duration: number
}

export interface SiteVariants {
  id: string
  siteId: string
  siteName: string
  siteLocation: string
  agendaId: string | undefined
  procedureDetails: string
  variants: ProcedureVariant[]
}

export interface ProcedureSelection {
  id: string
  siteVariants: SiteVariants[]
  displayText: string
  serviceName: string
  procedureName: string
  displayTextByLanguage: { [key: string]: string }
}

export type ProcedureWithTimeAndSelections = {
  procedure: FormProcedure
  specificTimeslot: { startTime: number; endTime: number }
  masterProcedure: ProcedureSelection
  siteVariant: SiteVariants
  procedureVariant: ProcedureVariant
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

/*
 * Transforms flat lists of services and procedures into a structured list
 * of unique "Procedure Selections" grouped by service and procedure name.
 */
export function transformProceduresForSelection(allProcedures: CalendarItemType[], allAgendas: Agenda[], allSites: HealthcareParty[]): ProcedureSelection[] {
  // 1. Create lookup maps for efficient access (your setup was perfect)
  const agendaMap = new Map(allAgendas.map((agenda) => [agenda.id, agenda]))
  const siteMap = new Map(allSites.map((site) => [site.id, site]))

  // 3. Group all procedures by their name (e.g., group all "Demande de passeport")
  const proceduresGroupedByName = new Map<string, CalendarItemType[]>()
  for (const procedure of allProcedures) {
    const nameKey = procedure.name || 'Unnamed Procedure'
    if (!proceduresGroupedByName.has(nameKey)) {
      proceduresGroupedByName.set(nameKey, [])
    }
    proceduresGroupedByName.get(nameKey)!.push(procedure)
  }

  // 4. Map over each group of same-named procedures to create the final structure
  const finalSelection = Array.from(proceduresGroupedByName.entries()).map(([procedureName, proceduresWithSameName]) => {
    const procedureNameSlug = slugify(procedureName)
    // 5. Within this group, further group the procedures by the service that offers them
    const proceduresGroupedByAgendaId = new Map<string, CalendarItemType[]>()
    for (const procedure of proceduresWithSameName) {
      const agendaId = procedure.agendaId || 'unknown-service'
      if (!proceduresGroupedByAgendaId.has(agendaId)) {
        proceduresGroupedByAgendaId.set(agendaId, [])
      }
      proceduresGroupedByAgendaId.get(agendaId)!.push(procedure)
    }

    // 6. Create the `SiteVariants` array from these service groups
    const siteVariants: SiteVariants[] = Array.from(proceduresGroupedByAgendaId.values())
      .map((proceduresInOneService) => {
        // All procedures here have the same name AND the same serviceId.
        // These are the variants (e.g., for 1 person, 2 people, etc.)
        const firstProcInService = proceduresInOneService[0]

        const agendaId = firstProcInService.agendaId
        const agenda = agendaId ? agendaMap.get(agendaId) : undefined
        const siteId = agenda?.author
        const site = siteId ? siteMap.get(siteId) : undefined

        // If we can't link this service back to a valid site, we skip it.
        if (!site) {
          return null
        }

        // This logic correctly creates the list of variants (1 person, 2 people...)
        const procedureVariants: ProcedureVariant[] = proceduresInOneService
          .map((p) => {
            const order = getIntegerProperty(p.publicProperties, 'CALENDARITEMTYPE|ORDER')
            const attendees = isNaN(order) ? 1 : order + 1
            return {
              id: `proc-variant-${p.id}-${attendees}`,
              procedureId: p.id,
              attendees: attendees,
              duration: p.duration || 0,
              procedure: p,
            }
          })
          .sort((a, b) => a.attendees - b.attendees)

        // Construct the final SiteVariants object
        return {
          id: `site-variant-${procedureNameSlug}-${site.id}`,
          siteId: site.id,
          agendaId: agenda?.id,
          siteName: site.name,
          siteLocation: getStringProperty(site.publicProperties, 'SITE|LOCATION'),
          procedureDetails: getStringProperty(firstProcInService.publicProperties, 'CALENDARITEMTYPE|PROCEDUREDETAILS'),
          variants: procedureVariants,
        }
      })
      .filter((sv): sv is SiteVariants => sv !== null)

    // 7. Construct the final `ProcedureSelection` object for this procedure name
    const firstProcedureInGroup = proceduresWithSameName[0]
    const representativeService = firstProcedureInGroup.agendaId ? agendaMap.get(firstProcedureInGroup.agendaId) : undefined
    const serviceName = representativeService?.name || 'Unknown Service'

    //8. Get the translations for service - procedure
    const displayTextByLanguage = Object.fromEntries(
      languages.map((lang) => {
        const servicePart = getTranslationForEntity(representativeService?.properties, 'SERVICE', lang) || serviceName
        const procedurePart = getTranslationForEntity(firstProcedureInGroup.publicProperties, 'CALENDARITEMTYPE', lang)
        return [lang, `${servicePart} - ${procedurePart}`]
      }),
    )

    return {
      id: `selection-${procedureNameSlug}`,
      siteVariants: siteVariants,
      displayText: `${serviceName} - ${procedureName}`,
      serviceName: serviceName,
      procedureName: procedureName,
      displayTextByLanguage: displayTextByLanguage,
    }
  })

  return finalSelection
}
