import React from 'react';
import { SelectField, Heading } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';

const SubcategoryPreference = ({ formData, setFormData }) => {
  const navigate = useNavigate();

  const handleNext = () => {
    navigate('/layout-preference');
  };

  const handlePrevious = () => {
    navigate('/structure-preference');
  };

  const handleInputChange = (event) => {
    const value = event.target.value;
    setFormData(prevData => ({
      ...prevData,
      layout_preference: {
        ...prevData.layout_preference,
        subcategory: value
      }
    }));
  };

  return (
    <CenteredPane>
      <Heading size={700} marginBottom={24} textAlign="center">Choose Your Structured Layout</Heading>
      
      <SelectField
        label="Structured Layout Type"
        value={formData.layout_preference.subcategory || ''}
        onChange={handleInputChange}
      >
        <option value="">Select a layout type</option>
        <option value="day-sections">Day Sections (Morning, Afternoon, Evening)</option>
        <option value="priority">Priority (High, Medium, Low)</option>
        <option value="category">Category Based (Work, Fun, Relationships, Ambition, Exercise)</option>
      </SelectField>
      
      <OnboardingNav 
        onBack={handlePrevious} 
        onNext={handleNext}
        disableNext={!formData.layout_preference.subcategory}
      />
    </CenteredPane>
  );
};

export default SubcategoryPreference;