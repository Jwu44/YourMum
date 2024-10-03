'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TypographyH3, TypographyP } from '../fonts/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import CenteredPane from '@/components/parts/CenteredPane';
import TaskItem from '@/components/parts/TaskItem';
import { handleAddTask, handleUpdateTask, handleDeleteTask } from '@/lib/helper';
import { useForm } from '../../lib/FormContext';
import { Task } from '../../lib/types';

const Tasks: React.FC = () => {
  const router = useRouter();
  const [newTask, setNewTask] = useState('');
  const { toast } = useToast();
  const { state, dispatch } = useForm();

  // Ensure tasks is always an array
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];

  useEffect(() => {
    if (!Array.isArray(state.tasks)) {
      dispatch({ type: 'UPDATE_FIELD', field: 'tasks', value: [] });
    }
  }, [state.tasks, dispatch]);

  const addTask = async () => {
    if (newTask.trim()) {
      try {
        const updatedTasks = await handleAddTask(state.tasks, newTask, []);
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
  };

  const updateTask = (updatedTask: Task) => {
    const updatedTasks = handleUpdateTask(state.tasks, updatedTask);
    dispatch({ type: 'UPDATE_FIELD', field: 'tasks', value: updatedTasks });
    toast({
      title: "Success",
      description: "Task updated successfully.",
    });
  };

  const deleteTask = (taskId: string) => {
    const updatedTasks = handleDeleteTask(state.tasks, taskId);
    dispatch({ type: 'UPDATE_FIELD', field: 'tasks', value: updatedTasks });
    toast({
      title: "Success",
      description: "Task deleted successfully.",
    });
  };

  const handleKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await addTask();
    }
  };

  const handleNext = () => {
    console.log('Form data:', state);
    router.push('/energy-patterns');
  };

  const handlePrevious = () => {
    router.push('/priorities');
  };

  return (
    <CenteredPane heading={<TypographyH3 className="mb-2">What tasks do you have today?</TypographyH3>}>
      <TypographyP className="mb-4">
        There are 5 categories of task: Exercise, Relationships, Fun, Ambition and Work. You can assign multiple categories to each task.
      </TypographyP>
      <div className="space-y-2 w-full">
        {tasks.map((task: Task) => (
          <TaskItem
            key={task.id}
            task={task}
            onUpdate={updateTask}
            onDelete={deleteTask}
          />
        ))}
        <div className="flex items-center w-full">
          <Input
            placeholder="+ New task"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={addTask}
            className="w-full"
          />
        </div>
      </div>
      <div className="w-full flex justify-end space-x-2 mt-6">
        <Button onClick={handlePrevious} variant="ghost">Previous</Button>
        <Button onClick={handleNext}>Next</Button>
      </div>
    </CenteredPane>
  );
};

export default Tasks;