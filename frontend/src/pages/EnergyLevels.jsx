import React from 'react';
import UserEnergyLevelLineChart from '../components/UserEnergyLevelLineChart';
import { useNavigate } from 'react-router-dom';
import { Pane, Heading } from 'evergreen-ui';
import OnboardingNav from '../components/OnboardingNav';

const EnergyLevels = ({ formData, setFormData }) => {
  const navigate = useNavigate();

  const handleEnergyLevelsChange = (energyLevels) => {
    setFormData(prevData => ({
      ...prevData,
      energy_levels: energyLevels
    }));
  };

  const handleNext = () => {
    navigate('/priorties');
  };

  const handlePrevious = () => {
    navigate('/tasks');
  };

  return (
    <Pane display="flex" flexDirection="column" justifyContent="center" height="100vh">
      <Heading size={700} marginBottom={24} textAlign="center">Plot your energy levels throughout the day</Heading>
      <Pane width="100%" height={400} marginBottom={24}>
        <UserEnergyLevelLineChart onChange={handleEnergyLevelsChange} />
      </Pane>
      <OnboardingNav onBack={handlePrevious} onNext={handleNext} />
    </Pane>
  );
};

export default EnergyLevels;
