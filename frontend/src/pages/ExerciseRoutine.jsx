import React from 'react';
import { TextInputField, Button, Pane } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import { handleSimpleInputChange } from '../helper.jsx';
import CenteredPane from '../components/CentredPane';

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
      <TextInputField
        label="Exercise Routine"
        name="exercise_routine"
        value={formData.exercise_routine}
        onChange={handleInputChange}
        placeholder="Enter your exercise routine"
      />
      <Pane display="flex" justifyContent="space-between" marginTop={20}>
        <Button onClick={handlePrevious}>Back</Button>
        <Button onClick={handleNext}>Next</Button>
      </Pane>
    </CenteredPane>
  );
};

export default ExerciseRoutine;
