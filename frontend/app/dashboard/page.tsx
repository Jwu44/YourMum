'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TypographyH3 } from '../fonts/text';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { ActivitySquare, Heart, Smile, Trophy } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { categorizeTask } from '@/lib/api';
import DashboardLeftCol from '@/components/parts/DashboardLeftCol';
import EditableSchedule from '@/components/parts/EditableSchedule';
import { useForm } from '../../lib/FormContext';
import { Task, Priority, LayoutPreference } from '../../lib/types';

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

  const handleSimpleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    dispatch({ type: 'UPDATE_FIELD', field: name, value });
  }, [dispatch]);

  const handleNestedChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const [category, subCategory] = name.split('.');
    dispatch({
      type: 'UPDATE_NESTED_FIELD',
      field: category,
      subField: subCategory,
      value
    });
  }, [dispatch]);

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
  
      dispatch({ type: 'UPDATE_FIELD', field: 'response', value: scheduleContent });
      
      const layoutPreference: LayoutPreference = {
        timeboxed: state.layout_preference?.timeboxed === 'timeboxed' ? 'timeboxed' : 'untimeboxed',
        subcategory: state.layout_preference?.subcategory || ''
      };
  
      const parsedTasks = await parseScheduleToTasks(scheduleContent, state.tasks || [], layoutPreference);
      const cleanedTasks = await cleanupTasks(parsedTasks, state.tasks || []);
  
      setScheduleDays([cleanedTasks]);
      setCurrentDayIndex(0);
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

  const handleScheduleTaskUpdate = useCallback(async (updatedTask: Task) => {
    if (updatedTask.text !== scheduleDays[currentDayIndex]?.find(task => task.id === updatedTask.id)?.text) {
      const categorizedTask = await categorizeTask(updatedTask.text);
      updatedTask.categories = categorizedTask.categories;
    }
  
    setScheduleDays(prevDays => {
      const newDays = [...prevDays];
      if (newDays[currentDayIndex]) {
        newDays[currentDayIndex] = newDays[currentDayIndex].map(task => 
          task.id === updatedTask.id ? { ...task, ...updatedTask, categories: updatedTask.categories || [] } : task
        );
      }
      return newDays;
    });
  }, [currentDayIndex, scheduleDays]);

  const handleScheduleTaskDelete = useCallback((taskId: string) => {
    setScheduleDays(prevDays => {
      const newDays = [...prevDays];
      if (newDays[currentDayIndex]) {
        newDays[currentDayIndex] = newDays[currentDayIndex].filter(task => task.id !== taskId);
      }
      return newDays;
    });
  }, [currentDayIndex]);
  
  const handleScheduleReorder = useCallback((reorderedItems: Task[]) => {
    setScheduleDays(prevDays => {
      const newDays = [...prevDays];
      if (newDays[currentDayIndex]) {
        newDays[currentDayIndex] = reorderedItems.map((item, index) => ({
          ...item,
          is_section: item.type === 'section',
          section_index: index
        }));
      }
      return newDays;
    });
  }, [currentDayIndex]);

  const handleNextDay = useCallback(async () => {
    const currentSchedule = scheduleDays[currentDayIndex];
    if (!Array.isArray(currentSchedule)) {
      toast({
        title: "Error",
        description: "Invalid schedule data. Please try again.",
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
      
      if (result.success) {
        setScheduleDays(prevDays => [...prevDays, result.schedule as Task[]]);
        setCurrentDayIndex(prevIndex => prevIndex + 1);
    } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating next day schedule:", error);
      toast({
        title: "Error",
        description: "Failed to generate next day's schedule. Please try again.",
        variant: "destructive",
      });
    }
  }, [scheduleDays, currentDayIndex, state, toast]);

  const handlePreviousDay = useCallback(() => {
    if (currentDayIndex > 0) {
      setCurrentDayIndex(prevIndex => prevIndex - 1);
    }
  }, [currentDayIndex]);

  const handleEnergyChangeCallback = useCallback((value: string) => {
    const currentPatterns = state.energy_patterns || [];
    handleEnergyChange(dispatch, currentPatterns)(value);
  }, [dispatch, state.energy_patterns]);

  return (
    <div className="flex h-screen bg-[hsl(248,18%,4%)]">
      <div className="w-full max-w-4xl mx-auto p-6 overflow-y-auto"> 
        <div className="flex justify-between items-center mb-6">
          <TypographyH3 className="text-white">Generated Schedule</TypographyH3>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Edit Inputs</Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0">
              <DashboardLeftCol
                formData={state}
                newTask={newTask}
                setNewTask={setNewTask}
                priorities={priorities}
                handleSimpleChange={handleSimpleChange}
                handleNestedChange={handleNestedChange}
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
        </div>
        {scheduleDays.length > 0 && scheduleDays[currentDayIndex]?.length > 0 ? (
          <div className="rounded-lg shadow-lg px-8 py-6">
            <EditableSchedule
              tasks={scheduleDays[currentDayIndex] || []}
              onUpdateTask={handleScheduleTaskUpdate}
              onDeleteTask={handleScheduleTaskDelete}
              onReorderTasks={handleScheduleReorder}
              layoutPreference={state.layout_preference?.subcategory || ''}
            />
            <div className="flex justify-between mt-6">
              <Button
                onClick={handlePreviousDay}
                disabled={currentDayIndex === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Previous
              </Button>
              <Button 
                onClick={handleNextDay}
                className="bg-blue-600 hover:bg-blue-700 text-white"
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