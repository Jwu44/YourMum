import React from 'react';
import { TextInputField, Button, Pane } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import { handleSimpleInputChange } from '../helper.jsx';

const WorkTimes = ({ formData, setFormData }) => {
  const navigate = useNavigate();

  const handleInputChange = handleSimpleInputChange(setFormData);

  const handleNext = () => {
    navigate('/tasks');
  };

  const handlePrevious = () => {
    navigate('/personal-details');
  };

  return (
    <Pane>
      <TextInputField
        label="Work Start Time"
        name="work_start_time"
        value={formData.work_start_time}
        onChange={handleInputChange}
        placeholder="Enter your work start time (e.g., 9:00am)"
      />
      <TextInputField
        label="Work End Time"
        name="work_end_time"
        value={formData.work_end_time}
        onChange={handleInputChange}
        placeholder="Enter your work end time (e.g., 5:00pm)"
      />
      <Pane display="flex" justifyContent="space-between" marginTop={20}>
        <Button onClick={handlePrevious}>Back</Button>
        <Button onClick={handleNext}>Next</Button>
      </Pane>
    </Pane>
  );
};

export default WorkTimes;
