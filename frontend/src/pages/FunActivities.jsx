import React from 'react';
import { TextInputField, Heading } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import { handleSimpleInputChange } from '../helper.jsx';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';

const FunActivities = ({ formData, setFormData }) => {
  const navigate = useNavigate();

  const handleInputChange = handleSimpleInputChange(setFormData);

  const handleNext = () => {
    navigate('/ambitions');
  };

  const handlePrevious = () => {
    navigate('/relationships');
  };

  return (
    <CenteredPane>
      <Heading size={700} marginBottom={12} textAlign="center">Fun Activities</Heading>
      <TextInputField
        name="fun_activities"
        value={formData.fun_activities}
        onChange={handleInputChange}
        placeholder="What are some hobbies you have today? (comma separated)"
      />
      <OnboardingNav onBack={handlePrevious} onNext={handleNext} />
    </CenteredPane>
  );
};

export default FunActivities;
