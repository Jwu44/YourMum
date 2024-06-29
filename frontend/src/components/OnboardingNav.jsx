import React from 'react';
import { Button, Pane } from 'evergreen-ui';

const NavigationButtons = ({ onBack, onNext }) => (
  <Pane display="flex" justifyContent="flex-end">
    <Button 
      onClick={onBack} 
      appearance="minimal" 
      height={32}
      marginRight={16}
    >
      Back
    </Button>
    <Button 
      onClick={onNext} 
      appearance="primary" 
      height={32}
    >
      Next
    </Button>
  </Pane>
);

export default NavigationButtons;