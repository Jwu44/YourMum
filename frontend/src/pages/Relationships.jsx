import React from 'react';
import { TextInputField, Heading } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import { handleSimpleInputChange } from '../helper.jsx';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';

const Relationships = ({ formData, setFormData }) => {
  const navigate = useNavigate();

  const handleInputChange = handleSimpleInputChange(setFormData);

  const handleNext = () => {
    navigate('/fun-activities');
  };

  const handlePrevious = () => {
    navigate('/exercise-routine');
  };

  return (
    <CenteredPane>
      <Heading size={700} marginBottom={12} textAlign="center">Relationships</Heading>
      <TextInputField
        name="relationships"
        value={formData.relationships}
        onChange={handleInputChange}
        placeholder="Enter how you manage relationships"
      />
      <OnboardingNav onBack={handlePrevious} onNext={handleNext} />
    </CenteredPane>
  );
};

export default Relationships;
