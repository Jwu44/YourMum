/**
 * @file InputConfigurationPage.tsx
 * @description Input Configuration page for customizing workflow settings and preferences
 */

"use client"

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Reorder, motion } from 'framer-motion';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Icons
import { Sun, Sunrise, Sunset, Moon, Flower, Clock, Target, CheckSquare, LayoutGrid, Heart, Smile, Trophy, ActivitySquare } from 'lucide-react';

// Components and Hooks
import { SidebarLayout } from '@/components/parts/SidebarLayout';
import { useForm } from '@/lib/FormContext';
import { useToast } from '@/hooks/use-toast';

// Types and Utils
import { LayoutPreference, Priority } from '@/lib/types';
import { cn } from '@/lib/utils';
import { generateSchedule, loadSchedule } from '@/lib/ScheduleHelper';
import { formatDateToString } from '@/lib/helper';

// Define energy options with icons
const energyOptions = [
  { value: 'high_all_day', label: 'High-Full of energy during the day', icon: Flower },
  { value: 'peak_morning', label: 'Energy peaks in the morning', icon: Sunrise },
  { value: 'peak_afternoon', label: 'Energy peaks in the afternoon', icon: Sun },
  { value: 'peak_evening', label: 'Energy peaks in the evening', icon: Sunset },
  { value: 'low_energy', label: 'Low energy, need help increasing', icon: Moon },
];

// Define task ordering options for card selection
const taskOrderingOptions = [
  { value: 'timebox', label: 'Timeboxed', description: 'Tasks with specific time allocations' },
  { value: 'untimebox', label: 'Untimeboxed', description: 'Tasks without specific times' },
  { value: 'batching', label: 'Batching', description: 'Tasks grouped by similar activities' },
  { value: 'alternating', label: 'Alternating', description: 'Tasks that alternate between energy levels' },
  { value: 'three-three-three', label: '3-3-3', description: '3 hours focus, 3 medium tasks, 3 maintenance tasks' },
];

// Define priority options for draggable cards
const defaultPriorities: Priority[] = [
  { id: 'health', name: 'Health & Exercise', icon: ActivitySquare, color: 'text-green-500' },
  { id: 'relationships', name: 'Relationships', icon: Heart, color: 'text-red-500' },
  { id: 'fun_activities', name: 'Fun Activities', icon: Smile, color: 'text-blue-500' },
  { id: 'ambitions', name: 'Ambitions', icon: Trophy, color: 'text-yellow-500' },
];

// Draggable card component for priorities
const DraggableCard: React.FC<{ item: Priority }> = ({ item }) => {
  return (
    <motion.div layout className="mb-2.5">
      <Card className="cursor-move">
        <CardHeader className="flex flex-row items-center space-x-4 py-3">
          <item.icon className={cn("w-4 h-4", item.color)} />
          <p className="text-sm font-medium">{item.name}</p>
        </CardHeader>
      </Card>
    </motion.div>
  );
};

// Working days options
const workingDays = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

/**
 * Input Configuration Page Component
 */
