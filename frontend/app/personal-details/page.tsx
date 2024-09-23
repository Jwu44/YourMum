'use client';

import React from 'react';
import { TypographyH3 } from '../fonts/text';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { handleSimpleInputChange } from '../../lib/helper';
import CenteredPane from '../../components/parts/CenteredPane';

const Personal = () => {
  const router = useRouter();
  const [formData, setFormData] = React.useState({
    name: '',
    age: '',
  });

  const handleInputChange = handleSimpleInputChange(setFormData);

  const handleNext = () => {
    router.push('/work-times');
  };

  return (
    <CenteredPane heading={<TypographyH3 className="mb-6">Personal Details</TypographyH3>}>
      <div className="w-full space-y-4">
        <Input
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Name"
        />
        <Input
          name="age"
          type="number"
          value={formData.age}
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

export default Personal;