'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TypographyH3 } from '../fonts/text';
import { Button } from '../../components/ui/button';
import { TimePickerInput } from '../../components/parts/TimePicker';
import CenteredPane from '../../components/parts/CenteredPane';
import { useForm } from '../../lib/FormContext';
import { format, setMinutes, parse } from 'date-fns';

const WorkTimes = () => {
  const router = useRouter();
  const { state, dispatch } = useForm();

  useEffect(() => {
    if (!state.work_start_time) {
      dispatch({ type: 'UPDATE_FIELD', field: 'work_start_time', value: '9:00AM' });
    }
    if (!state.work_end_time) {
      dispatch({ type: 'UPDATE_FIELD', field: 'work_end_time', value: '5:00PM' });
    }
  }, []);
  
  const handleTimeChange = (name: 'work_start_time' | 'work_end_time') => (newValue: Date | undefined) => {
    if (newValue) {
      const formattedTime = format(setMinutes(newValue, 0), 'h:mma');
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

  // Parse the time string to Date object for TimePickerInput
  const parseTime = (timeString: string) => {
    return parse(timeString, 'h:mma', new Date());
  };

  return (
    <CenteredPane heading={<TypographyH3 className="mb-6">Work Times</TypographyH3>}>
      <div className="flex justify-center w-full mb-6 space-x-8">
        <div className="w-full max-w-[150px]">
          <label className="block mb-2 text-sm font-medium">Start Time</label>
          <div className="flex items-center space-x-2">
            <TimePickerInput
              picker="hours"
              date={parseTime(state.work_start_time)}
              setDate={handleTimeChange('work_start_time')}
              aria-label="Work Start Time Hours"
            />
            <span>:</span>
            <TimePickerInput
              picker="minutes"
              date={parseTime(state.work_start_time)}
              setDate={handleTimeChange('work_start_time')}
              aria-label="Work Start Time Minutes"
              value="00"
              readOnly
            />
          </div>
        </div>
        <div className="w-full max-w-[150px]">
          <label className="block mb-2 text-sm font-medium">End Time</label>
          <div className="flex items-center space-x-2">
            <TimePickerInput
              picker="hours"
              date={parseTime(state.work_end_time)}
              setDate={handleTimeChange('work_end_time')}
              aria-label="Work End Time Hours"
            />
            <span>:</span>
            <TimePickerInput
              picker="minutes"
              date={parseTime(state.work_end_time)}
              setDate={handleTimeChange('work_end_time')}
              aria-label="Work End Time Minutes"
              value="00"
              readOnly
            />
          </div>
        </div>
      </div>
      <div className="w-full flex justify-end space-x-2 mt-6">
        <Button onClick={handlePrevious} variant="ghost">Previous</Button>
        <Button onClick={handleNext}>Next</Button>
      </div>
    </CenteredPane>
  );
};

export default WorkTimes;