import React from 'react';
import { TextInputField, Button, Pane } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import CenteredPane from '../components/CentredPane';

const Ambitions = ({ formData, setFormData }) => {
  const navigate = useNavigate();

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    const [category, subCategory] = name.split('.');
    setFormData(prevData => ({
      ...prevData,
      [category]: {
        ...prevData[category],
        [subCategory]: value
      }
    }));
  };

  const handleNext = () => {
    navigate('/score-values');
  };

  const handlePrevious = () => {
    navigate('/fun-activities');
  };

  return (
    <CenteredPane>
      <TextInputField
        label="Short Term Ambitions"
        name="ambitions.short_term"
        value={formData.ambitions.short_term}
        onChange={handleInputChange}
        placeholder="What is 1 thing you'd like to achieve by the end of this month?"
      />
      <TextInputField
        label="Long Term Ambitions"
        name="ambitions.long_term"
        value={formData.ambitions.long_term}
        onChange={handleInputChange}
        placeholder="What is 1 thing you'd like to achieve by the end of the year?"
      />
      <Pane display="flex" justifyContent="space-between" marginTop={20}>
        <Button onClick={handlePrevious}>Back</Button>
        <Button onClick={handleNext}>Next</Button>
      </Pane>
    </CenteredPane>
  );
};

export default Ambitions;
