import { HealthcareParty } from '@icure/cardinal-sdk'
import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
//export const ModalSettings = ({ isVisible, onClose, selectedSite }: ModalSchedulingProps): ReactElement => {
interface ServiceSettingProps {
  service: HealthcareParty | undefined
}

export const ServiceSetting = ({ service }: ServiceSettingProps): ReactElement => {
  return <div className="Root">Service setting</div>
}
