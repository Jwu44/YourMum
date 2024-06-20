import React from 'react';
import { TextInputField, Button, Pane } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import { handleNestedInputChange } from '../helper.jsx';

const ScoreValues = ({ formData, setFormData }) => {
  const navigate = useNavigate();

  const handleInputChange = handleNestedInputChange(setFormData); 

  const handleNext = () => {
    navigate('/layout-preference');
  };

  const handlePrevious = () => {
    navigate('/ambitions');
  };

  return (
    <Pane>
      <TextInputField
        label="Health"
        name="priorities.health"
        value={formData.priorities.health}
        onChange={handleInputChange}
        placeholder="Rate the importance of Health (1-10)"
      />
      <TextInputField
        label="Relationships"
        name="priorities.relationships"
        value={formData.priorities.relationships}
        onChange={handleInputChange}
        placeholder="Rate the importance of Relationships (1-10)"
      />
      <TextInputField
        label="Fun Activities"
        name="priorities.fun_activities"
        value={formData.priorities.fun_activities}
        onChange={handleInputChange}
        placeholder="Rate the importance of Fun Activities (1-10)"
      />
      <TextInputField
        label="Ambitions"
        name="priorities.ambitions"
        value={formData.priorities.ambitions}
        onChange={handleInputChange}
        placeholder="Rate the importance of Ambitions (1-10)"
      />
      <Pane display="flex" justifyContent="space-between" marginTop={20}>
        <Button onClick={handlePrevious}>Back</Button>
        <Button onClick={handleNext}>Next</Button>
      </Pane>
    </Pane>
  );
};

export default ScoreValues;
