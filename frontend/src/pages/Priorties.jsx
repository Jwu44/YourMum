import React, { useState, useEffect } from 'react';
import { Heading, Pane } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';
import PriosDraggableList from '../components/PriosDraggableList';

const ScoreValues = ({ formData, setFormData }) => {
  const navigate = useNavigate();
  const [priorities, setPriorities] = useState([
    { id: 'health', name: 'Health' },
    { id: 'relationships', name: 'Relationships' },
    { id: 'fun_activities', name: 'Fun Activities' },
    { id: 'ambitions', name: 'Ambitions' }
  ]);

  useEffect(() => {
    const updatedPriorities = priorities.reduce((acc, priority, index) => {
      acc[priority.id] = index + 1; // Assign values 1, 2, 3, 4 based on position (top to bottom)
      return acc;
    }, {});

    console.log('Updated priorities ranking:', updatedPriorities);

    setFormData(prevData => {
      const newData = {
        ...prevData,
        priorities: updatedPriorities
      };
      return newData;
    });
  }, [priorities, setFormData]);

  const handleReorder = (newPriorities) => {
    setPriorities(newPriorities);
    console.log('Priorities after reorder:', newPriorities);
  };

  const handleNext = () => {
    console.log('Final priorities before navigation:', formData.priorities);
    navigate('/layout-preference');
  };

  const handlePrevious = () => {
    navigate('/energy-levels');
  };

  return (
    <CenteredPane>
      <Heading size={700} marginBottom={24} textAlign="center">
        Rank your priorities (1 - highest, 4 - lowest)
      </Heading>
      <Pane marginBottom={24}>
        <PriosDraggableList items={priorities} onReorder={handleReorder} />
      </Pane>
      <OnboardingNav onBack={handlePrevious} onNext={handleNext} />
    </CenteredPane>
  );
};

export default ScoreValues;