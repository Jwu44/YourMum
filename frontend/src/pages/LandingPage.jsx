import React from 'react';
import { Pane, Button, Heading } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/personal-details');
  };

  return (
    <Pane display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100vh">
      <Heading size={900} marginBottom={20}>Welcome to the Personalized Scheduler</Heading>
      <Button appearance="primary" size="large" onClick={handleStart}>Start</Button>
    </Pane>
  );
};

export default LandingPage;
