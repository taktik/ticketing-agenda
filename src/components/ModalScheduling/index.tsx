import { HealthcareParty, TimeTable } from '@icure/cardinal-sdk'
import { Select as AntSelect, Button, Empty, Space, Table, Tooltip, notification, message } from 'antd'
import React, { ReactElement, useEffect, useMemo, useState } from 'react'

import Column from 'antd/es/table/Column'
import ColumnGroup from 'antd/es/table/ColumnGroup'
import { useGetAgendaByAuthorId } from '../../core/api/agendaApi'
import { useCreateUpdateTimeTableMutation, useDeleteTimeTableMutation, useGetTimeTablesQuery } from '../../core/api/timeTableApi'
import { useAppSelector } from '../../core/hooks'
import { CustomModal } from '../common/CustomModal'
import './index.css'
import { addDays, addMonths, format, Locale, startOfDay } from 'date-fns'
import { enUS, fr, de, nl } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { ModalConfirmAction } from '../common/ModalConfirmAction'
import { ModalRules } from './ModalRules'
import { v4 } from 'uuid'

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
  const [selectedTimeTable, setSelectedTimeTable] = useState<TimeTable | undefined>(undefined)
  const [selectedService, setSelectedService] = useState<HealthcareParty | undefined>(services?.[0])
  const [timeTableToBeDelete, setTimeTableToBeDelete] = useState<TimeTable | undefined>(undefined)
  const dateFnsLocale = useMemo(() => localeMap[i18n.language] ?? enUS, [i18n])

  const { data: agenda } = useGetAgendaByAuthorId({ skip: !selectedService, authorId: selectedService?.id ?? '' })
  const { data: timeTables } = useGetTimeTablesQuery({ skip: !agenda, agendaId: agenda?.id ?? '' })

  const [deleteTimeTable, { isError: isDeleteTimeTableError, isSuccess: isDeleteTimeTableSuccess, isLoading: isDeleteTimeTableLoading }] = useDeleteTimeTableMutation()
  const [createUpdateTimeTable, { isError: isCreateUpdateTimeTableError, isSuccess: isCreateUpdateTimeTableSuccess, isLoading: isCreateUpdateTimeTableLoading }] =
    useCreateUpdateTimeTableMutation()

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
      const start = today.getTime()
      const end = addMonths(today, 1).getTime()
      createUpdateTimeTable(new TimeTable({ name: 'New Schedule', agendaId: agenda.id, startTime: start, endTime: end, id: v4() }))
    } catch (error) {
      openNotification('error', 'Update failed', error instanceof Error ? error.message : 'An unexpected error occurred.')
    }
  }
  const handleEditClick = (timeTable: TimeTable) => {
    setSelectedTimeTable(timeTable)
    setShowRulesModal(true)
  }
  const handleDeleteClick = (timeTable: TimeTable) => {
    setTimeTableToBeDelete(timeTable)
    setShowDeleteTimeTableModal(true)
  }

  const handleDeleteTimeTable = () => {
    if (agenda && timeTableToBeDelete) {
      deleteTimeTable(timeTableToBeDelete)
    } else {
      // error
    }
    setShowDeleteTimeTableModal(false)
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
    if (isDeleteTimeTableSuccess) showMessageFeedback('success', 'The schedule was deleted!')
    if (isDeleteTimeTableError) openNotification('error', 'We could not delete the schedule!', `An error occurred while deleting the schedule.`)
  }, [isDeleteTimeTableSuccess, isDeleteTimeTableError])

  //Save notifications
  useEffect(() => {
    if (isCreateUpdateTimeTableSuccess) showMessageFeedback('success', 'The schedule was saved!')
    if (isCreateUpdateTimeTableError) openNotification('error', 'We could not save the schedule!', `An error occurred while saving the schedule.`)
  }, [isCreateUpdateTimeTableSuccess, isCreateUpdateTimeTableError])

  return (
    <CustomModal isVisible={isVisible} handleClose={onClose} title="Liste des horaires" blockAntModalBodyVerticalScroll noFooter>
      <div className="modalSchedule">
        {notificationContextHolder}
        {messageContextHolder}
        <div className="antSelect">
          Services
          <AntSelect
            allowClear
            showSearch
            style={{ width: '20%' }}
            placeholder="Select a service"
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
          <Table<TimeTable> dataSource={timeTables ?? []} rowKey="id" locale={{ emptyText: <Empty description="No schedule yet" /> }}>
            <ColumnGroup
              title={
                <Tooltip title={selectedService ? null : 'You need to select a service to add a schedule'}>
                  <Button style={{ width: '100%' }} disabled={!selectedService} onClick={addSchedule}>
                    Ajouter un horaire
                  </Button>
                </Tooltip>
              }
            >
              <Column title="Nom" dataIndex="name" key="name" width={'28%'} />
              <Column title="Début" dataIndex="startTime" key="startTime" width={'28%'} render={(value: number) => format(new Date(value), 'P', { locale: dateFnsLocale })} />
              <Column title="Fin" dataIndex="endTime" key="endTime" width={'28%'} render={(value: number) => format(new Date(value), 'P', { locale: dateFnsLocale })} />

              <Column
                title="Action"
                key="action"
                width={'16%'}
                render={(_: unknown, record: TimeTable) => (
                  <Space size="middle">
                    <Button onClick={() => handleEditClick(record)}>Editer</Button>
                    <Button onClick={() => handleDeleteClick(record)}>Supprimer</Button>
                  </Space>
                )}
              />
            </ColumnGroup>
          </Table>
        </div>
        {showRulesModal && createPortal(<ModalRules isVisible={showRulesModal} onClose={() => setShowRulesModal(false)} timeTable={selectedTimeTable} />, document.body)}
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
              yesBtnTitle="Delete"
              noBtnTitle="Close"
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
