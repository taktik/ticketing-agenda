import { InputNumber, Select, Space } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const { Option } = Select

interface DurationInputProps {
	value?: number | null
	onChange?: (totalMinutes: number | undefined) => void
	defaultUnit?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months'
	placeholder?: string // Placeholder for the InputNumber
}

const unitMultipliers: Record<string, number> = {
	minutes: 1,
	hours: 60,
	days: 60 * 24,
	weeks: 60 * 24 * 7,
}

export const DurationInput: React.FC<DurationInputProps> = ({
	value,
	onChange,
	defaultUnit = 'days',
	placeholder = '0',
}) => {
	const [quantity, setQuantity] = useState<number | null>(null)
	const [currentUnit, setCurrentUnit] = useState<string>(defaultUnit)
	const { t } = useTranslation()

	const unitOptions = [
		{ label: t('content.unit_minutes'), value: 'minutes' },
		{ label: t('content.unit_hours'), value: 'hours' },
		{ label: t('content.unit_days'), value: 'days' },
		{ label: t('content.unit_weeks'), value: 'weeks' },
	]

	// Find the "best" unit and quantity for displaying a totalMinutes value
	const decomposeMinutesForDisplay = (
		totalMinutes: number | null | undefined,
		preferredInitialUnit: string
	) => {
		if (
			totalMinutes === null ||
			totalMinutes === undefined ||
			isNaN(totalMinutes) ||
			totalMinutes < 0
		) {
			return { quantity: null, unit: preferredInitialUnit }
		}
		if (totalMinutes === 0) {
			return { quantity: 0, unit: preferredInitialUnit }
		}

		// Try preferred unit first if it results in a whole number
		if (
			unitMultipliers[preferredInitialUnit] &&
			totalMinutes % unitMultipliers[preferredInitialUnit] === 0
		) {
			return {
				quantity: totalMinutes / unitMultipliers[preferredInitialUnit],
				unit: preferredInitialUnit,
			}
		}

		// Otherwise, find the largest unit that divides cleanly
		for (let i = unitOptions.length - 1; i >= 0; i--) {
			// Iterate from largest unit
			const unitInfo = unitOptions[i]
			if (
				totalMinutes >= unitMultipliers[unitInfo.value] &&
				totalMinutes % unitMultipliers[unitInfo.value] === 0
			) {
				return { quantity: totalMinutes / unitMultipliers[unitInfo.value], unit: unitInfo.value }
			}
		}
		// Fallback: if no clean division, use the preferred initial unit, or default to minutes
		if (unitMultipliers[preferredInitialUnit]) {
			return {
				quantity: parseFloat((totalMinutes / unitMultipliers[preferredInitialUnit]).toFixed(2)),
				unit: preferredInitialUnit,
			}
		}
		return { quantity: totalMinutes, unit: 'minutes' }
	}

	useEffect(() => {
		// When the external value (total minutes from form) changes,
		// decompose it for display in our quantity/unit inputs.
		const decomposed = decomposeMinutesForDisplay(value, currentUnit) // Try to keep current unit if sensible
		setQuantity(decomposed.quantity)
		setCurrentUnit(decomposed.unit)
	}, [value])

	const triggerFormChange = (currentQuantity: number | null, unitToUse: string) => {
		if (currentQuantity === null || isNaN(currentQuantity) || currentQuantity < 0) {
			onChange?.(undefined)
		} else {
			const factor = unitMultipliers[unitToUse] || 1
			onChange?.(Math.floor(currentQuantity * factor))
		}
	}

	const handleQuantityChange = (newQuantity: number | null) => {
		setQuantity(newQuantity)
		triggerFormChange(newQuantity, currentUnit)
	}

	const handleUnitChange = (newUnit: string) => {
		setCurrentUnit(newUnit)
		triggerFormChange(quantity, newUnit)
	}

	return (
		<Space.Compact style={{ width: '100%', display: 'flex' }}>
			<InputNumber
				style={{ flex: 1 }}
				value={quantity}
				onChange={handleQuantityChange}
				min={0}
				placeholder={placeholder}
			/>
			<Select style={{ width: '120px' }} value={currentUnit} onChange={handleUnitChange}>
				{unitOptions.map((opt) => (
					<Option key={opt.value} value={opt.value}>
						{opt.label}
					</Option>
				))}
			</Select>
		</Space.Compact>
	)
}
