import React from 'react';
import { TextInputField, Heading } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import { handleSimpleInputChange } from '../helper.jsx';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';

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
    <CenteredPane>
      <Heading size={700} marginBottom={24} textAlign="center">Work Times</Heading>
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
      <OnboardingNav onBack={handlePrevious} onNext={handleNext} />
    </CenteredPane>
  );
};

export default WorkTimes;
