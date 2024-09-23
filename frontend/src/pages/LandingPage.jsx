import React from 'react';
import { Pane, Button, Heading } from 'evergreen-ui';
import { useRouter } from 'next/router';

const LandingPage = () => {
  const router = useRouter();

  const handleStart = () => {
    router.push('/personal-details');
  };

  return (
    <Pane display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100vh">
      <Heading size={900} marginBottom={20}>What will today look like?</Heading>
      <Button appearance="primary" size="large" onClick={handleStart}>Start</Button>
    </Pane>
  );
};

export default LandingPage;
