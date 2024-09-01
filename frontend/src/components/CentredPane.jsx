import React from 'react';
import { Pane } from 'evergreen-ui';

const CenteredPane = ({ children }) => {
  return (
    <Pane display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100vh">
      <Pane width="100%" maxWidth={800} padding={16}>
        {children}
      </Pane>
    </Pane>
  );
};

export default CenteredPane;
