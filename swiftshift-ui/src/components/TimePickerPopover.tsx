import { useState } from 'react';
import { format } from 'date-fns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { StaticTimePicker } from '@mui/x-date-pickers/StaticTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import TextField from '@mui/material/TextField';
import Popover from '@mui/material/Popover';
import IconButton from '@mui/material/IconButton';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

type TimePickerPopoverProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  fallbackValue?: string;
};

const parseTime = (value: string, fallbackValue: string) => {
  const safeValue = value || fallbackValue;
  const [hours, minutes] = safeValue.split(':').map(Number);
  const date = new Date();
  date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return date;
};

export const TimePickerPopover = ({
  label,
  value,
  onChange,
  fallbackValue = '09:00',
}: TimePickerPopoverProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div>
      <div className="text-sm font-medium text-gray-600">{label}</div>
      <div className="mt-2 flex items-center gap-2">
        <TextField
          size="small"
          value={value}
          onChange={event => onChange(event.target.value)}
          inputProps={{ readOnly: true }}
          fullWidth
        />
        <IconButton aria-label={`Pick ${label.toLowerCase()}`} onClick={handleOpen}>
          <AccessTimeIcon />
        </IconButton>
      </div>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <StaticTimePicker
            displayStaticWrapperAs="desktop"
            value={parseTime(value, fallbackValue)}
            onChange={nextValue => {
              if (!nextValue || Number.isNaN(nextValue.getTime())) {
                return;
              }
              onChange(format(nextValue, 'HH:mm'));
            }}
            onAccept={handleClose}
            onClose={handleClose}
            minutesStep={15}
            slotProps={{
              actionBar: {
                actions: ['cancel', 'accept'],
              },
            }}
          />
        </LocalizationProvider>
      </Popover>
    </div>
  );
};
