import React from 'react';
import { TextInputField, Button, Pane } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import { handleSimpleInputChange } from '../helper.jsx';

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
    <Pane>
      <TextInputField
        label="Fun Activities"
        name="fun_activities"
        value={formData.fun_activities}
        onChange={handleInputChange}
        placeholder="Enter your fun activities (comma separated)"
      />
      <Pane display="flex" justifyContent="space-between" marginTop={20}>
        <Button onClick={handlePrevious}>Back</Button>
        <Button onClick={handleNext}>Next</Button>
      </Pane>
    </Pane>
  );
};

export default FunActivities;
