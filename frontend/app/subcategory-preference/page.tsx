'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TypographyH3, TypographyP } from '../fonts/text';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CenteredPane from '@/components/parts/CenteredPane';
import { useForm } from '../../lib/FormContext';

const SubcategoryPreference: React.FC = () => {
  const router = useRouter();
  const { state, dispatch } = useForm();

  const handleInputChange = (value: string) => {
    dispatch({
      type: 'UPDATE_FIELD',
      field: 'layout_preference',
      value: {
        ...state.layout_preference,
        subcategory: value
      }
    });
  };

  const handleNext = () => {
    console.log('Form data:', state);
    router.push('/timebox-preference');
  };

  const handlePrevious = () => {
    router.push('/structure-preference');
  };

  return (
    <CenteredPane heading={<TypographyH3 className="mb-6">Choose Your Structured Layout</TypographyH3>}>
      <div className="w-full text-left">
        <TypographyP className="mb-4">
          Select the type of structure you prefer for your day.
        </TypographyP>
        
        <Select
          value={state.layout_preference?.subcategory || ''}
          onValueChange={handleInputChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a layout type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day-sections">Day Sections (Morning, Afternoon, Evening)</SelectItem>
            <SelectItem value="priority">Priority (High, Medium, Low)</SelectItem>
            <SelectItem value="category">Category Based (Work, Fun, Relationships, Ambition, Exercise)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="w-full flex justify-end space-x-2 mt-6">
        <Button onClick={handlePrevious} variant="ghost">Previous</Button>
        <Button onClick={handleNext} disabled={!state.layout_preference?.subcategory}>Next</Button>
      </div>
    </CenteredPane>
  );
};

export default SubcategoryPreference;