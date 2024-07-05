import React from 'react';
import { Heading, Pane } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { TextField } from '@mui/material';
import { parse, format } from 'date-fns';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';

const WorkTimes = ({ formData, setFormData }) => {
  const navigate = useNavigate();

  const handleTimeChange = (name) => (newValue) => {
    setFormData(prevData => ({
      ...prevData,
      [name]: newValue ? format(newValue, 'h:mma') : ''
    }));
  };

  const handleNext = () => {
    navigate('/tasks');
  };

  const handlePrevious = () => {
    navigate('/personal-details');
  };

  const parseTime = (timeString) => {
    if (!timeString) return null;
    return parse(timeString, 'h:mma', new Date());
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <CenteredPane>
          <Heading size={700} marginBottom={24} textAlign="center">Work Times</Heading>
          <Pane display="flex" width="100%" justifyContent="space-between" marginBottom={24}>
              <TimePicker
                label="Work Start Time"
                value={parseTime(formData.work_start_time)}
                onChange={handleTimeChange('work_start_time')}
                renderInput={(params) => <TextField {...params} fullWidth />}
                ampm={true}
                views={['hours', 'minutes']}
                format="h:mm a"
              />
              <TimePicker
                label="Work End Time"
                value={parseTime(formData.work_end_time)}
                onChange={handleTimeChange('work_end_time')}
                renderInput={(params) => <TextField {...params} fullWidth />}
                ampm={true}
                views={['hours', 'minutes']}
                format="h:mm a"
              />
          </Pane>
          <OnboardingNav onBack={handlePrevious} onNext={handleNext} marginTop={24} />
      </CenteredPane>
    </LocalizationProvider>
  );
};

export default WorkTimes;