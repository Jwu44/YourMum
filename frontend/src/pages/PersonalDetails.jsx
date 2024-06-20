import React from 'react';
import { TextInputField, Button, Pane } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import { handleSimpleInputChange } from '../helper.jsx';

const Personal = ({ formData, setFormData }) => {
  const navigate = useNavigate();

  const handleInputChange = handleSimpleInputChange(setFormData);

  const handleNext = () => {
    navigate('/work-times');
  };

  return (
    <Pane>
      <TextInputField
        label="Name"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        placeholder="Enter your name"
      />
      <TextInputField
        label="Age"
        name="age"
        type="number"
        value={formData.age}
        onChange={handleInputChange}
        placeholder="Enter your age"
      />
      <Pane display="flex" justifyContent="flex-end" marginTop={20}>
        <Button onClick={handleNext}>Next</Button>
      </Pane>
    </Pane>
  );
};

export default Personal;