const InputConfigurationPage: React.FC = () => {
  const { state, dispatch } = useForm();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [priorities, setPriorities] = useState(defaultPriorities);

  /**
   * Get the target date from URL parameter or fallback to today
   * @returns date string in YYYY-MM-DD format
   */
  const getTargetDate = useCallback((): string => {
    const dateParam = searchParams.get('date');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return dateParam;
    }
    // Fallback to today's date
    return formatDateToString(new Date());
  }, [searchParams]);

  /**
   * Load current schedule tasks for the target date
   * This ensures tasks are included in the payload when saving
   */
  const loadCurrentScheduleTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    try {
      const targetDate = getTargetDate();
      console.log('Loading schedule tasks for date:', targetDate);
      
      const scheduleResult = await loadSchedule(targetDate);
      
      if (scheduleResult.success && scheduleResult.schedule) {
        // Update FormContext with loaded tasks
        dispatch({
          type: 'UPDATE_FIELD',
          field: 'tasks',
          value: scheduleResult.schedule
        });
        
        console.log('Loaded tasks from current schedule:', scheduleResult.schedule.length);
      } else {
        // No existing schedule found, keep tasks empty
        console.log('No existing schedule found for date:', targetDate);
        dispatch({
          type: 'UPDATE_FIELD',
          field: 'tasks',
          value: []
        });
      }
    } catch (error) {
      console.error('Error loading current schedule tasks:', error);
      // Keep tasks empty on error
      dispatch({
        type: 'UPDATE_FIELD',
        field: 'tasks',
        value: []
      });
    } finally {
      setIsLoadingTasks(false);
    }
  }, [getTargetDate, dispatch]);

  /**
   * Load current schedule tasks when component mounts
   */
  useEffect(() => {
    loadCurrentScheduleTasks();
  }, [loadCurrentScheduleTasks]);

  // Handle simple field changes
  const handleFieldChange = useCallback((field: string, value: any) => {
    dispatch({ type: 'UPDATE_FIELD', field, value });
  }, [dispatch]);

  // Handle working days checkbox changes
  const handleWorkingDayChange = useCallback((day: string, checked: boolean) => {
    const currentDays = state.working_days || [];
    const updatedDays = checked 
      ? [...currentDays, day]
      : currentDays.filter(d => d !== day);
    
    handleFieldChange('working_days', updatedDays);
  }, [state.working_days, handleFieldChange]);

  // Handle energy pattern selection
  const handleEnergyChange = useCallback((value: string) => {
    const currentPatterns = state.energy_patterns || [];
    const updatedPatterns = currentPatterns.includes(value)
      ? currentPatterns.filter(pattern => pattern !== value)
      : [...currentPatterns, value];
    
    handleFieldChange('energy_patterns', updatedPatterns);
  }, [state.energy_patterns, handleFieldChange]);

  // Handle layout preference changes
  const handleLayoutChange = useCallback((field: keyof LayoutPreference, value: string) => {
    const updatedPreference = {
      ...state.layout_preference,
      [field]: value
    };
    
    // Clear subcategory if switching to unstructured
    if (field === 'layout' && value.includes('unstructured')) {
      updatedPreference.subcategory = '';
    }
    
    handleFieldChange('layout_preference', updatedPreference);
  }, [state.layout_preference, handleFieldChange]);

  // Handle task ordering selection
  const handleTaskOrderingChange = useCallback((value: string) => {
    handleLayoutChange('orderingPattern', value);
  }, [handleLayoutChange]);

  // Handle priority reordering
  const handleReorderPriorities = useCallback((newPriorities: Priority[]) => {
    setPriorities(newPriorities);
    
    // Store the priority ranking in form context
    // Convert to a ranked number list where index 0 = rank 1 (highest priority)
    const rankedPriorities = newPriorities.reduce((acc, priority, index) => {
      return {
        ...acc,
        [priority.id]: String(index + 1) // Convert to string to match existing structure
      };
    }, {});
    
    handleFieldChange('priorities', rankedPriorities);
  }, [handleFieldChange]);

  // Handle save and generate schedule
  const handleSave = useCallback(async () => {
    setIsLoading(true);
    try {
      const targetDate = getTargetDate();
      
      // Prepare payload with current date and loaded tasks
      const payload = {
        ...state,
        date: targetDate, // Include target date in payload
        tasks: state.tasks || [] // Include loaded tasks from current schedule
      };
      
      console.log("Generating schedule with payload:", payload);

      // Generate schedule with updated preferences and existing tasks
      await generateSchedule(payload);
      
      toast({
        title: "Success",
        description: "Configuration saved and schedule updated successfully",
      });
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [state, toast, router, getTargetDate]);

  return (
    <SidebarLayout>
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Input Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Customize your workflow settings and preferences to optimize your task management experience
          </p>
          {/* Show loading indicator while loading tasks */}
          {isLoadingTasks && (
            <p className="text-sm text-muted-foreground mt-1">
              Loading current schedule tasks...
            </p>
          )}
          {/* Show confirmation when tasks are loaded */}
          {!isLoadingTasks && state.tasks && state.tasks.length > 0 && (
            <p className="text-sm text-green-600 mt-1">
              ✓ Loaded {state.tasks.length} tasks from current schedule
            </p>
          )}
        </div>

        <div className="grid gap-6">
          {/* 1. Work Schedule Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <CardTitle>Work Schedule</CardTitle>
              </div>
              <CardDescription>
                Set your working hours and days to optimize task scheduling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="work_start_time">Work Start Time</Label>
                  <Input
                    id="work_start_time"
                    type="time"
                    value={state.work_start_time}
                    onChange={(e) => handleFieldChange('work_start_time', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="work_end_time">Work End Time</Label>
                  <Input
                    id="work_end_time"
                    type="time"
                    value={state.work_end_time}
                    onChange={(e) => handleFieldChange('work_end_time', e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-base font-medium">Working Days</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {workingDays.map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={day}
                        checked={(state.working_days || []).includes(day)}
                        onCheckedChange={(checked) => handleWorkingDayChange(day, !!checked)}
                      />
                      <Label htmlFor={day} className="text-sm">{day}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Priority Settings Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                <CardTitle>Priority Settings</CardTitle>
              </div>
              <CardDescription>
                Configure how task priorities are handled and displayed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Label className="text-base font-medium">Priority Order (Drag to reorder)</Label>
              <div className="mt-4">
                <Reorder.Group axis="y" values={priorities} onReorder={handleReorderPriorities}>
                  {priorities.map((item) => (
                    <Reorder.Item key={item.id} value={item}>
                      <DraggableCard item={item} />
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>
            </CardContent>
          </Card>

          {/* 3. Energy Patterns Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sun className="h-5 w-5" />
                <CardTitle>Energy Patterns</CardTitle>
              </div>
              <CardDescription>
                Define your energy levels throughout the day for optimal task scheduling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Label className="text-base font-medium">Select your energy patterns</Label>
              <div className="grid grid-cols-1 gap-[10px] mt-4">
                {energyOptions.map((option) => (
                  <Card
                    key={option.value}
                    className={cn(
                      "cursor-pointer transition-colors",
                      (state.energy_patterns || []).includes(option.value)
                        ? "ring-2 ring-primary bg-accent"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <CardHeader className="flex flex-row items-center space-x-4 py-3">
                      <div className="flex items-center">
                        <Checkbox
                          id={`checkbox-${option.value}`}
                          checked={(state.energy_patterns || []).includes(option.value)}
                          onCheckedChange={() => handleEnergyChange(option.value)}
                          className="mr-3"
                        />
                      </div>
                      <option.icon className="w-5 h-5" />
                      <p className="text-sm font-medium">{option.label}</p>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 4. Layout Preferences Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                <CardTitle>Layout Preferences</CardTitle>
              </div>
              <CardDescription>
                Customize how your tasks and interface are displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-base font-medium">Layout Type</Label>
                <RadioGroup
                  value={state.layout_preference?.layout || 'todolist-structured'}
                  onValueChange={(value) => handleLayoutChange('layout', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="todolist-structured" id="structured" />
                    <Label htmlFor="structured">Structured</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="todolist-unstructured" id="unstructured" />
                    <Label htmlFor="unstructured">Unstructured</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Subcategory dropdown - only show if structured is selected */}
              {state.layout_preference?.layout === 'todolist-structured' && (
                <div>
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Select
                    value={state.layout_preference?.subcategory || ''}
                    onValueChange={(value) => handleLayoutChange('subcategory', value)}
                  >
                    <SelectTrigger id="subcategory">
                      <SelectValue placeholder="Select a layout type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day-sections">Day Sections</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. Task Ordering Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                <CardTitle>Task Ordering</CardTitle>
              </div>
              <CardDescription>
                Configure how tasks are sorted and organized in your lists
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Label className="text-base font-medium">Select task ordering pattern</Label>
              <div className="grid grid-cols-1 gap-3 mt-4">
                {taskOrderingOptions.map((option) => (
                  <Card
                    key={option.value}
                    className={cn(
                      "cursor-pointer transition-colors",
                      state.layout_preference?.orderingPattern === option.value
                        ? "ring-2 ring-primary bg-accent"
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => handleTaskOrderingChange(option.value)}
                  >
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-medium">{option.label}</CardTitle>
                      <CardDescription className="text-xs">{option.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={isLoading || isLoadingTasks}
              size="lg"
            >
              {isLoading ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
};

export default InputConfigurationPage;