import React from 'react';
import { Button, Heading } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import CenteredPane from '../components/CentredPane';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/personal-details');
  };

  return (
    <CenteredPane display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100vh">
      <Heading size={900} marginBottom={20}>Welcome to the Personalized Scheduler</Heading>
      <Button appearance="primary" size="large" onClick={handleStart}>Start</Button>
    </CenteredPane>
  );
};

export default LandingPage;
