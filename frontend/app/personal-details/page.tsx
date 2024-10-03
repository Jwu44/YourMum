'use client';

import React from 'react';
import { useRouter } from 'next/navigation'; 
import { TypographyH3 } from '../fonts/text';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import CenteredPane from '../../components/parts/CenteredPane';
import { useForm } from '../../lib/FormContext';

const PersonalDetails: React.FC = () => {
  const router = useRouter();
  const { state, dispatch } = useForm();

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    dispatch({ type: 'UPDATE_FIELD', field: name, value });
  };

  const handleNext = () => {
    console.log('Form data:', state);
    router.push('/work-times');
  };

  return (
    <CenteredPane heading={<TypographyH3 className="mb-6">Personal Details</TypographyH3>}>
      <div className="w-full space-y-4">
        <Input
          name="name"
          value={state.name}
          onChange={handleInputChange}
          placeholder="Name"
        />
        <Input
          name="age"
          type="number"
          value={state.age}
          onChange={handleInputChange}
          placeholder="Age"
        />
      </div>
      <div className="w-full flex justify-end mt-6">
        <Button onClick={handleNext}>Next</Button>
      </div>
    </CenteredPane>
  );
};

export default PersonalDetails;