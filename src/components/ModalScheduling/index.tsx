import { HealthcareParty, TimeTable } from '@icure/cardinal-sdk'
import { Select as AntSelect, Button, Empty, message, notification, Space, Table, Tooltip } from 'antd'
import Column from 'antd/es/table/Column'
import ColumnGroup from 'antd/es/table/ColumnGroup'
import { addMonths, format, Locale, startOfDay } from 'date-fns'
import { de, enUS, fr, nl } from 'date-fns/locale'
import { ReactElement, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { useGetAgendaByAuthorId } from '../../core/api/agendaApi'
import { useCreateUpdateTimeTableMutation, useDeleteTimeTableMutation, useGetTimeTablesQuery } from '../../core/api/timeTableApi'
import { CustomModal } from '../common/CustomModal'
import { formatDateToYYYYMMDDHHmmssNumber, numberTimestampToDate } from '../common/helpers'
import { ModalConfirmAction } from '../common/ModalConfirmAction'
import './index.css'
import { ModalRules } from './ModalRules'

const localeMap: Record<string, Locale> = {
  en: enUS,
  fr: fr,
  de: de,
  nl: nl,
}

interface ModalSchedulingProps {
  isVisible: boolean
  onClose: () => void
  services: HealthcareParty[]
}

export const ModalScheduling = ({ isVisible, onClose, services }: ModalSchedulingProps): ReactElement => {
  const { t, i18n } = useTranslation()
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false)
  const [showDeleteTimeTableModal, setShowDeleteTimeTableModal] = useState<boolean>(false)
  const [selectedTimeTable, setSelectedTimeTable] = useState<string | undefined>(undefined)
  const [selectedService, setSelectedService] = useState<HealthcareParty | undefined>(services?.[0])
  const [timeTableToBeDelete, setTimeTableToBeDelete] = useState<TimeTable | undefined>(undefined)
  const dateFnsLocale = useMemo(() => localeMap[i18n.language] ?? enUS, [i18n])

  const { data: agenda, isLoading: isAgendaLoading } = useGetAgendaByAuthorId({ skip: !selectedService, authorId: selectedService?.id ?? '' })
  const { data: timeTables, isLoading: istimeTablesLoading } = useGetTimeTablesQuery({ agendaId: agenda?.id ?? '' }, { skip: !agenda })

  const sortedTimeTables = useMemo(() => {
    return [...(timeTables ?? [])].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
  }, [timeTables])

  const [deleteTimeTable, { isError: isDeleteTimeTableError, isSuccess: isDeleteTimeTableSuccess, isLoading: isDeleteTimeTableLoading }] = useDeleteTimeTableMutation()
  const [createUpdateTimeTable, { isError: isCreateUpdateTimeTableError, isSuccess: isCreateUpdateTimeTableSuccess, isLoading: isCreateUpdateTimeTableLoading }] = useCreateUpdateTimeTableMutation()

  const isFetching = useMemo(() => isAgendaLoading || istimeTablesLoading, [isAgendaLoading, istimeTablesLoading])
  const isMutating = useMemo(() => isDeleteTimeTableLoading || isCreateUpdateTimeTableLoading, [isDeleteTimeTableLoading, isCreateUpdateTimeTableLoading])
  const isLoading = useMemo(() => isFetching || isMutating, [isFetching, isMutating])

  const [api, notificationContextHolder] = notification.useNotification()

  const openNotification = (type: 'error', message: string, description: string) => {
    api.open({
      type,
      message,
      description,
      duration: 0,
    })
    setTimeout(api.destroy, 2500)
  }

  const [messageApi, messageContextHolder] = message.useMessage()

  const showMessageFeedback = (type: 'loading' | 'success' | 'error', content: string) => {
    messageApi.open({
      type,
      content,
      duration: 0,
    })
    // Dismiss manually and asynchronously
    setTimeout(messageApi.destroy, 2500)
  }

  const addSchedule = () => {
    try {
      if (!agenda) throw new Error('No service selected')
      const today = startOfDay(new Date())
      const start = formatDateToYYYYMMDDHHmmssNumber(today)
      const end = formatDateToYYYYMMDDHHmmssNumber(addMonths(today, 1))
      createUpdateTimeTable(new TimeTable({ name: t('content.new_schedule'), agendaId: agenda.id, startTime: start, endTime: end, id: v4() }))
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }

  const handleEditClick = (timeTable: TimeTable) => {
    setSelectedTimeTable(timeTable.id)
    setShowRulesModal(true)
  }
  const handleDeleteClick = (timeTable: TimeTable) => {
    setTimeTableToBeDelete(timeTable)
    setShowDeleteTimeTableModal(true)
  }

  const handleDeleteTimeTable = () => {
    try {
      if (!agenda) throw new Error('No service selected')
      if (!timeTableToBeDelete) throw new Error('No schedule selected')
      deleteTimeTable(timeTableToBeDelete)
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    } finally {
      setShowDeleteTimeTableModal(false)
    }
  }

  // Ant select
  const options = useMemo(
    () =>
      services.map((service) => ({
        label: service.name,
        value: service.id,
      })),
    [services],
  )

  useEffect(() => {
    if (selectedService) {
      const selected = services.find((service) => service.id === selectedService.id)
      setSelectedService(selected)
    }
  }, [services])

  //Delete notifications
  useEffect(() => {
    if (isDeleteTimeTableSuccess) showMessageFeedback('success', t('notification.schedule_deleted'))
    if (isDeleteTimeTableError) openNotification('error', t('notification.schedule_delete_failed'), t('notification.schedule_delete_error'))
  }, [isDeleteTimeTableSuccess, isDeleteTimeTableError])

  //Save notifications
  useEffect(() => {
    if (isCreateUpdateTimeTableSuccess) showMessageFeedback('success', t('notification.schedule_saved'))
    if (isCreateUpdateTimeTableError) openNotification('error', t('notification.schedule_save_failed'), t('notification.schedule_save_error'))
  }, [isCreateUpdateTimeTableSuccess, isCreateUpdateTimeTableError])

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={t('content.schedule_list')} blockAntModalBodyVerticalScroll noFooter width={1300}>
      <div className="modalSchedule">
        {notificationContextHolder}
        {messageContextHolder}
        <div className="antSelect">
          {t('content.services')}
          <AntSelect
            allowClear
            showSearch
            style={{ width: '20%' }}
            placeholder={t('content.select_service')}
            optionFilterProp="label"
            labelInValue
            filterSort={(a, b) => (a.label ?? '').toLowerCase().localeCompare((b.label ?? '').toLowerCase())}
            options={options}
            value={selectedService ? { label: selectedService.name, value: selectedService.id } : undefined}
            onChange={(option) => {
              if (option && option.value) {
                const selected = services.find((service) => service.id === option.value)
                setSelectedService(selected)
              } else {
                setSelectedService(undefined)
              }
            }}
          />
        </div>

        <div className="antTable">
          <Table<TimeTable>
            pagination={{
              pageSize: 6,
              simple: true,
            }}
            scroll={{ y: 'calc(100vh - 500px)', x: 'max-content' }}
            dataSource={sortedTimeTables}
            rowKey="id"
            locale={{ emptyText: <Empty description={t('content.no_schedule_yet')} /> }}
            loading={isLoading}
          >
            <ColumnGroup
              title={
                <Tooltip title={selectedService ? null : t('content.select_service_for_schedule')}>
                  <Button style={{ width: '100%' }} disabled={!selectedService} onClick={addSchedule}>
                    {t('content.add_schedule')}
                  </Button>
                </Tooltip>
              }
            >
              <Column title={t('content.name')} dataIndex="name" key="name" width={'23%'} sorter={(a, b) => a.name.localeCompare(b.name)} />
              <Column
                title={t('content.start')}
                dataIndex="startTime"
                key="startTime"
                width={'23%'}
                render={(value: number) => {
                  const startDate = numberTimestampToDate(value) ?? new Date()
                  return format(startDate, 'P', { locale: dateFnsLocale })
                }}
              />
              <Column
                title={t('content.end')}
                dataIndex="endTime"
                key="endTime"
                width={'23%'}
                render={(value: number) => {
                  const endDate = numberTimestampToDate(value) ?? new Date()
                  return format(endDate, 'P', { locale: dateFnsLocale })
                }}
              />

              <Column
                title={t('content.actions')}
                key="action"
                width={'16%'}
                render={(_: unknown, record: TimeTable) => (
                  <Space size="middle">
                    <Button onClick={() => handleEditClick(record)}>{t('content.edit')}</Button>
                    <Button onClick={() => handleDeleteClick(record)}>{t('content.delete')}</Button>
                  </Space>
                )}
              />
            </ColumnGroup>
          </Table>
        </div>
        {showRulesModal && createPortal(<ModalRules isVisible={showRulesModal} onClose={() => setShowRulesModal(false)} timeTableId={selectedTimeTable} agenda={agenda} />, document.body)}
        {showDeleteTimeTableModal &&
          createPortal(
            <ModalConfirmAction
              title={t('delete_modal.confirm_delete_schedule_prompt')}
              description=""
              content={
                <>
                  <p>{t('delete_modal.delete_schedule_warning_details')}</p>
                  <p>{t('delete_modal.delete_permanent_warning')}</p>
                </>
              }
              yesBtnTitle={t('content.delete')}
              noBtnTitle={t('content.close')}
              onYesClick={handleDeleteTimeTable}
              onNoClick={() => setShowDeleteTimeTableModal(false)}
              isVisible={showDeleteTimeTableModal}
              mode="danger"
            />,
            document.body,
          )}
      </div>
    </CustomModal>
  )
}
