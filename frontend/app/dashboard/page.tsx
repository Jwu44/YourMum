'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TypographyH3 } from '../fonts/text';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ActivitySquare, Heart, Smile, Trophy } from 'lucide-react';
import { User, Calendar as CalendarIcon,  CreditCard, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  handleAddTask,
  handleUpdateTask,
  handleDeleteTask,
  parseScheduleToTasks,
  generateNextDaySchedule,
  submitFormData,
  extractSchedule,
  cleanupTasks,
  handleEnergyChange,
  loadScheduleForDate,
  updateScheduleForDate 
} from '@/lib/helper';
import DashboardLeftCol from '@/components/parts/DashboardLeftCol';
import EditableSchedule from '@/components/parts/EditableSchedule';
import { useForm } from '../../lib/FormContext';
import { Task, Priority, LayoutPreference } from '../../lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from '@/components/ui/calendar';
import { format as dateFormat } from 'date-fns';

const initialPriorities: Priority[] = [
    { id: 'health', name: 'Health', icon: ActivitySquare, color: 'green' },
    { id: 'relationships', name: 'Relationships', icon: Heart, color: 'red' },
    { id: 'fun_activities', name: 'Fun Activities', icon: Smile, color: 'blue' },
    { id: 'ambitions', name: 'Ambitions', icon: Trophy, color: 'yellow' }
  ];

