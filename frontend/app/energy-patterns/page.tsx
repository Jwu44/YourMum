'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TypographyH3, TypographyP } from '../fonts/text';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import CenteredPane from '@/components/parts/CenteredPane';
import { Sun, Sunrise, Sunset, Moon, Flower } from 'lucide-react';
import { useForm } from '../../lib/FormContext';

interface EnergyOption {
  value: string;
  label: string;
  icon: React.ElementType;
}

const EnergyPattern: React.FC = () => {
  const router = useRouter();
  const { state, dispatch } = useForm();

  const energyOptions: EnergyOption[] = [
    { value: 'high_all_day', label: 'Full of energy during the day', icon: Flower },
    { value: 'peak_morning', label: 'Energy peaks in the morning', icon: Sunrise },
    { value: 'peak_afternoon', label: 'Energy peaks in the afternoon', icon: Sun },
    { value: 'peak_evening', label: 'Energy peaks in the evening', icon: Sunset },
    { value: 'low_energy', label: 'Low energy, need help increasing', icon: Moon },
  ];

  useEffect(() => {
    if (!state.energy_patterns) {
      dispatch({ type: 'UPDATE_FIELD', field: 'energy_patterns', value: [] });
    }
  }, [state.energy_patterns, dispatch]);

  const handleEnergyChange = (value: string) => {
    const updatedPatterns = state.energy_patterns.includes(value)
      ? state.energy_patterns.filter((pattern: string) => pattern !== value)
      : [...state.energy_patterns, value];
    dispatch({ type: 'UPDATE_FIELD', field: 'energy_patterns', value: updatedPatterns });
  };

  const handleNext = () => {
    console.log('Form data:', state);
    router.push('/structure-preference');
  };

  const handlePrevious = () => {
    router.push('/tasks');
  };

  return (
    <CenteredPane heading={<TypographyH3 className="mb-2">How's your energy during the day?</TypographyH3>}>
      <TypographyP className="mb-4">
        Understanding your unique energy patterns helps us create a schedule that maximizes your productivity.
      </TypographyP>
      <TypographyP className="mb-4 text-left">
        Select all that apply:
      </TypographyP>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {energyOptions.map((option) => (
          <div
            key={option.value}
            className="bg-secondary p-4 rounded-lg flex flex-col items-center text-center h-full"
          >
            <div className="flex flex-col items-center justify-between h-full">
              <div className="h-20 flex items-center justify-center">
                <option.icon className="w-8 h-8 text-black" />
              </div>
              <p className="text-sm mb-3 leading-tight text-black flex-grow">{option.label}</p>
              <Checkbox
                checked={state.energy_patterns.includes(option.value)}
                onCheckedChange={() => handleEnergyChange(option.value)}
                aria-label={option.label}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="w-full flex justify-end space-x-2 mt-6">
        <Button onClick={handlePrevious} variant="ghost">Previous</Button>
        <Button onClick={handleNext}>Next</Button>
      </div>
    </CenteredPane>
  );
};

export default EnergyPattern;