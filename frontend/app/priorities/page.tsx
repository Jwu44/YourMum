'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TypographyH3 } from '../fonts/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CenteredPane from '@/components/parts/CenteredPane';
import { Reorder, motion } from 'framer-motion';
import { ActivitySquare, Heart, Smile, Trophy } from 'lucide-react';
import { useForm } from '../../lib/FormContext';

interface Priority {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
}

interface PrioritiesState {
  health: string;
  relationships: string;
  fun_activities: string;
  ambitions: string;
}

const DraggableCard: React.FC<{ item: Priority }> = ({ item }) => (
  <motion.div layout>
    <Card className="mb-4 cursor-move">
      <CardHeader className="flex flex-row items-center space-x-4">
        <item.icon className={`w-6 h-6 ${item.color}`} />
        <CardTitle>{item.name}</CardTitle>
      </CardHeader>
    </Card>
  </motion.div>
);

const PriorityRanking: React.FC = () => {
  const router = useRouter();
  const { state, dispatch } = useForm();

  const [priorities, setPriorities] = useState<Priority[]>(() => {
    const defaultPriorities = [
      { id: 'health', name: 'Health', icon: ActivitySquare, color: 'text-green-500' },
      { id: 'relationships', name: 'Relationships', icon: Heart, color: 'text-red-500' },
      { id: 'fun_activities', name: 'Fun Activities', icon: Smile, color: 'text-blue-500' },
      { id: 'ambitions', name: 'Ambitions', icon: Trophy, color: 'text-yellow-500' },
    ];

    if (state.priorities) {
      return defaultPriorities.sort((a, b) => 
        Number((state.priorities as PrioritiesState)[a.id as keyof PrioritiesState]) - 
        Number((state.priorities as PrioritiesState)[b.id as keyof PrioritiesState])
      );
    }

    return defaultPriorities;
  });

  useEffect(() => {
    const updatedPriorities = priorities.reduce((acc, priority, index) => {
      acc[priority.id] = (index + 1).toString();
      return acc;
    }, {} as Record<string, string>);

    dispatch({ type: 'UPDATE_FIELD', field: 'priorities', value: updatedPriorities });
  }, [priorities, dispatch]);

  const handleReorder = (newPriorities: Priority[]) => {
    setPriorities(newPriorities);
  };

  const handleNext = () => {
    console.log('Form data:', state);
    router.push('/tasks');
  };

  const handlePrevious = () => {
    router.push('/work-times');
  };

  return (
    <CenteredPane heading={<TypographyH3 className="mb-6">What are your priorities outside of work?</TypographyH3>}>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Prioritize Your Values</CardTitle>
          <p className="text-sm text-gray-500">
            Drag to reorder the cards. The topmost card is your highest priority (1), and the bottom is the lowest (4).
          </p>
        </CardHeader>
        <CardContent>
          <Reorder.Group axis="y" values={priorities} onReorder={handleReorder}>
            {priorities.map((item) => (
              <Reorder.Item key={item.id} value={item}>
                <DraggableCard item={item} />
              </Reorder.Item>
            ))}
          </Reorder.Group>
          <div className="w-full flex justify-end space-x-2 mt-6">
            <Button onClick={handlePrevious} variant="ghost">Previous</Button>
            <Button onClick={handleNext}>Next</Button>
          </div>
        </CardContent>
      </Card>
    </CenteredPane>
  );
};

export default PriorityRanking;