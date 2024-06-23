import React from 'react';
import { TextInputField, Button, Pane } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import { handleSimpleInputChange } from '../helper.jsx';
import CenteredPane from '../components/CentredPane';

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
      <TextInputField
        label="Tasks"
        name="tasks"
        value={formData.tasks}
        onChange={handleInputChange}
        placeholder="Enter your tasks for today from most important to least separated by a comma"
      />
      <Pane display="flex" justifyContent="space-between" marginTop={20}>
        <Button onClick={handlePrevious}>Back</Button>
        <Button onClick={handleNext}>Next</Button>
      </Pane>
    </CenteredPane>
  );
};

export default Tasks;
