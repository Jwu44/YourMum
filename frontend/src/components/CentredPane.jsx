import React from 'react';
import { Pane } from 'evergreen-ui';

const CenteredPane = ({ children }) => {
  return (
    <Pane display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100vh">
      {children}
    </Pane>
  );
};

export default CenteredPane;
