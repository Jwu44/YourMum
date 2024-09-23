import React from 'react';
import { Button } from '../../components/ui/button'

const NavigationButtons = ({ onBack, onNext }) => (
  <div className="flex justify-end">
    <Button 
      onClick={onBack} 
      variant="ghost"
      className="h-8 mr-4"
    >
      Back
    </Button>
    <Button 
      onClick={onNext} 
      variant="default"
      className="h-8"
    >
      Next
    </Button>
  </div>
);

export default NavigationButtons;