import { EmbeddedTimeTableItem, HealthcareParty, ResourceGroupAllocationSchedule } from '@icure/cardinal-sdk'
import { Select as AntSelect, Button, Empty, message, notification, Space, Table, Tooltip } from 'antd'
import Column from 'antd/es/table/Column'
import ColumnGroup from 'antd/es/table/ColumnGroup'
import { addMonths, endOfToday, format, Locale, startOfDay } from 'date-fns'
import { de, enUS, fr, nl } from 'date-fns/locale'
import { ReactElement, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useGetAgendaByAuthorId, useUpdateAgendaMutation } from '../../core/api/agendaApi'
import { CustomModal } from '../common/CustomModal'
import { formatDateToYYYYMMDDHHmmssNumber, numberTimestampToDate } from '../common/helpers'
import { ModalConfirmAction } from '../common/ModalConfirmAction'
import './index.css'
import { ModalRules } from './ModalRules'
import { v4 } from 'uuid'

const localeMap: Record<string, Locale> = {
  en: enUS,
  fr: fr,
  de: de,
  nl: nl,
}

interface SchedulingTableRow {
  rowId: string
  name: string | undefined
  startDateTime: number | undefined
  endDateTime: number | undefined
  items: Array<EmbeddedTimeTableItem>
}

interface ModalSchedulingProps {
  isVisible: boolean
  onClose: () => void
  services: HealthcareParty[]
}

export const ModalScheduling = ({ isVisible, onClose, services }: ModalSchedulingProps): ReactElement => {
  const { t, i18n } = useTranslation()
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false)
  const [showDeleteResourceGroupModal, setShowDeleteResourceGroupModal] = useState<boolean>(false)
  const [selectedResourcegroup, setSelectedResourcegroup] = useState<SchedulingTableRow | undefined>(undefined)
  const [selectedService, setSelectedService] = useState<HealthcareParty | undefined>(services?.[0])
  const [resourceGroupToBeDelete, setResourceGroupToBeDelete] = useState<SchedulingTableRow | undefined>(undefined)
  const [schedulingTableRow, setSchedulingTableRow] = useState<SchedulingTableRow[]>([])
  const dateFnsLocale = useMemo(() => localeMap[i18n.language] ?? enUS, [i18n])

  const { data: agenda, isLoading: isAgendaLoading } = useGetAgendaByAuthorId({ skip: !selectedService, authorId: selectedService?.id ?? '' })

  useEffect(() => {
    const sortedResourceGroups = [...(agenda?.schedules ?? [])].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))

    const tableRows = sortedResourceGroups.map((resourceGroup) => {
      const newRow: SchedulingTableRow = {
        rowId: v4(),
        name: resourceGroup.name,
        startDateTime: resourceGroup.startDateTime,
        endDateTime: resourceGroup.endDateTime,
        items: resourceGroup.items,
      }
      return newRow
    })
    setSchedulingTableRow(tableRows)
  }, [agenda])

  const [updateAgenda, { isError: isUpdateAgendaError, isSuccess: isUpdateAgendaSuccess, isLoading: isUpdateAgendaLoading }] = useUpdateAgendaMutation()

  const isLoading = useMemo(() => isAgendaLoading || isUpdateAgendaLoading, [isAgendaLoading, isUpdateAgendaLoading])

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
      if (!agenda) throw new Error()
      const today = new Date()
      const start = formatDateToYYYYMMDDHHmmssNumber(today)
      const end = formatDateToYYYYMMDDHHmmssNumber(addMonths(endOfToday(), 1))
      const newRow: SchedulingTableRow = { rowId: v4(), name: t('content.new_schedule'), startDateTime: start, endDateTime: end, items: [] }
      setSchedulingTableRow((prev) => [...prev, newRow])
      handleEditClick(newRow)
    } catch (error) {
      openNotification('error', t('notification.schedule_save_failed'), t('notification.schedule_save_error'))
    }
  }

  const handleEditClick = (resourceGroup: SchedulingTableRow) => {
    setSelectedResourcegroup(resourceGroup)
    setShowRulesModal(true)
  }
  const handleDeleteClick = (resourceGroup: SchedulingTableRow) => {
    setResourceGroupToBeDelete(resourceGroup)
    setShowDeleteResourceGroupModal(true)
  }

  const handleDeleteResourceGroup = () => {
    try {
      if (!agenda || !resourceGroupToBeDelete) throw new Error()
      const updatedSchedule = agenda.schedules.filter((sched) => sched !== resourceGroupToBeDelete)
      updateAgenda({ ...agenda, schedules: updatedSchedule }).unwrap()
      showMessageFeedback('success', t('notification.schedule_deleted'))
    } catch (error) {
      openNotification('error', t('notification.schedule_delete_failed'), t('notification.schedule_delete_error'))
    } finally {
      setShowDeleteResourceGroupModal(false)
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

  const canAddSchedule = agenda?.schedules.length === schedulingTableRow.length

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
          <Table<SchedulingTableRow>
            pagination={{
              pageSize: 6,
              simple: true,
            }}
            scroll={{ y: 'calc(100vh - 500px)', x: 'max-content' }}
            dataSource={schedulingTableRow}
            rowKey={(record) => `${record.startDateTime}-${record.endDateTime}`}
            locale={{ emptyText: <Empty description={t('content.no_schedule_yet')} /> }}
            loading={isLoading}
          >
            <ColumnGroup
              title={
                <Tooltip title={selectedService ? (!canAddSchedule ? t('content.save_current_schedule_before_adding') : null) : t('content.select_service_for_schedule')}>
                  <Button style={{ width: '100%' }} disabled={!selectedService || !agenda || !canAddSchedule} onClick={addSchedule}>
                    {t('content.add_schedule')}
                  </Button>
                </Tooltip>
              }
            >
              <Column title={t('content.name')} dataIndex="name" key="name" width={'23%'} sorter={(a, b) => a.name.localeCompare(b.name)} />
              <Column
                title={t('content.start')}
                dataIndex="startDateTime"
                key="startDateTime"
                width={'23%'}
                render={(value: number) => {
                  const startDate = numberTimestampToDate(value) ?? new Date()
                  return format(startDate, 'P', { locale: dateFnsLocale })
                }}
              />
              <Column
                title={t('content.end')}
                dataIndex="endDateTime"
                key="endDateTime"
                width={'23%'}
                render={(value: number) => {
                  const endDate = numberTimestampToDate(value) ?? new Date()
                  return format(endDate, 'P', { locale: dateFnsLocale })
                }}
              />

              <Column
                title={t('content.actions')}
                key="actions"
                width={'16%'}
                render={(_: unknown, record: ResourceGroupAllocationSchedule) => (
                  <Space size="middle">
                    <Button onClick={() => handleEditClick(record)}>{t('content.edit')}</Button>
                    <Button onClick={() => handleDeleteClick(record)}>{t('content.delete')}</Button>
                  </Space>
                )}
              />
            </ColumnGroup>
          </Table>
        </div>
        {showRulesModal && createPortal(<ModalRules isVisible={showRulesModal} onClose={() => setShowRulesModal(false)} resourceGroup={selectedResourcegroup} agenda={agenda} />, document.body)}
        {showDeleteResourceGroupModal &&
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
              onYesClick={handleDeleteResourceGroup}
              onNoClick={() => setShowDeleteResourceGroupModal(false)}
              isVisible={showDeleteResourceGroupModal}
              mode="danger"
            />,
            document.body,
          )}
      </div>
    </CustomModal>
  )
}
