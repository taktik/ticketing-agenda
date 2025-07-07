import { Agenda, CalendarItemType, HealthcareParty } from '@icure/cardinal-sdk'
import { v4 } from 'uuid'

const languages = ['FR', 'EN', 'NDLS', 'DE']

export interface ProcedureVariant {
  procedureId: string
  attendees: number
  duration: number
  procedure: CalendarItemType
}

export interface SiteVariants {
  site: HealthcareParty
  serviceId: string | undefined
  agendaId: string | undefined
  service: HealthcareParty | undefined
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

/*
 * Transforms flat lists of services and procedures into a structured list
 * of unique "Procedure Selections" grouped by service and procedure name.
 */
export function transformProceduresForSelection(allServices: HealthcareParty[], allProcedures: CalendarItemType[], allAgendas: Agenda[], allSites: HealthcareParty[]): ProcedureSelection[] {
  // 1. Create lookup maps for efficient access (your setup was perfect)
  const serviceMap = new Map(allServices.map((service) => [service.id, service]))
  const agendaMap = new Map(allAgendas.map((agenda) => [agenda.author, agenda]))
  const siteMap = new Map(allSites.map((site) => [site.id, site]))

  // 2. Filter for only the procedures marked as public
  const publicProcedures = allProcedures.filter((procedure) => (procedure.otherInfos?.['isPublic'] ?? 'false').toLowerCase() === 'true')

  // 3. Group all procedures by their name (e.g., group all "Demande de passeport")
  const proceduresGroupedByName = new Map<string, CalendarItemType[]>()
  for (const procedure of publicProcedures) {
    const nameKey = procedure.name || 'Unnamed Procedure'
    if (!proceduresGroupedByName.has(nameKey)) {
      proceduresGroupedByName.set(nameKey, [])
    }
    proceduresGroupedByName.get(nameKey)!.push(procedure)
  }

  // 4. Map over each group of same-named procedures to create the final structure
  const finalSelection = Array.from(proceduresGroupedByName.entries()).map(([procedureName, proceduresWithSameName]) => {
    // 5. Within this group, further group the procedures by the service that offers them
    const proceduresGroupedByService = new Map<string, CalendarItemType[]>()
    for (const procedure of proceduresWithSameName) {
      const serviceId = procedure.healthcarePartyId || 'unknown-service'
      if (!proceduresGroupedByService.has(serviceId)) {
        proceduresGroupedByService.set(serviceId, [])
      }
      proceduresGroupedByService.get(serviceId)!.push(procedure)
    }

    // 6. Create the `SiteVariants` array from these service groups
    const siteVariants: SiteVariants[] = Array.from(proceduresGroupedByService.values())
      .map((proceduresInOneService) => {
        // All procedures here have the same name AND the same serviceId.
        // These are the variants (e.g., for 1 person, 2 people, etc.)
        const firstProcInService = proceduresInOneService[0]
        const serviceId = firstProcInService.healthcarePartyId

        const service = serviceId ? serviceMap.get(serviceId) : undefined
        const siteId = service?.parentId
        const site = siteId ? siteMap.get(siteId) : undefined
        const agenda = serviceId ? agendaMap.get(serviceId) : undefined

        // If we can't link this service back to a valid site, we skip it.
        if (!site) {
          return null
        }

        // This logic correctly creates the list of variants (1 person, 2 people...)
        const procedureVariants: ProcedureVariant[] = proceduresInOneService
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

        // Construct the final SiteVariants object
        return {
          site: site,
          serviceId: serviceId,
          agendaId: agenda?.id,
          service: service,
          procedureDetails: firstProcInService.otherInfos?.['procedureDetails'] || '',
          variants: procedureVariants,
        }
      })
      .filter((sv): sv is SiteVariants => sv !== null) // Filter out any nulls and satisfy TypeScript

    // 7. Construct the final `ProcedureSelection` object for this procedure name
    const firstProcedureInGroup = proceduresWithSameName[0]
    const representativeService = firstProcedureInGroup.healthcarePartyId ? serviceMap.get(firstProcedureInGroup.healthcarePartyId) : undefined
    const serviceName = representativeService?.name || 'Unknown Service'

    //8. Get the translations for service - procedure
    const displayTextByLanguage = Object.fromEntries(
      languages.map((lang) => {
        const servicePart = representativeService?.descr?.[lang] || serviceName
        const procedurePart = firstProcedureInGroup.subjectByLanguage?.[lang] || procedureName
        return [lang, `${servicePart} - ${procedurePart}`]
      }),
    )

    return {
      id: v4(),
      siteVariants: siteVariants,
      displayText: `${serviceName} - ${procedureName}`,
      serviceName: serviceName,
      procedureName: procedureName,
      displayTextByLanguage: displayTextByLanguage,
    }
  })

  return finalSelection
}
