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

import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';

// Icons
import { Sun, Sunset, Moon, Clock, Target, CheckSquare, Heart, Trophy, Timer, Calendar, GripVertical, Users, Gamepad2, Zap, RotateCcw, TrendingUp, Layout, Grid, List, Layers, Shuffle } from 'lucide-react';

// Components and Hooks
import { SidebarLayout } from '@/components/parts/SidebarLayout';
import { useForm } from '@/lib/FormContext';
import { useToast } from '@/hooks/use-toast';

// Types and Utils
import { LayoutPreference, Priority } from '@/lib/types';

import { generateSchedule, loadSchedule } from '@/lib/ScheduleHelper';
import { formatDateToString } from '@/lib/helper';

// Define energy options with icons
const energyOptions = [
  { 
    value: 'high_all_day', 
    label: 'High-Full of energy during the day', 
    icon: Zap, 
    color: "theme-yellow",
    bgColor: "theme-yellow-bg"
  },
  { 
    value: 'peak_morning', 
    label: 'Energy peaks in the morning', 
    icon: Sun, 
    color: "theme-orange",
    bgColor: "theme-orange-bg"
  },
  { 
    value: 'peak_afternoon', 
    label: 'Energy peaks in the afternoon', 
    icon: Sunset, 
    color: "theme-red",
    bgColor: "theme-red-bg"
  },
  { 
    value: 'peak_evening', 
    label: 'Energy peaks in the evening', 
    icon: Moon, 
    color: "theme-purple",
    bgColor: "theme-purple-bg"
  },
  { 
    value: 'low_energy', 
    label: 'Low energy, need help increasing', 
    icon: RotateCcw, 
    color: "theme-gray",
    bgColor: "theme-gray-bg"
  },
];

// Define task ordering options for card selection
const taskOrderingOptions = [
  { 
    value: 'timebox', 
    label: 'Timeboxed', 
    description: 'Tasks with specific time allocations',
    icon: Clock,
    color: "theme-blue",
    bgColor: "theme-blue-bg"
  },
  { 
    value: 'untimebox', 
    label: 'Untimeboxed', 
    description: 'Tasks without specific times',
    icon: Layers,
    color: "theme-green",
    bgColor: "theme-green-bg"
  },
  { 
    value: 'batching', 
    label: 'Batching', 
    description: 'Tasks grouped by similar activities',
    icon: Layers,
    color: "theme-purple",
    bgColor: "theme-purple-bg"
  },
  { 
    value: 'alternating', 
    label: 'Alternating', 
    description: 'Tasks that alternate between energy levels',
    icon: Shuffle,
    color: "theme-orange",
    bgColor: "theme-orange-bg"
  },
  { 
    value: 'three-three-three', 
    label: '3-3-3', 
    description: '3 hours focus, 3 medium tasks, 3 maintenance tasks',
    icon: Target,
    color: "theme-red",
    bgColor: "theme-red-bg"
  },
];

// Define priority options for draggable cards
const defaultPriorities: Priority[] = [
  { id: 'health', name: 'Health & Exercise', icon: Heart, color: 'theme-red', bgColor: 'theme-red-bg' },
  { id: 'relationships', name: 'Relationships', icon: Users, color: 'theme-blue', bgColor: 'theme-blue-bg' },
  { id: 'fun_activities', name: 'Fun Activities', icon: Gamepad2, color: 'theme-green', bgColor: 'theme-green-bg' },
  { id: 'ambitions', name: 'Ambitions', icon: Trophy, color: 'theme-yellow', bgColor: 'theme-yellow-bg' },
];

// Draggable card component for priorities
const DraggableCard: React.FC<{ item: Priority; index: number }> = ({ item, index }) => {
  return (
    <motion.div layout className="mb-2">
      <div className="draggable-card group">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-2">
            {index + 1}
          </Badge>
          <GripVertical className="draggable-card-grip" />
        </div>
        
        <div className={`p-2 rounded-lg ${item.bgColor}`}>
          <item.icon className={`h-4 w-4 ${item.color}`} />
        </div>
        
        <div className="flex-1">
          <span className="text-sm font-medium">{item.name}</span>
        </div>
      </div>
    </motion.div>
  );
};

