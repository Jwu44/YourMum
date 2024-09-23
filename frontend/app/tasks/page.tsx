'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TypographyH3, TypographyP } from '../fonts/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import CenteredPane from '@/components/parts/CenteredPane';
import TaskItem from '@/components/parts/TaskItem';
import { handleAddTask, handleUpdateTask, handleDeleteTask } from '@/lib/helper';

interface Task {
  id: string;
  text: string;
  categories: string[];
}

interface FormData {
  tasks?: Task[];
}

interface TasksProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}

const Tasks: React.FC<TasksProps> = ({ formData = { tasks: [] }, setFormData }) => {
  const router = useRouter();
  const [newTask, setNewTask] = useState('');
  const { toast } = useToast();

  const addTask = async () => {
    if (newTask.trim()) {
      try {
        await handleAddTask(setFormData, newTask, setNewTask, toast);
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
    handleUpdateTask(setFormData, toast)(updatedTask);
  };

  const updateTaskCategories = (taskId: string, newCategories: string[]) => {
    setFormData(prevData => ({
    ...prevData,
    tasks: (prevData.tasks ?? []).map(task => 
        task.id === taskId
        ? { ...task, categories: newCategories }
        : task
    )
    }));
  };

  const deleteTask = (taskId: string) => handleDeleteTask(setFormData, toast)(taskId);

  const handleKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await addTask();
    }
  };

  const handleNext = () => {
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
      {(formData.tasks || []).map((task) => (
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