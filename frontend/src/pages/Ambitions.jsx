import React from 'react';
import { TextInputField, Heading } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';

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
      <Heading size={700} marginBottom={24} textAlign="center">Ambitions</Heading>
      <TextInputField
        label="Short Term Ambitions"
        name="ambitions.short_term"
        value={formData.ambitions.short_term}
        onChange={handleInputChange}
        placeholder="What is 1 thing you'd like to achieve by the end of this month?"
        width="100%"
      />
      <TextInputField
        label="Long Term Ambitions"
        name="ambitions.long_term"
        value={formData.ambitions.long_term}
        onChange={handleInputChange}
        placeholder="What is 1 thing you'd like to achieve by the end of this year?"
        width="100%"
      />
      <OnboardingNav onBack={handlePrevious} onNext={handleNext} />
    </CenteredPane>
  );
};

export default Ambitions;