// Working days options with the new structure
const workingDays = [
  { id: "monday", label: "Mon", fullLabel: "Monday" },
  { id: "tuesday", label: "Tue", fullLabel: "Tuesday" },
  { id: "wednesday", label: "Wed", fullLabel: "Wednesday" },
  { id: "thursday", label: "Thu", fullLabel: "Thursday" },
  { id: "friday", label: "Fri", fullLabel: "Friday" },
  { id: "saturday", label: "Sat", fullLabel: "Saturday" },
  { id: "sunday", label: "Sun", fullLabel: "Sunday" },
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
        // Filter out section tasks (is_section=true) before updating FormContext
        const nonSectionTasks = scheduleResult.schedule.filter(task => !task.is_section);
        
        // Update FormContext with filtered tasks (excluding sections)
        dispatch({
          type: 'UPDATE_FIELD',
          field: 'tasks',
          value: nonSectionTasks
        });
        
        console.log('Loaded tasks from current schedule:', nonSectionTasks.length, 'out of', scheduleResult.schedule.length, 'total items');
        
        // Load inputs config if available
        if (scheduleResult.inputs) {
          // Update all form fields with the loaded inputs config
          Object.entries(scheduleResult.inputs).forEach(([field, value]) => {
            if (field !== 'tasks') { // Skip tasks as we handle them separately
              dispatch({
                type: 'UPDATE_FIELD',
                field,
                value
              });
            }
          });
        }
      } else {
        // No existing schedule found, keep tasks empty
        console.log('No existing schedule found for date:', targetDate);
        dispatch({
          type: 'UPDATE_FIELD',
          field: 'tasks',
          value: []
        });
        
        // Still try to load inputs config if available (even without schedule)
        if (scheduleResult.inputs) {
          // Update all form fields with the loaded inputs config
          Object.entries(scheduleResult.inputs).forEach(([field, value]) => {
            if (field !== 'tasks') { // Skip tasks as we handle them separately
              dispatch({
                type: 'UPDATE_FIELD',
                field,
                value
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading current schedule tasks:', error);
      // Keep tasks empty on error
      dispatch({
        type: 'UPDATE_FIELD',
        field: 'tasks',
        value: []
      });
      
      // Show error toast for user feedback
      toast({
        title: "Error",
        description: "Failed to load schedule configuration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingTasks(false);
    }
  }, [getTargetDate, dispatch, toast]);

  /**
   * Load current schedule tasks when component mounts
   */
  useEffect(() => {
    loadCurrentScheduleTasks();
  }, [loadCurrentScheduleTasks]);

  /**
   * Sync priorities display order with loaded form data from backend
   * This ensures the UI shows the correct order based on stored rankings
   * 
   * Backend data format: { health: "1", relationships: "2", ambitions: "3", fun_activities: "4" }
   * Frontend needs: Priority[] ordered by rank (1=first, 2=second, etc.)
   * 
   * This effect converts backend rankings to properly ordered display array
   */
  useEffect(() => {
    if (state.priorities && typeof state.priorities === 'object') {
      console.log('Syncing priorities display order with backend data:', state.priorities);
      
      // Create array of [priority, rank] pairs and sort by rank
      const priorityEntries = Object.entries(state.priorities)
        .map(([id, rank]) => ({ id, rank: parseInt(rank as string, 10) }))
        .sort((a, b) => a.rank - b.rank);
      
      // Map sorted priorities to the Priority objects with display data
      const sortedPriorities = priorityEntries
        .map(({ id }) => defaultPriorities.find(p => p.id === id))
        .filter((priority): priority is Priority => priority !== undefined);
      
      // Only update if the order is different
      const currentOrder = priorities.map(p => p.id).join(',');
      const newOrder = sortedPriorities.map(p => p.id).join(',');
      
      if (currentOrder !== newOrder && sortedPriorities.length > 0) {
        console.log('Updating priorities display order:', {
          from: currentOrder,
          to: newOrder,
          backendRankings: state.priorities
        });
        setPriorities(sortedPriorities);
      }
    }
  }, [state.priorities, priorities]);

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
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-4xl mx-auto px-6 pb-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Input Configuration</h1>
            <p className="text-muted-foreground mt-2">
              Add your preferences to personalise your schedule.
            </p>
            {/* Show loading indicator while loading tasks */}
            {isLoadingTasks && (
              <p className="text-sm text-muted-foreground mt-1">
                Loading current schedule tasks...
              </p>
            )}
          </div>

          <div className="grid gap-6">
            {/* 1. Work Schedule Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="icon-container">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span>Work Schedule</span>
                    <Badge variant="secondary" className="ml-2">
                      {(state.working_days || []).length} days
                    </Badge>
                  </div>
                </CardTitle>
                <CardDescription>
                  Set your working hours and days to optimize task scheduling
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Working Hours */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      Work Start Time
                    </label>
                    <Input 
                      type="time" 
                      value={state.work_start_time || "10:30"}
                      onChange={(e) => handleFieldChange('work_start_time', e.target.value)}
                      className="w-full font-mono text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      Work End Time
                    </label>
                    <Input 
                      type="time" 
                      value={state.work_end_time || "15:30"}
                      onChange={(e) => handleFieldChange('work_end_time', e.target.value)}
                      className="w-full font-mono text-center"
                    />
                  </div>
                </div>
                
                {/* Working Days */}
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Working Days
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {workingDays.map((day) => {
                      const isChecked = (state.working_days || []).includes(day.fullLabel);
                      return (
                        <div
                          key={day.id}
                          className={`checkbox-card ${
                            isChecked 
                              ? "checkbox-card-checked" 
                              : "checkbox-card-unchecked"
                          }`}
                        >
                          <Checkbox 
                            id={day.id} 
                            checked={isChecked}
                            onCheckedChange={(checked) => handleWorkingDayChange(day.fullLabel, !!checked)}
                          />
                          <label
                            htmlFor={day.id}
                            className="text-sm font-medium cursor-pointer"
                            title={day.fullLabel}
                          >
                            {day.label}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Priority Settings Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="icon-container">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span>Priority Settings</span>
                    <Badge variant="secondary" className="ml-2">
                      {priorities.length} categories
                    </Badge>
                  </div>
                </CardTitle>
                <CardDescription>
                  Higher priority categories will be scheduled first during optimal energy periods.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Priority Order (Drag to reorder)
                  </label>
                  <div className="space-y-2">
                    <Reorder.Group axis="y" values={priorities} onReorder={handleReorderPriorities}>
                      {priorities.map((item, index) => (
                        <Reorder.Item key={item.id} value={item}>
                          <DraggableCard item={item} index={index} />
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Energy Patterns Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="icon-container">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span>Energy Patterns</span>
                    <Badge variant="secondary" className="ml-2">
                      {(state.energy_patterns || []).length} selected
                    </Badge>
                  </div>
                </CardTitle>
                <CardDescription>
                  Based on your selections, we&apos;ll schedule demanding tasks during your peak energy times.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Select your energy patterns
                  </label>
                  <div className="space-y-2">
                    {energyOptions.map((option) => {
                      const isChecked = (state.energy_patterns || []).includes(option.value);
                      return (
                        <div
                          key={option.value}
                          className={`energy-pattern-card ${
                            isChecked 
                              ? "energy-pattern-card-checked" 
                              : "energy-pattern-card-unchecked"
                          }`}
                        >
                          <Checkbox 
                            id={`checkbox-${option.value}`}
                            checked={isChecked}
                            onCheckedChange={() => handleEnergyChange(option.value)}
                          />
                          <div className={`p-2 rounded-lg ${option.bgColor}`}>
                            <option.icon className={`h-4 w-4 ${option.color}`} />
                          </div>
                          <label
                            htmlFor={`checkbox-${option.value}`}
                            className="text-sm font-medium cursor-pointer flex-1"
                          >
                            {option.label}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 4. Layout Preferences Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="icon-container">
                    <Layout className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span>Layout Preferences</span>
                    <Badge variant="secondary" className="ml-2">
                      {state.layout_preference?.layout?.includes('structured') ? 'Structured' : 'Unstructured'}
                    </Badge>
                  </div>
                </CardTitle>
                <CardDescription>
                  Customize how your tasks and interface are displayed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-3 block">Layout Type</label>
                  <RadioGroup
                    value={state.layout_preference?.layout || 'todolist-structured'}
                    onValueChange={(value) => handleLayoutChange('layout', value)}
                    className="space-y-2"
                  >
                    <div className="radio-card">
                      <RadioGroupItem value="todolist-structured" id="structured" />
                      <Grid className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <label htmlFor="structured" className="text-sm font-medium cursor-pointer">
                          Structured
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Organized with clear categories
                        </p>
                      </div>
                    </div>
                    <div className="radio-card">
                      <RadioGroupItem value="todolist-unstructured" id="unstructured" />
                      <List className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <label htmlFor="unstructured" className="text-sm font-medium cursor-pointer">
                          Unstructured
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Flexible, free-form layout
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Subcategory dropdown - only show if structured is selected */}
                {state.layout_preference?.layout === 'todolist-structured' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Subcategory</label>
                    <Select
                      value={state.layout_preference?.subcategory || 'day-sections'}
                      onValueChange={(value) => handleLayoutChange('subcategory', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day-sections">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Day Sections</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="priority">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            <span>Priority</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="category">
                          <div className="flex items-center gap-2">
                            <Layout className="h-4 w-4" />
                            <span>Category</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 5. Task Ordering Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="icon-container">
                    <CheckSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span>Task Ordering</span>
                  </div>
                </CardTitle>
                <CardDescription>
                  Configure how tasks are sorted and organized in your lists
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Select task ordering pattern
                  </label>
                  <div className="space-y-2">
                    {taskOrderingOptions.map((option) => {
                      const isSelected = state.layout_preference?.orderingPattern === option.value;
                      return (
                        <div
                          key={option.value}
                          className={`task-ordering-card group ${
                            isSelected
                              ? "task-ordering-card-selected"
                              : "task-ordering-card-unselected"
                          }`}
                          onClick={() => handleTaskOrderingChange(option.value)}
                        >
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary-foreground/20' : option.bgColor}`}>
                            <option.icon className={`h-4 w-4 ${isSelected ? 'text-primary-foreground' : option.color}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{option.label}</span>
                              {isSelected}
                            </div>
                            <p className={`text-xs ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                              {option.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
      </div>
    </SidebarLayout>
  );
};

export default InputConfigurationPage;