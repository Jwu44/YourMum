'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TypographyH3, TypographyP } from '../fonts/text';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import CenteredPane from '@/components/parts/CenteredPane';
import { useForm } from '../../lib/FormContext';

const StructurePreference: React.FC = () => {
  const router = useRouter();
  const { state, dispatch } = useForm();

  useEffect(() => {
    if (!state.layout_preference) {
      dispatch({
        type: 'UPDATE_FIELD',
        field: 'layout_preference',
        value: {
          structure: 'structured',
          subcategory: ''
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
        structure: value,
        subcategory: ''
      }
    });
  };

  const handleNext = () => {
    console.log('Form data:', state);
    if (state.layout_preference?.structure === 'structured') {
      router.push('/subcategory-preference');
    } else {
      router.push('/timebox-preference');
    }
  };

  const handlePrevious = () => {
    router.push('/energy-patterns');
  };

  return (
    <CenteredPane heading={<TypographyH3 className="mb-6">Customize Your To-Do List</TypographyH3>}>
      <div className="w-full text-left">
        <TypographyP className="mb-4">
          Let's understand your preferred daily structure.
        </TypographyP>
        
        <RadioGroup
          value={state.layout_preference?.structure || ''}
          onValueChange={handleInputChange}
          className="space-y-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem 
              value="structured" 
              id="structured" 
              className="border-white text-white focus:ring-white"
            />
            <Label htmlFor="structured">I prefer a structured day with clear sections</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem 
              value="unstructured" 
              id="unstructured" 
              className="border-white text-white focus:ring-white"
            />
            <Label htmlFor="unstructured">I like flexibility and do not want sections</Label>
          </div>
        </RadioGroup>
      </div>
      
      <div className="w-full flex justify-end space-x-2 mt-6">
        <Button onClick={handlePrevious} variant="ghost">Previous</Button>
        <Button onClick={handleNext} disabled={!state.layout_preference?.structure}>Next</Button>
      </div>
    </CenteredPane>
  );
};

export default StructurePreference;