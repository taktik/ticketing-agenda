import { SearchOutlined } from '@ant-design/icons'
import { DecryptedCalendarItem, DecryptedPatient, TelecomType } from '@icure/cardinal-sdk'
import { Card, Descriptions, Empty, Input, List, Spin, Tag, Typography } from 'antd'
import { format, parse } from 'date-fns'
import { enUS } from 'date-fns/locale'
import dayjs from 'dayjs'
import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLazyGetCalendarItemsByPatientQuery } from '../../core/api/calendarItemApi'
import { CalendarItemTag } from '../../core/api/fetchType'
import { useLazySearchPatientsQuery } from '../../core/api/patientApi'
import { useHierarchyContext } from '../../core/contexts/HierarchyContext'
import { useDebounce } from '../../core/hooks'
import { CustomModal } from '../common/CustomModal'
import { dayjsToYYYYMMDDHHmmss, getCodeTagById, localeMap, timestampToDayjs } from '../common/helpers'
import './index.css'

const { Text } = Typography

interface ModalCitizenSearchProps {
  isVisible: boolean
  onClose: () => void
}

export const ModalCitizenSearch = ({ isVisible, onClose }: ModalCitizenSearchProps): ReactElement => {
  const { t, i18n } = useTranslation()
  const { agendaMap } = useHierarchyContext()

  const [searchValue, setSearchValue] = useState('')
  const debouncedSearch = useDebounce(searchValue, 400)

  const [selectedPatient, setSelectedPatient] = useState<DecryptedPatient | undefined>()

  const [searchPatients, { data: patients, isFetching: isSearching }] = useLazySearchPatientsQuery()
  const [getAppointments, { data: appointments, isFetching: isLoadingAppointments }] = useLazyGetCalendarItemsByPatientQuery()

  const dateFnsLocale = useMemo(() => localeMap[i18n.language] ?? enUS, [i18n.language])

  useEffect(() => {
    if (!isVisible) {
      setSearchValue('')
      setSelectedPatient(undefined)
    }
  }, [isVisible])

  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      searchPatients(debouncedSearch)
    }
  }, [debouncedSearch, searchPatients])

  const handleSelectPatient = useCallback(
    (patient: DecryptedPatient) => {
      setSelectedPatient(patient)
      getAppointments(patient)
    },
    [getAppointments],
  )

  const getPatientEmail = useCallback((patient: DecryptedPatient) => {
    return patient.addresses.flatMap((a) => a.telecoms || []).find((t) => t.telecomType === TelecomType.Email)?.telecomNumber ?? ''
  }, [])

  const getPatientPhone = useCallback((patient: DecryptedPatient) => {
    return patient.addresses.flatMap((a) => a.telecoms || []).find((t) => t.telecomType === TelecomType.Mobile)?.telecomNumber ?? ''
  }, [])

  const formatPatientDob = useCallback(
    (patient: DecryptedPatient) => {
      if (!patient.dateOfBirth) return ''
      const parsed = parse(String(patient.dateOfBirth), 'yyyyMMdd', new Date())
      return format(parsed, 'dd MMMM yyyy', { locale: dateFnsLocale })
    },
    [dateFnsLocale],
  )

  const formatAppointmentDate = useCallback(
    (item: DecryptedCalendarItem) => {
      const start = item.startTime ? timestampToDayjs(item.startTime) : null
      const end = item.endTime ? timestampToDayjs(item.endTime) : null
      if (!start) return ''
      const datePart = format(start.toDate(), 'd MMMM yyyy', { locale: dateFnsLocale })
      const startTime = format(start.toDate(), 'HH:mm')
      const endTime = end ? format(end.toDate(), 'HH:mm') : ''
      return endTime ? `${datePart}, ${startTime} - ${endTime}` : `${datePart}, ${startTime}`
    },
    [dateFnsLocale],
  )

  const getAppointmentServiceName = useCallback(
    (item: DecryptedCalendarItem) => {
      if (!item.agendaId) return ''
      return agendaMap.get(item.agendaId)?.name ?? ''
    },
    [agendaMap],
  )

  const sortedAppointments = useMemo(() => {
    if (!appointments) return []
    return [...appointments].sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0))
  }, [appointments])

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={t('content.search_citizen')} noFooter width={1300} blockAntModalBodyVerticalScroll>
      <div className="modal-citizen-search">
        <div className="modal-citizen-search__left">
          <Input prefix={<SearchOutlined />} placeholder={t('content.search_citizen_placeholder')} value={searchValue} onChange={(e) => setSearchValue(e.target.value)} allowClear size="large" />

          <Spin spinning={isSearching}>
            {debouncedSearch.length < 2 ? (
              <div className="modal-citizen-search__hint">
                <Text type="secondary">{t('content.search_min_chars')}</Text>
              </div>
            ) : patients && patients.length === 0 ? (
              <Empty description={t('content.no_results')} />
            ) : (
              <List
                dataSource={patients ?? []}
                renderItem={(patient) => (
                  <List.Item className={`modal-citizen-search__patient-item ${selectedPatient?.id === patient.id ? 'modal-citizen-search__patient-item--selected' : ''}`} onClick={() => handleSelectPatient(patient)}>
                    <List.Item.Meta
                      title={`${patient.firstName ?? ''} ${patient.lastName ?? ''}`}
                      description={[getPatientEmail(patient), getPatientPhone(patient), patient.dateOfBirth ? formatPatientDob(patient) : ''].filter(Boolean).join(' — ')}
                    />
                  </List.Item>
                )}
              />
            )}
          </Spin>
        </div>

        <div className="modal-citizen-search__right">
          {!selectedPatient ? (
            <div className="modal-citizen-search__hint">
              <Text type="secondary">{t('content.select_citizen_prompt')}</Text>
            </div>
          ) : (
            <>
              <Card title={t('content.citizen_details')} variant="borderless" styles={{ header: { paddingLeft: 0, borderBottom: 0, minHeight: 'auto' }, body: { padding: 0 } }} style={{ marginBottom: '16px' }}>
                <Descriptions bordered column={1} styles={{ label: { width: '180px' } }}>
                  <Descriptions.Item label={t('content.full_name')}>{`${selectedPatient.firstName ?? ''} ${selectedPatient.lastName ?? ''}`}</Descriptions.Item>
                  <Descriptions.Item label={t('content.email')}>{getPatientEmail(selectedPatient)}</Descriptions.Item>
                  <Descriptions.Item label={t('content.phone_number')}>{getPatientPhone(selectedPatient)}</Descriptions.Item>
                  <Descriptions.Item label={t('content.birth_date')}>{formatPatientDob(selectedPatient)}</Descriptions.Item>
                </Descriptions>
              </Card>

              <Card title={t('content.citizen_appointments')} variant="borderless" styles={{ header: { paddingLeft: 0, borderBottom: 0, minHeight: 'auto' }, body: { padding: 0 } }}>
                <Spin spinning={isLoadingAppointments}>
                  {isLoadingAppointments ? null : sortedAppointments.length === 0 ? (
                    <Empty description={t('content.no_appointments')} />
                  ) : (
                    <List
                      dataSource={sortedAppointments}
                      renderItem={(item) => {
                        const confirmationCode = getCodeTagById(item.tags, CalendarItemTag.APPOINTMENT_QBETTER_CODE)
                        const isPast = item.startTime ? item.startTime < dayjsToYYYYMMDDHHmmss(dayjs()) : false

                        return (
                          <List.Item>
                            <List.Item.Meta
                              title={
                                <span>
                                  {formatAppointmentDate(item)}
                                  {isPast && (
                                    <Tag color="default" style={{ marginLeft: 8 }}>
                                      {t('content.past')}
                                    </Tag>
                                  )}
                                </span>
                              }
                              description={
                                <>
                                  <div>
                                    <Text strong>{t('content.service')}:</Text> {getAppointmentServiceName(item)}
                                  </div>
                                  <div>
                                    <Text strong>{t('content.procedure')}:</Text> {item.title ?? ''}
                                  </div>
                                  {confirmationCode && (
                                    <div>
                                      <Text strong>{t('content.confirmationCode')}:</Text> {confirmationCode}
                                    </div>
                                  )}
                                </>
                              }
                            />
                          </List.Item>
                        )
                      }}
                    />
                  )}
                </Spin>
              </Card>
            </>
          )}
        </div>
      </div>
    </CustomModal>
  )
}
