import React from 'react';
import { TextInputField, Heading } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import { handleNestedInputChange } from '../helper.jsx';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';

const ScoreValues = ({ formData, setFormData }) => {
  const navigate = useNavigate();

  const handleInputChange = handleNestedInputChange(setFormData); 

  const handleNext = () => {
    navigate('/layout-preference');
  };

  const handlePrevious = () => {
    navigate('/energy-levels');
  };

  return (
    <CenteredPane>
      <Heading size={700} marginBottom={24} textAlign="center">If you had 100 points, how would you distribute them?</Heading>
      <TextInputField
        label="Health"
        name="priorities.health"
        value={formData.priorities.health}
        onChange={handleInputChange}
        placeholder="How many points would you give to health?"
      />
      <TextInputField
        label="Relationships"
        name="priorities.relationships"
        value={formData.priorities.relationships}
        onChange={handleInputChange}
        placeholder="How many points would you give to relationships?"
      />
      <TextInputField
        label="Fun Activities"
        name="priorities.fun_activities"
        value={formData.priorities.fun_activities}
        onChange={handleInputChange}
        placeholder="How many points would you give to fun activities?"
      />
      <TextInputField
        label="Ambitions"
        name="priorities.ambitions"
        value={formData.priorities.ambitions}
        onChange={handleInputChange}
        placeholder="How many points would you give to ambitions?"
      />
      <OnboardingNav onBack={handlePrevious} onNext={handleNext} />
    </CenteredPane>
  );
};

export default ScoreValues;
