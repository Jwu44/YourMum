'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TypographyH3 } from '../fonts/text';
import { Button } from '../../components/ui/button';
import CenteredPane from '../../components/parts/CenteredPane';
import { useForm } from '../../lib/FormContext';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Initialize dayjs plugins
dayjs.extend(customParseFormat);

const WorkTimes = () => {
  const router = useRouter();
  const { state, dispatch } = useForm();
  
  // Create MUI theme based on system preference
  const theme = createTheme({
    palette: {
      mode: 'dark', // Force dark mode
      primary: {
        main: '#ffffff', // White for dark mode
      },
      text: {
        primary: '#ffffff',
        secondary: '#ffffff',
      },
      background: {
        paper: '#1a1a1a',
        default: '#0a0a0a',
      },
    },
    components: {
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiInputBase-root': {
              color: '#ffffff',
              borderColor: '#ffffff',
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.23)',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#ffffff',
              },
            },
            '& .MuiInputBase-input': {
              color: '#ffffff',
            },
            '& .MuiIconButton-root': {
              color: '#ffffff',
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: '#ffffff',
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: '#ffffff',
          },
        },
      },
      MuiPopper: {
        styleOverrides: {
          root: {
            '& .MuiPaper-root': {
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
            },
            '& .MuiClock-root': {
              backgroundColor: '#1a1a1a',
            },
            '& .MuiClock-clock': {
              backgroundColor: '#1a1a1a',
            },
            '& .MuiClock-pin': {
              backgroundColor: '#ffffff',
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: '#1a1a1a',
            '& .MuiClock-root': {
              backgroundColor: '#1a1a1a',
            },
            '& .MuiClock-clock': {
              backgroundColor: '#1a1a1a',
            },
            '& .MuiClock-pin': {
              backgroundColor: '#ffffff',
            },
          },
        },
      },
      MuiTypography: {
        styleOverrides: {
          root: {
            color: '#ffffff',
          },
        },
      },
    },
  });

  // Handle time change
  const handleTimeChange = (name: 'work_start_time' | 'work_end_time') => (newValue: any) => {
    if (newValue && dayjs.isDayjs(newValue)) {
      // Format time to 12-hour format with AM/PM using dayjs
      const formattedTime = newValue.format('h:mmA');
      dispatch({ type: 'UPDATE_FIELD', field: name, value: formattedTime });
    }
  };

  const handleNext = () => {
    console.log('Form data:', state);
    router.push('/priorities');
  };

  const handlePrevious = () => {
    router.push('/personal-details');
  };

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CenteredPane heading={<TypographyH3 className="mb-6">Work Times</TypographyH3>}>
                    {/* Time pickers side by side */}
                    <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block mb-2 text-sm font-medium">Start Time</label>
              <TimePicker
                value={state.work_start_time ? dayjs(`2024-01-01 ${state.work_start_time}`) : null}
                onChange={handleTimeChange('work_start_time')}
                views={['hours', 'minutes']}
                ampm={true}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    placeholder: "Select time",
                    sx: {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.23)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '& .MuiIconButton-root': {
                        color: '#ffffff',
                      },
                    },
                  },
                }}
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium">End Time</label>
              <TimePicker
                value={state.work_end_time ? dayjs(`2024-01-01 ${state.work_end_time}`) : null}
                onChange={handleTimeChange('work_end_time')}
                views={['hours', 'minutes']}
                ampm={true}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    placeholder: "Select time",
                    sx: {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.23)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '& .MuiIconButton-root': {
                        color: '#ffffff',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="w-full flex justify-end space-x-2 mt-6">
            <Button onClick={handlePrevious} variant="ghost">Previous</Button>
            <Button onClick={handleNext}>Next</Button>
          </div>
        </CenteredPane>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default WorkTimes;