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
import { submitFormData, extractSchedule } from '@/lib/helper';

const TimeboxPreference: React.FC = () => {
  const { state, dispatch } = useForm();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize layout preference if it doesn't exist
  useEffect(() => {
    if (!state.layout_preference?.timeboxed) {
      dispatch({
        type: 'UPDATE_FIELD',
        field: 'layout_preference',
        value: {
          ...state.layout_preference,
          timeboxed: 'timeboxed'
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
    try {
      // Submit form data and get response
      const result = await submitFormData(state);
      console.log("Submit result:", result); // Debug log
      
      let scheduleContent = extractSchedule(result);
      console.log("Extracted schedule:", scheduleContent); // Debug log
      
      if (!scheduleContent) {
        toast({
          title: "Error",
          description: "No valid schedule found in the response",
          variant: "destructive",
        });
        return;
      }

      if (!result.scheduleId) {
        toast({
          title: "Error",
          description: "No schedule ID received from server",
          variant: "destructive",
        });
        return;
      }

      // Update form context
      await Promise.all([
        dispatch({ 
          type: 'UPDATE_FIELD', 
          field: 'response', 
          value: scheduleContent 
        }),
        dispatch({ 
          type: 'UPDATE_FIELD', 
          field: 'scheduleId', 
          value: result.scheduleId 
        })
      ]);

      // Verify the updates were successful
      console.log("Updated form state:", state); // Debug log

      // Show success message
      toast({
        title: "Success",
        description: "Schedule generated successfully",
      });

      // Add a small delay to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Navigate to dashboard
      router.push('/dashboard');
      
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to generate schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
}, [state, dispatch, toast, router]);

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
        <Button 
          onClick={handleSubmit} 
          disabled={!state.layout_preference?.timeboxed || isLoading}
        >
          {isLoading ? 'Generating Schedule...' : 'Generate Schedule'}
        </Button>
      </div>
    </CenteredPane>
  );
};

export default TimeboxPreference;