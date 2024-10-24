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
  handleEnergyChange 
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
      if (state.response && state.tasks && !isLoading && (shouldUpdateSchedule || isInitialSchedule) && scheduleId) {
        const layoutPreference: LayoutPreference = {
          timeboxed: state.layout_preference?.timeboxed === 'timeboxed' ? 'timeboxed' : 'untimeboxed',
          subcategory: state.layout_preference?.subcategory || '',
          structure: state.layout_preference?.structure === "structured" ? "structured" : 'unstructured'
        };

        try {
          const parsedTasks = await parseScheduleToTasks(state.response, state.tasks, layoutPreference, scheduleId);
          const cleanedTasks = await cleanupTasks(parsedTasks, state.tasks);
          setScheduleDays([cleanedTasks]);
          setCurrentDayIndex(0);
          setShouldUpdateSchedule(false);
          setIsInitialSchedule(false);
        } catch (error) {
          console.error("Error parsing schedule:", error);
          toast({
            title: "Error",
            description: "Failed to parse the schedule. Please try again.",
            variant: "destructive",
          });
        }
      }
    };
    
    updateSchedule();
  }, [isLoading, state.response, state.tasks, shouldUpdateSchedule, isInitialSchedule, scheduleId, toast]);

  const handleScheduleTaskUpdate = useCallback(async (updatedTask: Task) => {
    try {  
      setScheduleDays(prevDays => {
        const newDays = [...prevDays];
        if (newDays[currentDayIndex]) {
          newDays[currentDayIndex] = newDays[currentDayIndex].map(task => 
            task.id === updatedTask.id ? { ...task, ...updatedTask, categories: updatedTask.categories || [] } : task
          );
        }
        return newDays;
      });
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
    const currentSchedule = scheduleDays[currentDayIndex];
    if (!Array.isArray(currentSchedule) || currentSchedule.length === 0) {
      toast({
        title: "Error",
        description: "Invalid or empty schedule data. Please try again.",
        variant: "destructive",
      });
      return;
    }
  
    try {
      const result = await generateNextDaySchedule(
        currentSchedule,
        state,
        scheduleDays.slice(0, currentDayIndex + 1)
      );
      
      if (result.success && result.schedule) {
        setScheduleDays(prevDays => [...prevDays, result.schedule as Task[]]);
        setCurrentDayIndex(prevIndex => prevIndex + 1);
        toast({
          title: "Success",
          description: "Next day's schedule generated successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to generate next day's schedule. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating next day schedule:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  }, [scheduleDays, currentDayIndex, state, toast, generateNextDaySchedule]);

  const handlePreviousDay = useCallback(() => {
    if (currentDayIndex > 0) {
      setCurrentDayIndex(prevIndex => prevIndex - 1);
    }
  }, [currentDayIndex]);

  const handleEnergyChangeCallback = useCallback((value: string) => {
    const currentPatterns = state.energy_patterns || [];
    handleEnergyChange(dispatch, currentPatterns)(value);
  }, [dispatch, state.energy_patterns]);

  const handleDateSelect = useCallback((newDate: Date | undefined) => {
    setDate(newDate);
    setIsDrawerOpen(false);
    // TODO: Fetch the corresponding schedule for the selected date
    // This should be implemented based on your backend API
  }, []);

  return (
    <div className="flex h-screen bg-[hsl(248,18%,4%)]">
      <div className="w-full max-w-4xl mx-auto p-6 overflow-y-auto main-content"> 
        <div className="flex justify-between items-center mb-6">
          <TypographyH3 className="text-white">Generated Schedule</TypographyH3>
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
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {scheduleDays.length > 0 && scheduleDays[currentDayIndex]?.length > 0 ? (
          <div className="rounded-lg shadow-lg px-8 py-6">
            <EditableSchedule
              tasks={scheduleDays[currentDayIndex]}
              onUpdateTask={handleScheduleTaskUpdate}
              onDeleteTask={handleScheduleTaskDelete}
              onReorderTasks={handleReorderTasks}
              layoutPreference={state.layout_preference?.subcategory || ''}
            />
            <div className="w-full flex justify-end space-x-2 mt-6">
              <Button
                onClick={handlePreviousDay}
                disabled={currentDayIndex === 0}
                variant="ghost"
              >
                Previous Day
              </Button>
              <Button 
                onClick={handleNextDay}
              >
                Next Day
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-lg mt-8 text-gray-300">
            {state.response ? 'Processing your schedule...' : 'Update your inputs and click "Update Schedule" to generate a schedule'}
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;