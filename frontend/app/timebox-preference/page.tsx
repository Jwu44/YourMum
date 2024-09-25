'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TypographyH3, TypographyP } from '../fonts/text';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import CenteredPane from '@/components/parts/CenteredPane';
import { useForm } from '../../lib/FormContext';

const TimeboxPreference: React.FC = () => {
  const router = useRouter();
  const { state, dispatch } = useForm();

  useEffect(() => {
    if (!state.layout_preference?.timeboxed) {
      dispatch({
        type: 'UPDATE_FIELD',
        field: 'layout_preference',
        value: {
          ...state.layout_preference,
          timeboxed: 'timeboxed' // Set default value
        }
      });
    }
  }, [state.layout_preference, dispatch]);

  const handleInputChange = (value: string) => {
    dispatch({
      type: 'UPDATE_FIELD',
      field: 'layout_preference',
      value: {
        ...state.layout_preference,
        timeboxed: value
      }
    });
  };

  const handleSubmit = () => {
    console.log('Form data:', state);
    router.push('/dashboard');
  };

  const handlePrevious = () => {
    if (state.layout_preference?.structure === 'structured') {
      router.push('/subcategory-preference');
    } else {
      router.push('/structure-preference');
    }
  };

  return (
    <CenteredPane heading={<TypographyH3 className="mb-6">Task Timeboxing Preference</TypographyH3>}>
      <div className="w-full text-left">
        <TypographyP className="mb-4">
          Would you like your tasks to be timeboxed?
        </TypographyP>
        
        <RadioGroup
          value={state.layout_preference?.timeboxed || ''}
          onValueChange={handleInputChange}
          className="space-y-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem 
              value="timeboxed" 
              id="timeboxed" 
              className="border-white text-white focus:ring-white"
            />
            <Label htmlFor="timeboxed">Yes, I want timeboxed tasks</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem 
              value="untimeboxed" 
              id="untimeboxed" 
              className="border-white text-white focus:ring-white"
            />
            <Label htmlFor="untimeboxed">No, I prefer flexible timing</Label>
          </div>
        </RadioGroup>
      </div>
      
      <div className="w-full flex justify-end space-x-2 mt-6">
        <Button onClick={handlePrevious} variant="ghost">Previous</Button>
        <Button onClick={handleSubmit} disabled={!state.layout_preference?.timeboxed}>Submit</Button>
      </div>
    </CenteredPane>
  );
};

export default TimeboxPreference;