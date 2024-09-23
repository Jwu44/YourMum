'use client';

import React from 'react';
import { TypographyH3 } from '../fonts/text';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { TimePickerInput } from '../../components/parts/TimePicker';
import CenteredPane from '../../components/parts/CenteredPane';
import { format, setMinutes } from 'date-fns';

const WorkTimes = () => {
  const router = useRouter();
  const [formData, setFormData] = React.useState({
    work_start_time: setMinutes(new Date().setHours(9), 0),
    work_end_time: setMinutes(new Date().setHours(17), 0),
  });

  const handleTimeChange = (name: 'work_start_time' | 'work_end_time') => (newValue: Date | undefined) => {
    if (newValue) {
      setFormData(prevData => ({
        ...prevData,
        [name]: setMinutes(newValue, 0)  // Always set minutes to 00
      }));
    }
  };

  const handleNext = () => {
    const formattedData = {
      work_start_time: format(formData.work_start_time, 'h:mma'),
      work_end_time: format(formData.work_end_time, 'h:mma'),
    };
    console.log(formattedData);
    router.push('/priorities');
  };

  const handlePrevious = () => {
    router.push('/personal-details');
  };

  return (
    <CenteredPane heading={<TypographyH3 className="mb-6">Work Times</TypographyH3>}>
      <div className="flex justify-center w-full mb-6 space-x-4">
        <div className="w-full max-w-[150px]">
          <label className="block mb-2 text-sm font-medium">Start Time</label>
          <div className="flex items-center space-x-2">
            <TimePickerInput
              picker="hours"
              date={formData.work_start_time}
              setDate={handleTimeChange('work_start_time')}
              aria-label="Work Start Time Hours"
            />
            <span>:</span>
            <TimePickerInput
              picker="minutes"
              date={formData.work_start_time}
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
              date={formData.work_end_time}
              setDate={handleTimeChange('work_end_time')}
              aria-label="Work End Time Hours"
            />
            <span>:</span>
            <TimePickerInput
              picker="minutes"
              date={formData.work_end_time}
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