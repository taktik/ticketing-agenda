import { Agenda, CalendarItemType, HealthcareParty } from '@icure/cardinal-sdk'
import { ProcedureGroup, ProcedureVariant, SiteVariant } from '../components/Calendar/CreateCitizenAppointment/CitizenReservationTypes'
import { getIntegerProperty, getStringProperty, getTranslationForEntity, languages } from '../components/common/helpers'

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

export function transformProceduresForSelection(allProcedures: CalendarItemType[], allAgendas: Agenda[], allSites: HealthcareParty[]): ProcedureGroup[] {
  const agendaMap = new Map(allAgendas.map((a) => [a.id, a]))
  const siteMap = new Map(allSites.map((s) => [s.id, s]))

  const proceduresByName = new Map<string, CalendarItemType[]>()
  allProcedures.forEach((proc) => {
    const name = proc.name || 'Unknown'
    if (!proceduresByName.has(name)) proceduresByName.set(name, [])
    proceduresByName.get(name)!.push(proc)
  })

  const groups: ProcedureGroup[] = []

  proceduresByName.forEach((procs, procName) => {
    const slug = slugify(procName)
    const procsByAgenda = new Map<string, CalendarItemType[]>()

    procs.forEach((p) => {
      const agendaId = p.agendaId || getStringProperty(p.publicProperties, 'CALENDARITEMTYPE|AGENDAID')
      if (agendaId) {
        if (!procsByAgenda.has(agendaId)) procsByAgenda.set(agendaId, [])
        procsByAgenda.get(agendaId)!.push(p)
      }
    })

    const siteVariants: SiteVariant[] = []

    procsByAgenda.forEach((procsInService, agendaId) => {
      const agenda = agendaMap.get(agendaId)
      const siteId = agenda ? getStringProperty(agenda.properties, 'SERVICE|PARENTID') : undefined
      const site = siteId ? siteMap.get(siteId) : undefined

      if (agenda && site) {
        const variants: ProcedureVariant[] = procsInService
          .map((p) => {
            const order = getIntegerProperty(p.publicProperties, 'CALENDARITEMTYPE|ORDER')
            const attendees = isNaN(order) ? 1 : order + 1
            return {
              id: `var-${p.id}`,
              attendees,
              duration: p.duration || 15,
              calendarItemType: p,
            }
          })
          .sort((a, b) => a.attendees - b.attendees)

        // Level 2: Site Variants
        siteVariants.push({
          id: `sv-${slug}-${site.id}`,
          siteId: site.id,
          siteName: site.name ?? '',
          siteLocation: getStringProperty(site.publicProperties, 'SITE|LOCATION') ?? '',
          procedureDetails: getStringProperty(procsInService[0].publicProperties, 'CALENDARITEMTYPE|PROCEDUREDETAILS') ?? '',
          site,
          agenda,
          procedureVariants: variants,
        })
      }
    })

    if (siteVariants.length > 0) {
      const refAgenda = siteVariants[0].agenda
      const refProc = procs[0]
      const serviceName = refAgenda.name || 'Service'

      const displayTextByLanguage = Object.fromEntries(
        languages.map((lang) => {
          const sName = getTranslationForEntity(refAgenda.properties, 'SERVICE', lang) || serviceName
          const pName = getTranslationForEntity(refProc.publicProperties, 'CALENDARITEMTYPE', lang) || procName
          return [lang, `${sName} - ${pName}`]
        }),
      )

      groups.push({
        id: `pg-${slug}`,
        displayTextByLanguage,
        siteVariants,
      })
    }
  })

  return groups
}
