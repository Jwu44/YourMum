import React from 'react';
import { RadioGroup, Heading } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';

const LayoutPreference = ({ formData, setFormData, submitForm }) => {
  const navigate = useNavigate();
  
  // Initialize layout_preference if it doesn't exist
  React.useEffect(() => {
    if (!formData.layout_preference) {
      setFormData({
        ...formData,
        layout_preference: {
          timeboxed: 'timeboxed', // Set default value
        }
      });
    }
  }, [formData, setFormData]);

  const handleInputChange = (event) => {
    const value = event.target.value;
    setFormData(prevData => ({
      ...prevData,
      layout_preference: {
        ...prevData.layout_preference,
        timeboxed: value
      }
    }));
  };

  const handleSubmit = () => {
    submitForm();
    navigate('/dashboard');
  };

  const handlePrevious = () => {
    if (formData.layout_preference.structure === 'structured') {
      navigate('/subcategory-preference');
    } else {
      navigate('/structure-preference');
    }
  };

  return (
    <CenteredPane>
      <Heading size={700} marginBottom={24} textAlign="center">Task Timeboxing Preference</Heading>
      
      <RadioGroup
        label="Would you like your tasks to be timeboxed?"
        value={formData.layout_preference.timeboxed || ''}
        options={[
          { label: 'Yes, I want timeboxed tasks', value: 'timeboxed' },
          { label: 'No, I prefer flexible timing', value: 'untimeboxed' }
        ]}
        onChange={handleInputChange}
      />
      
      <OnboardingNav 
        onBack={handlePrevious} 
        onNext={handleSubmit} 
        disableNext={formData.layout_preference.timeboxed === undefined}
      />
    </CenteredPane>
  );
};

export default LayoutPreference;