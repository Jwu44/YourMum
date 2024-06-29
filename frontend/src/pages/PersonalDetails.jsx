import React from 'react';
import { TextInputField, Heading } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import { handleSimpleInputChange } from '../helper.jsx';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';

const Personal = ({ formData, setFormData }) => {
  const navigate = useNavigate();

  const handleInputChange = handleSimpleInputChange(setFormData);

  const handleNext = () => {
    navigate('/work-times');
  };

  return (
    <CenteredPane>
      <Heading size={700} marginBottom={24} textAlign="center">Personal Details</Heading>
      <TextInputField
        label="Name"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        placeholder="Enter your name"
      />
      <TextInputField
        label="Age"
        name="age"
        type="number"
        value={formData.age}
        onChange={handleInputChange}
        placeholder="Enter your age"
      />
      <OnboardingNav onNext={handleNext} />
    </CenteredPane>
  );
};

export default Personal;
