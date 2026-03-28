import { Agenda, ResourceGroupAllocationSchedule } from '@icure/cardinal-sdk'
import { Select as AntSelect, Button, Empty, message, Space, Table, Tooltip } from 'antd'
import Column from 'antd/es/table/Column'
import { addMonths, endOfToday, format, startOfToday } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { v4 } from 'uuid'
import { useUpdateAgendaMutation } from '../../core/api/agendaApi'
import { CustomModal } from '../common/CustomModal'
import { dateToYYYYMMDDHHmmss, localeMap, timestampToDate } from '../common/helpers'
import { ModalConfirmAction } from '../common/ModalConfirmAction'
import './index.less'
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
  const dateFnsLocale = useMemo(() => localeMap[i18n.language] ?? enUS, [i18n])
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(services?.[0]?.id)
  const selectedService = useMemo(() => services.find((s) => s.id === selectedServiceId), [services, selectedServiceId])
  const [schedulingTableRows, setSchedulingTableRow] = useState<SchedulingTableRow[]>([])
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false)
  const [showDeleteResourceGroupModal, setShowDeleteResourceGroupModal] = useState<boolean>(false)
  const [selectedResourceGroup, setSelectedResourceGroup] = useState<SchedulingTableRow | undefined>(undefined)
  const [resourceGroupToBeDeleted, setResourceGroupToBeDeleted] = useState<SchedulingTableRow | undefined>(undefined)

  useEffect(() => {
    const sortedResourceGroups = [...(selectedService?.schedules ?? [])].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    const tableRows = sortedResourceGroups.map((resourceGroup) => {
      const instance = new ResourceGroupAllocationSchedule(resourceGroup)
      return Object.assign(instance, { rowId: v4() })
    })
    setSchedulingTableRow(tableRows)
  }, [selectedService])

  const [updateAgenda, { isLoading: isUpdateAgendaLoading }] = useUpdateAgendaMutation()
  const [messageApi, messageContextHolder] = message.useMessage()

  const handleEditClick = useCallback((resourceGroup: SchedulingTableRow) => {
    setSelectedResourceGroup(resourceGroup)
    setShowRulesModal(true)
  }, [])

  const handleDeleteClick = useCallback((resourceGroup: SchedulingTableRow) => {
    setResourceGroupToBeDeleted(resourceGroup)
    setShowDeleteResourceGroupModal(true)
  }, [])

  const addSchedule = useCallback(() => {
    if (!selectedService) return

    const start = dateToYYYYMMDDHHmmss(startOfToday())
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
    const newRow = Object.assign(newScheduleInstance, { rowId: v4() })
    setSchedulingTableRow((prev) => [...prev, newRow])
    handleEditClick(newRow)
  }, [selectedService, t, handleEditClick])

  const handleDeleteResourceGroup = useCallback(async () => {
    try {
      if (!selectedService || !resourceGroupToBeDeleted) return
      const updatedSchedules = schedulingTableRows.filter((row) => row.rowId !== resourceGroupToBeDeleted.rowId).map(({ rowId, ...resourceGroup }) => new ResourceGroupAllocationSchedule(resourceGroup))
      await updateAgenda(new Agenda({ ...selectedService, schedules: updatedSchedules })).unwrap()
      messageApi.success(t('notification.schedule_deleted'))
    } catch (error) {
      console.error('Failed to delete resource group:', error)
      messageApi.error(t('notification.schedule_delete_failed'))
    } finally {
      setShowDeleteResourceGroupModal(false)
    }
  }, [selectedService, resourceGroupToBeDeleted, schedulingTableRows, updateAgenda, messageApi, t])

  const serviceOptions = useMemo(() => services.map((service) => ({ label: service.name, value: service.id })), [services])

  const hasUnsavedChanges = selectedService?.schedules.length !== schedulingTableRows.length

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title={t('content.schedule_list')} blockAntModalBodyVerticalScroll noFooter width={1300}>
      <div className="modal-schedule">
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
            options={serviceOptions}
            value={selectedService ? { label: selectedService.name, value: selectedService.id } : undefined}
            onChange={(option) => setSelectedServiceId(option?.value)}
          />
        </div>

        <div className="table-add-entry margin-top">
          <Tooltip title={selectedService ? (hasUnsavedChanges ? t('content.save_current_schedule_before_adding') : null) : t('content.select_service_for_schedule')}>
            <span>
              <Button style={{ width: '100%' }} disabled={!selectedService || hasUnsavedChanges} onClick={addSchedule}>
                {t('content.add_schedule')}
              </Button>
            </span>
          </Tooltip>
        </div>

        <div className="antTable">
          <Table<SchedulingTableRow>
            pagination={false}
            scroll={{ y: 'calc(800px - 350px)', x: 'max-content' }}
            dataSource={schedulingTableRows}
            rowKey="rowId"
            locale={{ emptyText: <Empty description={t('content.no_schedule_yet')} /> }}
            loading={isUpdateAgendaLoading}
          >
            <Column title={t('content.name')} dataIndex="name" key="name" width={'23%'} sorter={(a: SchedulingTableRow, b: SchedulingTableRow) => (a.name || '').localeCompare(b.name || '')} />
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
              schedulingTableRow={selectedResourceGroup}
              schedulingTableRows={schedulingTableRows}
              agenda={selectedService}
              showUpdateSuccessMessage={(msg) => messageApi.success(msg)}
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
