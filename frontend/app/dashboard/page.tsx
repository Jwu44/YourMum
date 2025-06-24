'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

// UI Components
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import FloatingActionButton from '@/components/parts/FloatingActionButton';
import TaskEditDrawer from '@/components/parts/TaskEditDrawer';

// Layout Components
import { SidebarLayout } from '@/components/parts/SidebarLayout';
import DashboardHeader from '@/components/parts/DashboardHeader';
import EditableSchedule from '@/components/parts/EditableSchedule';

// Hooks and Context
import { useToast } from "@/hooks/use-toast";
import { useForm } from '../../lib/FormContext';

// Types
import { 
  Task, 
  AISuggestion, 
  GetAISuggestionsResponse
} from '../../lib/types';

// Helpers
import {
  handleAddTask,
  // handleUpdateTask,
  // handleDeleteTask,
  fetchAISuggestions,
  formatDateToString,
} from '@/lib/helper';

// Direct API helpers (no ScheduleHelper)
import { calendarApi } from '@/lib/api/calendar';
import { generateSchedule, loadSchedule, updateSchedule } from '@/lib/ScheduleHelper';

const Dashboard: React.FC = () => {
  const [scheduleDays, setScheduleDays] = useState<Task[][]>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { state, dispatch } = useForm();
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [scheduleCache, setScheduleCache] = useState<Map<string, Task[]>>(new Map());
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [shownSuggestionIds] = useState<Set<string>>(new Set());
  const [suggestionsMap, setSuggestionsMap] = useState<Map<string, AISuggestion[]>>(new Map());
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() + currentDayIndex);
    console.log('Setting currentDate:', date);
    setCurrentDate(date);
  }, [currentDayIndex]);

  const addTask = useCallback(async (newTask: Task) => {
    try {
      const currentDate = getDateString(currentDayIndex);
      const currentSchedule = scheduleDays[currentDayIndex] || [];
      
      const taskWithId = {
        ...newTask,
        id: uuidv4(),
        start_date: currentDate,
      };

      const updatedSchedule = [...currentSchedule, taskWithId];
      
      // Use updateSchedule which implements upsert behavior:
      // - First tries PUT (update existing schedule)
      // - If 404 (no schedule exists), automatically calls POST (create new)
      const updateResult = await updateSchedule(currentDate, updatedSchedule);
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to add task');
      }

      // Update UI state with confirmed backend data
      setScheduleDays(prevDays => {
        const newDays = [...prevDays];
        newDays[currentDayIndex] = updateResult.schedule || updatedSchedule;
        return newDays;
      });

      setScheduleCache(prevCache => 
        new Map(prevCache).set(currentDate, updateResult.schedule || updatedSchedule)
      );

      toast({
        title: "Success",
        description: "Task added successfully.",
      });

    } catch (error) {
      console.error('Error adding task:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add task. Please try again.",
        variant: "destructive",
      });
    }
  }, [currentDayIndex, scheduleDays, toast]);

  // const updateTask = useCallback((updatedTask: Task) => {
  //   const updatedTasks = handleUpdateTask(state.tasks || [], updatedTask);
  //   dispatch({ type: 'UPDATE_FIELD', field: 'tasks', value: updatedTasks });
  //   toast({
  //     title: "Success",
  //     description: "Task updated successfully.",
  //   });
  // }, [state.tasks, dispatch, toast]);

  // const deleteTask = useCallback((taskId: string) => {
  //   const updatedTasks = handleDeleteTask(state.tasks || [], taskId);
  //   dispatch({ type: 'UPDATE_FIELD', field: 'tasks', value: updatedTasks });
  //   toast({
  //     title: "Success",
  //     description: "Task deleted successfully.",
  //   });
  // }, [state.tasks, dispatch, toast]);

  // Optimized handleSubmit - direct API call, no ScheduleHelper processing
  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    try {
      const orderingPattern = state.layout_preference?.orderingPattern || 'timebox';
        
      const enhancedPreference = {
        layout: state.layout_preference?.layout || 'todolist-structured',
        subcategory: state.layout_preference?.subcategory || 'day-sections',
        orderingPattern
      };
      
      const formData = {
        ...state,
        tasks: state.tasks || [],
        layout_preference: enhancedPreference,
        work_start_time: state.work_start_time || '09:00',
        work_end_time: state.work_end_time || '17:00',
        priorities: state.priorities || {
          health: "",
          relationships: "",
          fun_activities: "",
          ambitions: ""
        },
        energy_patterns: state.energy_patterns || []
      };
            
      // Direct API call - no ScheduleHelper processing
      const schedule = await generateSchedule(formData);
      
      if (!schedule || !schedule.tasks || schedule.tasks.length === 0) {
        toast({
          title: "Error",
          description: "No valid schedule was generated",
          variant: "destructive",
        });
        return;
      }
      
      // Direct usage - tasks are already perfectly structured by optimized backend
      setScheduleDays([schedule.tasks]);
      setCurrentDayIndex(0);

      const currentDate = getDateString(0);
      await updateSchedule(currentDate, schedule.tasks);
      
      setScheduleCache(prevCache => new Map(prevCache).set(currentDate, schedule.tasks));

      toast({
        title: "Success",
        description: "Schedule generated successfully",
      });
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast({
        title: "Error",
        description: "Failed to generate schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [state, toast, currentDayIndex]);  

  const getDateString = (offset: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return formatDateToString(date);
  };

  const handleScheduleTaskUpdate = useCallback(async (updatedTask: Task) => {
    try {
      const currentDate = getDateString(currentDayIndex);
      
      setScheduleDays(prevDays => {
        const newDays = [...prevDays];
        if (newDays[currentDayIndex]) {
          const currentTasks = newDays[currentDayIndex];
          const taskIndex = currentTasks.findIndex(t => t.id === updatedTask.id);
          
          if (taskIndex !== -1) {
            newDays[currentDayIndex] = currentTasks.map(task => 
              task.id === updatedTask.id ? { ...task, ...updatedTask } : task
            );
          } else {
            const parentIndex = currentTasks.findIndex(t => t.id === updatedTask.parent_id);
            if (parentIndex !== -1) {
              const insertIndex = parentIndex + 1 + currentTasks
                .slice(0, parentIndex + 1)
                .filter(t => t.parent_id === updatedTask.parent_id).length;
              
              const newTasks = [...currentTasks];
              newTasks.splice(insertIndex, 0, updatedTask);
              newDays[currentDayIndex] = newTasks;
            }
          }
        }
        return newDays;
      });
  
      setScheduleCache(prevCache => {
        const newCache = new Map(prevCache);
        const currentTasks = prevCache.get(currentDate) || [];
        const taskIndex = currentTasks.findIndex(t => t.id === updatedTask.id);
        
        if (taskIndex !== -1) {
          const updatedTasks = currentTasks.map(task =>
            task.id === updatedTask.id ? { ...task, ...updatedTask } : task
          );
          newCache.set(currentDate, updatedTasks);
        } else {
          const parentIndex = currentTasks.findIndex(t => t.id === updatedTask.parent_id);
          if (parentIndex !== -1) {
            const insertIndex = parentIndex + 1 + currentTasks
              .slice(0, parentIndex + 1)
              .filter(t => t.parent_id === updatedTask.parent_id).length;
            
            const newTasks = [...currentTasks];
            newTasks.splice(insertIndex, 0, updatedTask);
            newCache.set(currentDate, newTasks);
          }
        }
        return newCache;
      });
  
      const updateResult = await updateSchedule(
        currentDate, 
        scheduleDays[currentDayIndex]
      );
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update schedule');
      }
  
      if (!scheduleDays[currentDayIndex].find(t => t.id === updatedTask.id)) {
        toast({
          title: "Success",
          description: "Microstep added to schedule",
        });
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  }, [currentDayIndex, scheduleDays, toast]);

  const handleScheduleTaskDelete = useCallback((taskId: string) => {
    setScheduleDays(prevDays => {
      const newDays = [...prevDays];
      if (newDays[currentDayIndex]) {
        newDays[currentDayIndex] = newDays[currentDayIndex].filter(task => task.id !== taskId);
      }
      return newDays;
    });
  }, [currentDayIndex]);
  
  const handleReorderTasks = useCallback((reorderedTasks: Task[]) => {
    setScheduleDays(prevDays => {
      const newDays = [...prevDays];
      newDays[currentDayIndex] = reorderedTasks;
      return newDays;
    });
  }, [currentDayIndex]);

  const handleNextDay = useCallback(async () => {
    const nextDayDate = getDateString(currentDayIndex + 1);
    console.log('Next day date:', nextDayDate);
    
    if (scheduleCache.has(nextDayDate)) {
      setScheduleDays(prevDays => [...prevDays, scheduleCache.get(nextDayDate)!]);
      setCurrentDayIndex(prevIndex => prevIndex + 1);
      return;
    }
  
    try {
      const existingSchedule = await loadSchedule(nextDayDate);
      
      if (existingSchedule.success && existingSchedule.schedule) {
        const nextDaySchedule = existingSchedule.schedule;
        setScheduleDays(prevDays => [...prevDays, nextDaySchedule]);
        setScheduleCache(prevCache => new Map(prevCache).set(nextDayDate, nextDaySchedule));
      } else {
        const currentSchedule = scheduleDays[currentDayIndex];
        const recurringTasks = currentSchedule.filter(task => task.is_recurring);
        
        const orderingPattern = state.layout_preference?.orderingPattern || 'timebox';
          
        const enhancedPreference = {
          layout: state.layout_preference?.layout || 'todolist-structured',
          subcategory: state.layout_preference?.subcategory || 'day-sections',
          orderingPattern
        };
        
        const formData = {
          ...state,
          tasks: [...state.tasks || [], ...recurringTasks],
          layout_preference: enhancedPreference,
          work_start_time: state.work_start_time || '09:00',
          work_end_time: state.work_end_time || '17:00',
          priorities: state.priorities || {
            health: "",
            relationships: "",
            fun_activities: "",
            ambitions: ""
          },
          energy_patterns: state.energy_patterns || []
        };
        
        // Direct API call for next day
        const result = await generateSchedule(formData);
        
        if (result.tasks && result.tasks.length > 0) {
          const tasksWithDate = result.tasks.map(task => ({
            ...task,
            start_date: nextDayDate
          }));
          
          setScheduleDays(prevDays => [...prevDays, tasksWithDate]);
          setScheduleCache(prevCache => new Map(prevCache).set(nextDayDate, tasksWithDate));
          
          await updateSchedule(nextDayDate, tasksWithDate);
        } else {
          throw new Error('Failed to generate next day schedule');
        }
      }
      
      setCurrentDayIndex(prevIndex => prevIndex + 1);
      setDate(new Date(nextDayDate));
      
      toast({
        title: "Success",
        description: "Next day's schedule loaded successfully.",
      });
    } catch (error) {
      console.error("Error handling next day:", error);
      toast({
        title: "Error",
        description: "Failed to load next day's schedule. Please try again.",
        variant: "destructive",
      });
    }
  }, [currentDayIndex, scheduleDays, state, toast, scheduleCache]);

  const handlePreviousDay = useCallback(() => {
    if (currentDayIndex > 0) {
      const prevDate = new Date(date!);
      prevDate.setDate(prevDate.getDate() - 1);
      
      setCurrentDayIndex(prevIndex => prevIndex - 1);
      setDate(prevDate);
    }
  }, [currentDayIndex, date]);

  const handleRequestSuggestions = useCallback(async () => {
    setIsLoadingSuggestions(true);
    
    try {
      const currentDate = getDateString(currentDayIndex);
      
      const response: GetAISuggestionsResponse = await fetchAISuggestions(
        state.name,
        currentDate,
        scheduleDays[currentDayIndex] || [],
        scheduleDays.slice(Math.max(0, currentDayIndex - 14), currentDayIndex),
        state.priorities || {},
        state.energy_patterns || []
      );

      const newSuggestions = response.suggestions.filter(
        suggestion => !shownSuggestionIds.has(suggestion.id)
      );

      newSuggestions.forEach(suggestion => {
        shownSuggestionIds.add(suggestion.id);
      });

      setSuggestions(newSuggestions);

    } catch (error) {
      console.error('Error requesting suggestions:', error);
      toast({
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : "Failed to get AI suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [
    currentDayIndex,
    scheduleDays,
    state.name,
    state.priorities,
    state.energy_patterns,
    shownSuggestionIds,
    toast
  ]);

  const findRelevantTaskForSuggestion = useCallback((
    suggestion: AISuggestion, 
    schedule: Task[]
  ): string => {
    const categoryMatch = schedule.find(task => 
      task.categories?.some(category => 
        suggestion.categories.includes(category)
      )
    );
    if (categoryMatch) return categoryMatch.id;

    switch (suggestion.type) {
      case 'Energy Optimization':
        return schedule[0]?.id || 'schedule-start';
      case 'Priority Rebalancing':
        const priorityTask = schedule.find(task => 
          task.categories?.includes('high-priority')
        );
        return priorityTask?.id || 'schedule-start';
      default:
        return 'schedule-start';
    }
  }, []);

  useEffect(() => {
    if (!suggestions.length) return;

    const currentSchedule = scheduleDays[currentDayIndex];
    if (!currentSchedule) return;

    const newSuggestionsMap = new Map<string, AISuggestion[]>();
    
    suggestions.forEach(suggestion => {
      const relevantTaskId = findRelevantTaskForSuggestion(suggestion, currentSchedule);
      
      if (!newSuggestionsMap.has(relevantTaskId)) {
        newSuggestionsMap.set(relevantTaskId, []);
      }
      newSuggestionsMap.get(relevantTaskId)!.push(suggestion);
    });

    setSuggestionsMap(newSuggestionsMap);
  }, [suggestions, currentDayIndex, scheduleDays, findRelevantTaskForSuggestion]);

  const findTargetIndexForSuggestion = useCallback((
    suggestion: AISuggestion, 
    schedule: Task[]
  ): number => {
    const categoryMatchIndex = schedule.findIndex(task => 
      task.categories?.some(category => 
        suggestion.categories.includes(category)
      )
    );
    
    if (categoryMatchIndex !== -1) {
      return categoryMatchIndex + 1;
    }

    switch (suggestion.type) {
      case 'Energy Optimization':
        return 0;
      case 'Priority Rebalancing':
        const priorityIndex = schedule.findIndex(task => 
          task.categories?.includes('high-priority')
        );
        return priorityIndex !== -1 ? priorityIndex : 0;
      case 'Time Management':
        return Math.floor(schedule.length / 2);
      case 'Task Structure':
        const structureIndex = schedule.findIndex(task => 
          task.text.toLowerCase().includes(suggestion.text.toLowerCase())
        );
        return structureIndex !== -1 ? structureIndex + 1 : schedule.length;
      default:
        return schedule.length;
    }
  }, []);

  const handleAcceptSuggestion = useCallback(async (suggestion: AISuggestion) => {
    try {
      const newTask: Task = {
        id: uuidv4(),
        text: suggestion.text,
        categories: suggestion.categories,
        is_subtask: false,
        completed: false,
        is_section: false,
        section: null,
        parent_id: null,
        level: 0,
        section_index: 0,
        type: 'task',
        start_time: null,
        end_time: null,
        is_recurring: null,
        start_date: getDateString(currentDayIndex),
      };

      const updatedSchedule = [...scheduleDays[currentDayIndex]];
      const targetIndex = findTargetIndexForSuggestion(suggestion, updatedSchedule);
      
      if (targetIndex > 0) {
        const prevTask = updatedSchedule[targetIndex - 1];
        newTask.section = prevTask.section;
      }
      
      updatedSchedule.splice(targetIndex, 0, newTask);
      
      let sectionStartIndex = 0;
      updatedSchedule.forEach((task, index) => {
        if (task.is_section) {
          sectionStartIndex = index;
        }
        if (!task.is_section) {
          task.section_index = index - sectionStartIndex;
        }
      });

      setScheduleDays(prev => {
        const newDays = [...prev];
        newDays[currentDayIndex] = updatedSchedule;
        return newDays;
      });

      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      setSuggestionsMap(prev => {
        const newMap = new Map(prev);
        Array.from(newMap.entries()).forEach(([taskId, suggestions]) => {
          newMap.set(
            taskId, 
            suggestions.filter(s => s.id !== suggestion.id)
          );
        });
        return newMap;
      });

      await updateSchedule(
        getDateString(currentDayIndex),
        updatedSchedule
      );

      toast({
        title: "Success",
        description: "Suggestion added to schedule",
      });

    } catch (error) {
      console.error('Error accepting suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to add suggestion to schedule",
        variant: "destructive",
      });
    }
  }, [currentDayIndex, scheduleDays, toast, findTargetIndexForSuggestion]);

  const handleRejectSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    setSuggestionsMap(prev => {
      const newMap = new Map(prev);
      Array.from(newMap.entries()).forEach(([taskId, suggestions]) => {
        newMap.set(
          taskId, 
          suggestions.filter(s => s.id !== suggestionId)
        );
      });
      return newMap;
    });
  }, []);

  useEffect(() => {
    const loadInitialSchedule = async () => {
      setIsLoadingSchedule(true);
      
      try {
        const today = getDateString(0);
        
        // Step 1: Try to fetch calendar events first
        const calendarResponse = await calendarApi.fetchEvents(today);
  
        if (calendarResponse.success && calendarResponse.tasks.length > 0) {
          setScheduleDays([calendarResponse.tasks]);
          setScheduleCache(new Map([[today, calendarResponse.tasks]]));
          return;
        }
        
        // Step 2: Try to load existing schedule
        const existingSchedule = await loadSchedule(today);
        
        if (existingSchedule.success && existingSchedule.schedule) {
          setScheduleDays([existingSchedule.schedule]);
          setScheduleCache(new Map([[today, existingSchedule.schedule]]));
          return;
        }
        
        // Step 3: Show empty state UI (no database writes)
        console.log("No calendar events or existing schedule found, showing empty state");
        setScheduleDays([[]]);
        
      } catch (error) {
        console.error("Error loading initial schedule:", error);
        // Fallback to empty state
        setScheduleDays([[]]);
        
        toast({
          title: "Notice",
          description: "Could not load schedule. You can start adding tasks manually.",
        });
      } finally {
        setIsLoadingSchedule(false);
      }
    };
    
    if (!state.formUpdate?.response) {
      loadInitialSchedule();
    }
  }, [toast]);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  return (
    <SidebarLayout>
      <div className="flex flex-col h-full bg-background">
        
        <DashboardHeader
          isLoadingSuggestions={isLoadingSuggestions}
          onRequestSuggestions={handleRequestSuggestions}
          onNextDay={handleNextDay}
          onPreviousDay={handlePreviousDay}
          currentDate={currentDate}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-4xl mx-auto p-6">
            
            {isLoadingSchedule ? (
              <div className="loading-container-lg">
                <div className="loading-spinner-lg" />
              </div>
            ) : scheduleDays.length > 0 && scheduleDays[currentDayIndex]?.length > 0 ? (
              <div className="space-y-4">
                <EditableSchedule
                  tasks={scheduleDays[currentDayIndex] || []}
                  onUpdateTask={handleScheduleTaskUpdate}
                  onDeleteTask={handleScheduleTaskDelete}
                  onReorderTasks={handleReorderTasks}
                  layoutPreference={state.layout_preference?.layout || 'todolist-unstructured'}
                  onRequestSuggestions={handleRequestSuggestions}
                  isLoadingSuggestions={isLoadingSuggestions}
                  suggestionsMap={suggestionsMap}
                  onAcceptSuggestion={handleAcceptSuggestion}
                  onRejectSuggestion={handleRejectSuggestion}
                />

                {isLoadingSuggestions && (
                  <div className="loading-container-sm">
                    <Loader2 className="loading-spinner-sm" />
                    <span className="loading-text">
                      Generating suggestions...
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state-container">
                <p className="text-lg text-foreground">
                  {state.response 
                    ? 'Processing your schedule...' 
                    : 'No schedule found for selected date'
                  }
                </p>
                {!state.response && (
                  <Button 
                    variant="outline" 
                    onClick={handleSubmit} 
                    disabled={isLoading}
                  >
                    Generate Schedule
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <FloatingActionButton onClick={() => setIsTaskDrawerOpen(true)} />
        
        <TaskEditDrawer
          isOpen={isTaskDrawerOpen}
          onClose={() => setIsTaskDrawerOpen(false)}
          onCreateTask={addTask}
          currentDate={getDateString(currentDayIndex)}
        />
      </div>
    </SidebarLayout>
  );
};

export default Dashboard;