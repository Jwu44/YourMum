import React from 'react';
import UserEnergyLevelLineChart from '../components/UserEnergyLevelLineChart';
import { useNavigate } from 'react-router-dom';
import { Heading, Pane } from 'evergreen-ui';
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
    navigate('/exercise-routine');
  };

  const handlePrevious = () => {
    navigate('/tasks');
  };

  return (
    <Pane display="flex" flexDirection="column" justifyContent="center" alignItems="center">
      <Heading size={700} marginBottom={12} textAlign="center">Plot your energy levels throughout the day</Heading>
      <UserEnergyLevelLineChart onChange={handleEnergyLevelsChange} />
      <OnboardingNav onBack={handlePrevious} onNext={handleNext} />
    </Pane>
  );
};

export default EnergyLevels;
