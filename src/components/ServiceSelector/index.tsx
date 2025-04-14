import React, { ReactElement, useCallback } from 'react'
import './index.css'
import { Box, Typography, Button } from '@mui/material'
import { Agenda } from '@icure/cardinal-sdk'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import IconButton from '@mui/material/IconButton'
interface AServiceSelectorProps {
  agendas: Agenda[]
  selectedAgenda: Agenda | undefined
  setSelectedAgenda: React.Dispatch<React.SetStateAction<Agenda | undefined>>
  setAgendaModalOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export const ServiceSelector = ({ agendas, selectedAgenda, setSelectedAgenda, setAgendaModalOpen }: AServiceSelectorProps): ReactElement => {
  const addAgenda = useCallback(() => {
    setAgendaModalOpen(true)
  }, [])
  return (
    <div className="AgendaSelector">
      <Box
        sx={{
          width: '300px',
          height: 'auto',
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: 2,
          gap: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="AgendaSelectorHeader">
          <Typography variant="h6">Services</Typography>
          <IconButton color="primary" aria-label="add to shopping cart" onClick={addAgenda}>
            <AddOutlinedIcon />
          </IconButton>
        </div>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          {agendas.map((agenda) => {
            const isSelected = selectedAgenda?.id === agenda.id
            return (
              <Button
                key={agenda.id}
                variant={isSelected ? 'contained' : 'outlined'}
                onClick={() => setSelectedAgenda(agenda)}
                sx={{
                  minWidth: '80px',
                  whiteSpace: 'nowrap',
                  ...(isSelected && {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    borderColor: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  }),
                }}
              >
                {agenda.name}
              </Button>
            )
          })}
        </Box>
      </Box>
    </div>
  )
}
