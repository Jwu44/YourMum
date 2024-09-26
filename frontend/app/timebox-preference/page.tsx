'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TypographyH3, TypographyP } from '../fonts/text';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import CenteredPane from '@/components/parts/CenteredPane';
import { useForm } from '../../lib/FormContext';
import { useToast } from "@/hooks/use-toast";
import { submitFormData, extractSchedule, parseScheduleToTasks, cleanupTasks } from '@/lib/helper';
import { Task, LayoutPreference } from '../../lib/types';

const TimeboxPreference: React.FC = () => {
  const { state, dispatch } = useForm();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [scheduleDays, setScheduleDays] = useState<Task[][]>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  useEffect(() => {
    if (!state.layout_preference?.timeboxed) {
      dispatch({
        type: 'UPDATE_FIELD',
        field: 'layout_preference',
        value: {
          ...state.layout_preference,
          timeboxed: 'timeboxed' // Set default value
        }
      });
    }
  }, [state.layout_preference, dispatch]);

  const handleInputChange = (value: string) => {
    dispatch({
      type: 'UPDATE_FIELD',
      field: 'layout_preference',
      value: {
        ...state.layout_preference,
        timeboxed: value
      }
    });
  };

  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    // Navigate to the dashboard page
    router.push('/dashboard');
    try {
      const result = await submitFormData(state);
      let scheduleContent = extractSchedule(result);
      console.log("Extracted schedule content:", scheduleContent);
  
      if (!scheduleContent) {
        toast({
          title: "Error",
          description: "No valid schedule found in the response",
          variant: "destructive",
        });
        return;
      }
  
      dispatch({ type: 'UPDATE_FIELD', field: 'response', value: scheduleContent });
      
      toast({
        title: "Success",
        description: "Schedule updated successfully",
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to update schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [state, dispatch, toast]);
  
  useEffect(() => {
    const updateSchedule = async () => {
      if (state.response && state.tasks) {
        const layoutPreference: LayoutPreference = {
          timeboxed: state.layout_preference?.timeboxed === 'timeboxed' ? 'timeboxed' : 'untimeboxed',
          subcategory: state.layout_preference?.subcategory || ''
        };
  
        const parsedTasks = await parseScheduleToTasks(state.response, state.tasks, layoutPreference);
        const cleanedTasks = await cleanupTasks(parsedTasks, state.tasks);
        setScheduleDays([cleanedTasks]);
        setCurrentDayIndex(0);
      }
    };
    updateSchedule();
  }, [state.response, state.tasks, state.layout_preference]);

  const handlePrevious = () => {
    if (state.layout_preference?.structure === 'structured') {
      router.push('/subcategory-preference');
    } else {
      router.push('/structure-preference');
    }
  };

  return (
    <CenteredPane heading={<TypographyH3 className="mb-6">Task Timeboxing Preference</TypographyH3>}>
      <div className="w-full text-left">
        <TypographyP className="mb-4">
          Would you like your tasks to be timeboxed?
        </TypographyP>
        
        <RadioGroup
          value={state.layout_preference?.timeboxed || ''}
          onValueChange={handleInputChange}
          className="space-y-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem 
              value="timeboxed" 
              id="timeboxed" 
              className="border-white text-white focus:ring-white"
            />
            <Label htmlFor="timeboxed">Yes, I want timeboxed tasks</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem 
              value="untimeboxed" 
              id="untimeboxed" 
              className="border-white text-white focus:ring-white"
            />
            <Label htmlFor="untimeboxed">No, I prefer flexible timing</Label>
          </div>
        </RadioGroup>
      </div>
      
      <div className="w-full flex justify-end space-x-2 mt-6">
        <Button onClick={handlePrevious} variant="ghost">Previous</Button>
        <Button onClick={handleSubmit} disabled={!state.layout_preference?.timeboxed}>Submit</Button>
      </div>
    </CenteredPane>
  );
};

export default TimeboxPreference;