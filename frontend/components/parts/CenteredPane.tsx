import React, { ReactNode } from 'react';
import { Pane } from 'evergreen-ui';

interface CenteredPaneProps {
  children: ReactNode;
  heading: ReactNode;
}

const CenteredPane: React.FC<CenteredPaneProps> = ({ children, heading }) => {
  return (
    <Pane display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100vh">
      <Pane width="100%" maxWidth={800} padding={16} display="flex" flexDirection="column" alignItems="center">
        {heading}
        {children}
      </Pane>
    </Pane>
  );
};

export default CenteredPane;