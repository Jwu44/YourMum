import React from 'react';
import { TextInputField, Heading } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import { handleSimpleInputChange } from '../helper.jsx';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';

const ExerciseRoutine = ({ formData, setFormData }) => {
  const navigate = useNavigate();

  const handleInputChange = handleSimpleInputChange(setFormData);

  const handleNext = () => {
    navigate('/relationships');
  };

  const handlePrevious = () => {
    navigate('/energy-levels');
  };

  return (
    <CenteredPane>
      <Heading size={700} marginBottom={12} textAlign="center">Exercise Routine</Heading>
      <TextInputField
        name="exercise_routine"
        value={formData.exercise_routine}
        onChange={handleInputChange}
        placeholder="Any plans on exercising today?"
      />
      <OnboardingNav onBack={handlePrevious} onNext={handleNext} />
    </CenteredPane>
  );
};

export default ExerciseRoutine;
