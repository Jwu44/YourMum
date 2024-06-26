import React from 'react';
import { TextInputField, Heading } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import { handleSimpleInputChange } from '../helper.jsx';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';

const Tasks = ({ formData, setFormData }) => {
  const navigate = useNavigate();

  const handleInputChange = handleSimpleInputChange(setFormData);

  const handleNext = () => {
    navigate('/energy-levels');
  };

  const handlePrevious = () => {
    navigate('/work-times');
  };

  return (
    <CenteredPane>
      <Heading size={700} marginBottom={12} textAlign="center">Tasks</Heading>
      <TextInputField
        name="tasks"
        value={formData.tasks}
        onChange={handleInputChange}
        placeholder="Enter your tasks for today from most important to least separated by a comma"
      />
      <OnboardingNav onBack={handlePrevious} onNext={handleNext} />
    </CenteredPane>
  );
};

export default Tasks;
