import React from 'react';
import { TextInputField, Button, Pane } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import { handleSimpleInputChange } from '../helper.jsx';
import CenteredPane from '../components/CentredPane';

const Personal = ({ formData, setFormData }) => {
  const navigate = useNavigate();

  const handleInputChange = handleSimpleInputChange(setFormData);

  const handleNext = () => {
    navigate('/work-times');
  };

  return (
    <CenteredPane>
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
    </CenteredPane>
  );
};

export default Personal;
