import React from 'react';
import { Pane, Heading, Paragraph } from 'evergreen-ui';

const Dashboard = ({ response }) => {
  return (
    <Pane display="flex" flexDirection="column" justifyContent="center" alignItems="center">
      {response ? (
        <Pane>
          <Heading size={600}>Generated Schedule</Heading>
          <Paragraph>{response}</Paragraph>
        </Pane>
      ) : (
        <Heading size={600}>Loading...</Heading>
      )}
    </Pane>
  );
};

export default Dashboard;
