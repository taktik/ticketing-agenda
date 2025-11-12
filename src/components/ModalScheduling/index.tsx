import { Agenda, ResourceGroupAllocationSchedule } from '@icure/cardinal-sdk'
import { Select as AntSelect, Button, Empty, message, notification, Space, Table, Tooltip } from 'antd'
import Column from 'antd/es/table/Column'
import { addMonths, endOfToday, format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { useUpdateAgendaMutation } from '../../core/api/agendaApi'
import { CustomModal } from '../common/CustomModal'
import { dateToYYYYMMDDHHmmss, localeMap, timestampToDate } from '../common/helpers'
import { ModalConfirmAction } from '../common/ModalConfirmAction'
import './index.css'
import { ModalRules } from './ModalRules'

export interface SchedulingTableRow extends ResourceGroupAllocationSchedule {
  rowId: string
}

interface ModalSchedulingProps {
  isVisible: boolean
  onClose: () => void
  services: Agenda[]
}

export const ModalScheduling = ({ isVisible, onClose, services }: ModalSchedulingProps): ReactElement => {
  const { t, i18n } = useTranslation()
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false)
  const [showDeleteResourceGroupModal, setShowDeleteResourceGroupModal] = useState<boolean>(false)
  const [selectedResourcegroup, setSelectedResourcegroup] = useState<SchedulingTableRow | undefined>(undefined)
  const [selectedService, setSelectedService] = useState<Agenda | undefined>(services?.[0])
  const [resourceGroupToBeDelete, setResourceGroupToBeDelete] = useState<SchedulingTableRow | undefined>(undefined)
  const [schedulingTableRows, setSchedulingTableRow] = useState<SchedulingTableRow[]>([])
  const dateFnsLocale = useMemo(() => localeMap[i18n.language] ?? enUS, [i18n])

  useEffect(() => {
    const sortedResourceGroups = [...(selectedService?.schedules ?? [])].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    const tableRows = sortedResourceGroups.map((resourceGroup) => {
      const scheduleInstance = new ResourceGroupAllocationSchedule(resourceGroup)
      const newRow: SchedulingTableRow = Object.assign(scheduleInstance, {
        rowId: v4(),
      })
      return newRow
    })
    setSchedulingTableRow(tableRows)
  }, [selectedService])

  const [updateAgenda, { isLoading: isUpdateAgendaLoading }] = useUpdateAgendaMutation()

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

  const handleEditClick = useCallback(
    (resourceGroup: SchedulingTableRow) => {
      setSelectedResourcegroup(resourceGroup)
      setShowRulesModal(true)
    },
    [setSelectedResourcegroup, setShowRulesModal],
  )

  const handleDeleteClick = useCallback(
    (resourceGroup: SchedulingTableRow) => {
      setResourceGroupToBeDelete(resourceGroup)
      setShowDeleteResourceGroupModal(true)
    },
    [setResourceGroupToBeDelete, setShowDeleteResourceGroupModal],
  )

  const addSchedule = useCallback(() => {
    try {
      if (!selectedService) throw new Error()
      const today = new Date()
      const start = dateToYYYYMMDDHHmmss(today)
      const end = dateToYYYYMMDDHHmmss(addMonths(endOfToday(), 1))
      const newScheduleInstance = new ResourceGroupAllocationSchedule({
        name: t('content.new_schedule'),
        startDateTime: start,
        endDateTime: end,
        items: [],
        tags: [],
        codes: [],
        resourceGroup: undefined,
      })

      const newRow: SchedulingTableRow = Object.assign(newScheduleInstance, {
        rowId: v4(),
      })
      setSchedulingTableRow((prev) => [...prev, newRow])
      handleEditClick(newRow)
    } catch (error) {
      openNotification('error', t('notification.schedule_save_failed'), t('notification.schedule_save_error'))
    }
  }, [selectedService, dateToYYYYMMDDHHmmss, setSchedulingTableRow, handleEditClick, openNotification, t])

  const showUpdateSuccessMessage = useCallback(
    (message: string) => {
      showMessageFeedback('success', message)
    },
    [showMessageFeedback],
  )

  const handleDeleteResourceGroup = useCallback(async () => {
    try {
      if (!selectedService || !resourceGroupToBeDelete) throw new Error('Missing service or resource group to delete')
      const updatedSchedule = schedulingTableRows.filter((row) => row.rowId !== resourceGroupToBeDelete.rowId).map(({ rowId, ...resourceGroup }) => new ResourceGroupAllocationSchedule({ ...resourceGroup }))
      await updateAgenda(new Agenda({ ...selectedService, schedules: updatedSchedule })).unwrap()
      showMessageFeedback('success', t('notification.schedule_deleted'))
    } catch (error) {
      console.error('Failed to delete resource group:', error)
      openNotification('error', t('notification.schedule_delete_failed'), t('notification.schedule_delete_error'))
    } finally {
      setShowDeleteResourceGroupModal(false)
    }
  }, [selectedService, resourceGroupToBeDelete, schedulingTableRows, updateAgenda, showMessageFeedback, t, openNotification, setShowDeleteResourceGroupModal])

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

  const canAddSchedule = useMemo(() => selectedService?.schedules.length === schedulingTableRows.length, [selectedService, schedulingTableRows])

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={t('content.schedule_list')} blockAntModalBodyVerticalScroll noFooter width={1300}>
      <div className="modal-schedule">
        {notificationContextHolder}
        {messageContextHolder}
        <div className="ant-select-schedule">
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
        <div className="table-add-entry margin-top">
          <Tooltip title={selectedService ? (!canAddSchedule ? t('content.save_current_schedule_before_adding') : null) : t('content.select_service_for_schedule')}>
            <Button style={{ width: '100%' }} disabled={!selectedService || !selectedService || !canAddSchedule} onClick={addSchedule}>
              {t('content.add_schedule')}
            </Button>
          </Tooltip>
        </div>
        <div className="antTable">
          <Table<SchedulingTableRow>
            pagination={false}
            scroll={{ y: 'calc(800px - 350px)', x: 'max-content' }}
            dataSource={schedulingTableRows}
            rowKey={(record) => `${record.startDateTime}-${record.endDateTime}`}
            locale={{ emptyText: <Empty description={t('content.no_schedule_yet')} /> }}
            loading={isUpdateAgendaLoading}
          >
            <Column title={t('content.name')} dataIndex="name" key="name" width={'23%'} sorter={(a, b) => a.name.localeCompare(b.name)} />
            <Column
              title={t('content.start')}
              dataIndex="startDateTime"
              key="startDateTime"
              width={'23%'}
              render={(value: number) => {
                const startDate = timestampToDate(value) ?? new Date()
                return format(startDate, 'P', { locale: dateFnsLocale })
              }}
            />
            <Column
              title={t('content.end')}
              dataIndex="endDateTime"
              key="endDateTime"
              width={'23%'}
              render={(value: number) => {
                const endDate = timestampToDate(value) ?? new Date()
                return format(endDate, 'P', { locale: dateFnsLocale })
              }}
            />

            <Column
              title={t('content.actions')}
              key="actions"
              width={'16%'}
              render={(_: unknown, record: SchedulingTableRow) => (
                <Space size="middle">
                  <Button onClick={() => handleEditClick(record)}>{t('content.edit')}</Button>
                  <Button onClick={() => handleDeleteClick(record)}>{t('content.delete')}</Button>
                </Space>
              )}
            />
          </Table>
        </div>
        {showRulesModal &&
          createPortal(
            <ModalRules
              isVisible={showRulesModal}
              onClose={() => setShowRulesModal(false)}
              schedulingTableRow={selectedResourcegroup}
              schedulingTableRows={schedulingTableRows}
              agenda={selectedService}
              showUpdateSuccessMessage={showUpdateSuccessMessage}
            />,
            document.body,
          )}
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
