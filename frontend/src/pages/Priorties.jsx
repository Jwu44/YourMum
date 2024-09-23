import React, { useState, useEffect } from 'react';
import { Heading, Pane, Paragraph } from 'evergreen-ui';
import { useRouter } from 'next/router';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';
import PriosDraggableList from '../components/PriosDraggableList';

const Priorities = ({ setFormData }) => {
  const router = useRouter();
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

    setFormData(prevData => ({
      ...prevData,
      priorities: updatedPriorities
    }));
  }, [priorities, setFormData]);

  const handleReorder = (newPriorities) => {
    setPriorities(newPriorities);
  };

  const handleNext = () => {
    router.push('/tasks');
  };

  const handlePrevious = () => {
    router.push('/work-times');
  };

  return (
    <CenteredPane>
      <Heading size={700} marginBottom={8} textAlign="center">
        What are your priorities outside of work?
      </Heading>
      <Paragraph marginBottom={8} textAlign="center">
        Drag each priority to rank (1 - highest, 4 - lowest)
      </Paragraph>
      <Pane marginBottom={24}>
        <PriosDraggableList items={priorities} onReorder={handleReorder} />
      </Pane>
      <OnboardingNav onBack={handlePrevious} onNext={handleNext} />
    </CenteredPane>
  );
};

export async function getStaticProps() {
  return {
    props: {
      formData: {},
    },
  };
}

export default Priorities;