const Dashboard: React.FC = () => {
  const [newTask, setNewTask] = useState('');
  const [scheduleDays, setScheduleDays] = useState<Task[][]>([]);
  const [priorities, setPriorities] = useState<Priority[]>(initialPriorities);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { state, dispatch } = useForm();
  const { toast } = useToast();
  const [shouldUpdateSchedule, setShouldUpdateSchedule] = useState(false);
  const [isInitialSchedule, setIsInitialSchedule] = useState(true);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [scheduleCache, setScheduleCache] = useState<Map<string, Task[]>>(new Map());
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  const addTask = useCallback(async () => {
    if (newTask.trim()) {
      try {
        const updatedTasks = await handleAddTask(state.tasks || [], newTask, []);
        dispatch({ type: 'UPDATE_FIELD', field: 'tasks', value: updatedTasks });
        setNewTask('');
        toast({
          title: "Success",
          description: "Task added successfully.",
        });
      } catch (error) {
        console.error("Error adding task:", error);
        toast({
          title: "Error",
          description: "Failed to add task. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [newTask, state.tasks, dispatch, toast]);

  const updateTask = useCallback((updatedTask: Task) => {
    const updatedTasks = handleUpdateTask(state.tasks || [], updatedTask);
    dispatch({ type: 'UPDATE_FIELD', field: 'tasks', value: updatedTasks });
    toast({
      title: "Success",
      description: "Task updated successfully.",
    });
  }, [state.tasks, dispatch, toast]);

  const deleteTask = useCallback((taskId: string) => {
    const updatedTasks = handleDeleteTask(state.tasks || [], taskId);
    dispatch({ type: 'UPDATE_FIELD', field: 'tasks', value: updatedTasks });
    toast({
      title: "Success",
      description: "Task deleted successfully.",
    });
  }, [state.tasks, dispatch, toast]);

  const handleReorder = useCallback((newPriorities: Priority[]) => {
    setPriorities(newPriorities);
    const updatedPriorities = {
      health: '',
      relationships: '',
      fun_activities: '',
      ambitions: ''
    };
    newPriorities.forEach((priority, index) => {
      updatedPriorities[priority.id as keyof typeof updatedPriorities] = (index + 1).toString();
    });
    dispatch({ 
      type: 'UPDATE_FIELD', 
      field: 'priorities', 
      value: updatedPriorities 
    });
  }, [dispatch]);

  // Modify the handleSubmit function
  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
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
      // Store the scheduleId from the result
      setScheduleId(result.scheduleId);

      dispatch({ type: 'UPDATE_FIELD', field: 'response', value: scheduleContent });
      setShouldUpdateSchedule(true);
      setIsInitialSchedule(true); // Set this to true to ensure the schedule is generated

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
      // Only proceed if we have a response and scheduleId, and either it's initial or should update
      if (
        state.response && 
        state.scheduleId && 
        (isInitialSchedule || shouldUpdateSchedule) && 
        !isLoading
      ) {
        // Add this check to prevent duplicate processing
        if (!isInitialSchedule && !shouldUpdateSchedule) {
          return;
        }
  
        setIsLoading(true);
        
        try {
          const layoutPreference: LayoutPreference = {
            timeboxed: state.layout_preference?.timeboxed === 'timeboxed' ? 'timeboxed' : 'untimeboxed',
            subcategory: state.layout_preference?.subcategory || '',
            structure: state.layout_preference?.structure === "structured" ? "structured" : 'unstructured'
          };
  
          const parsedTasks = await parseScheduleToTasks(
            state.response, 
            state.tasks || [], 
            layoutPreference,
            state.scheduleId
          );
          
          if (Array.isArray(parsedTasks) && parsedTasks.length > 0) {
            setScheduleDays([parsedTasks]);
            setCurrentDayIndex(0);
            // Set both flags to false after successful processing
            setShouldUpdateSchedule(false);
            setIsInitialSchedule(false);
          }
  
        } catch (error) {
          console.error("Error updating schedule:", error);
          toast({
            title: "Error",
            description: "Failed to update schedule",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
  
    updateSchedule();
  }, [
    state.response,
    state.scheduleId,
    isInitialSchedule,
    shouldUpdateSchedule,
    isLoading
  ]);
  

  // Helper function to get date string for a specific day offset
  const getDateString = (offset: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toISOString().split('T')[0];
  };

  const handleScheduleTaskUpdate = useCallback(async (updatedTask: Task) => {
    try {
      const currentDate = getDateString(currentDayIndex);
      
      // Update local state
      setScheduleDays(prevDays => {
        const newDays = [...prevDays];
        if (newDays[currentDayIndex]) {
          newDays[currentDayIndex] = newDays[currentDayIndex].map(task => 
            task.id === updatedTask.id ? { ...task, ...updatedTask } : task
          );
        }
        return newDays;
      });
  
      // Update cache
      setScheduleCache(prevCache => {
        const newCache = new Map(prevCache);
        const updatedTasks = prevCache.get(currentDate)?.map(task =>
          task.id === updatedTask.id ? { ...task, ...updatedTask } : task
        ) || [];
        newCache.set(currentDate, updatedTasks);
        return newCache;
      });
  
      // Persist changes to database
      const updateResult = await updateScheduleForDate(currentDate, scheduleDays[currentDayIndex]);
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update schedule');
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
    
    // First check if we have this day's schedule in cache
    if (scheduleCache.has(nextDayDate)) {
      setScheduleDays(prevDays => [...prevDays, scheduleCache.get(nextDayDate)!]);
      setCurrentDayIndex(prevIndex => prevIndex + 1);
      return;
    }

    try {
      // Try to load existing schedule
      const existingSchedule = await loadScheduleForDate(nextDayDate);
      
      if (existingSchedule.success && existingSchedule.schedule) {
        // Use existing schedule
        const nextDaySchedule = existingSchedule.schedule;
        setScheduleDays(prevDays => [...prevDays, nextDaySchedule]);
        setScheduleCache(prevCache => new Map(prevCache).set(nextDayDate, nextDaySchedule));
      } else {
        // Generate new schedule if none exists
        const currentSchedule = scheduleDays[currentDayIndex];
        const result = await generateNextDaySchedule(
          currentSchedule,
          state,
          scheduleDays.slice(0, currentDayIndex + 1)
        );
        
        if (result.success && result.schedule) {
          setScheduleDays(prevDays => [...prevDays, result.schedule!]);
          setScheduleCache(prevCache => new Map(prevCache).set(nextDayDate, result.schedule!));
        } else {
          throw new Error(result.error || 'Failed to generate schedule');
        }
      }
      
      setCurrentDayIndex(prevIndex => prevIndex + 1);
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
  }, [currentDayIndex, scheduleDays, state, toast]);

  const handlePreviousDay = useCallback(() => {
    if (currentDayIndex > 0) {
      setCurrentDayIndex(prevIndex => prevIndex - 1);
    }
  }, [currentDayIndex]);

  const handleEnergyChangeCallback = useCallback((value: string) => {
    const currentPatterns = state.energy_patterns || [];
    handleEnergyChange(dispatch, currentPatterns)(value);
  }, [dispatch, state.energy_patterns]);

  const handleDateSelect = useCallback(async (newDate: Date | undefined) => {
    if (!newDate) {
      setIsDrawerOpen(false);
      return;
    }
  
    setIsLoadingSchedule(true);
    try {
      const dateStr = newDate.toISOString().split('T')[0];
      const existingSchedule = await loadScheduleForDate(dateStr);
      
      if (existingSchedule.success && existingSchedule.schedule) {
        // Update schedule in cache
        setScheduleCache(prevCache => new Map(prevCache).set(dateStr, existingSchedule.schedule!));
        
        // Update scheduleDays array with the new schedule
        setScheduleDays([existingSchedule.schedule]);
        setCurrentDayIndex(0);
        setDate(newDate);
        
        toast({
          title: "Success",
          description: "Schedule loaded successfully",
        });
      } else {
        toast({
          title: "Notice",
          description: "No schedule found for selected date",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error loading schedule:", error);
      toast({
        title: "Error",
        description: "Failed to load schedule",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSchedule(false);
      setIsDrawerOpen(false);
    }
}, [setDate, setIsDrawerOpen, toast]);

  return (
    <div className="flex h-screen bg-[hsl(248,18%,4%)]">
      <div className="w-full max-w-4xl mx-auto p-6 overflow-y-auto main-content"> 
        <div className="flex justify-between items-center mb-6">
        <TypographyH3 className="text-white">
          {(() => {
            // Get the current date based on currentDayIndex
            const currentDate = new Date();
            currentDate.setDate(currentDate.getDate() + currentDayIndex);
            
            // If a specific date is selected from calendar, use that instead
            const displayDate = date || currentDate;
            
            // Format the date as "Monday, January 1"
            return dateFormat(displayDate, 'EEEE, MMMM d');
          })()}
        </TypographyH3>
          <div className="flex items-center space-x-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Edit Inputs</Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0">
                <DashboardLeftCol
                  {...state}
                  newTask={newTask}
                  setNewTask={setNewTask}
                  priorities={priorities}
                  updateTask={updateTask}
                  deleteTask={deleteTask}
                  addTask={addTask}
                  handleReorder={handleReorder}
                  submitForm={handleSubmit}
                  isLoading={isLoading}
                  handleEnergyChange={handleEnergyChangeCallback}
                />
              </SheetContent>
            </Sheet>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-10 w-10 cursor-pointer">
                  <AvatarImage src="/avatar-placeholder.png" alt="User avatar" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-[#1c1c1c] text-white border-gray-700"
                align="end"
                alignOffset={-5}
                sideOffset={5}
              >
                <DropdownMenuLabel className="font-normal">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem className="focus:bg-gray-700">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                  <DrawerTrigger asChild>
                    <DropdownMenuItem
                      className="focus:bg-gray-700"
                      onSelect={(event) => {
                        event.preventDefault();
                        setIsDrawerOpen(true);
                      }}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      <span>Schedules</span>
                    </DropdownMenuItem>
                  </DrawerTrigger>
                  <DrawerContent className="bg-[#1c1c1c] text-white border-t border-gray-700">
                    <div className="flex justify-center items-center min-h-[20vh] py-2">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateSelect}
                        initialFocus
                        className="mx-auto"
                        classNames={{
                          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                          month: "space-y-4",
                          caption: "flex justify-center pt-1 relative items-center",
                          caption_label: "text-sm font-medium",
                          nav: "space-x-1 flex items-center",
                          nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                          nav_button_previous: "absolute left-1",
                          nav_button_next: "absolute right-1",
                          table: "w-full border-collapse space-y-1",
                          head_row: "flex",
                          head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                          row: "flex w-full mt-2",
                          cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                          day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                          day_today: "bg-accent text-accent-foreground",
                          day_outside: "text-muted-foreground opacity-50",
                          day_disabled: "text-muted-foreground opacity-50",
                          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                          day_hidden: "invisible",
                        }}
                        components={{
                          IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
                          IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
                        }}
                      />
                    </div>
                  </DrawerContent>
                </Drawer>
                <DropdownMenuItem className="focus:bg-gray-700">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Subscription</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-gray-700">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem className="focus:bg-gray-700">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
  
        {/* Schedule Display Section */}
        {isLoadingSchedule ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        ) : scheduleDays.length > 0 && scheduleDays[currentDayIndex]?.length > 0 ? (
          <div className="space-y-4">
            <div className="rounded-lg shadow-lg px-8 py-6">
              <EditableSchedule
                tasks={scheduleDays[currentDayIndex]}
                onUpdateTask={handleScheduleTaskUpdate}
                onDeleteTask={handleScheduleTaskDelete}
                onReorderTasks={handleReorderTasks}
                layoutPreference={state.layout_preference?.subcategory || ''}
              />
            </div>
            
            {/* Navigation Controls */}
            <div className="flex justify-between items-center mt-4 px-8">
              <Button
                variant="outline"
                onClick={handlePreviousDay}
                disabled={currentDayIndex === 0}
                className="flex items-center space-x-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous Day</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleNextDay}
                className="flex items-center space-x-2"
              >
                <span>Next Day</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <p className="text-lg text-gray-300">
              {state.response ? 'Processing your schedule...' : 'No schedule found for selected date'}
            </p>
            {!state.response && (
              <Button variant="outline" onClick={handleSubmit} disabled={isLoading}>
                Generate Schedule
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;