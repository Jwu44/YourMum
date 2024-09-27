import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Task } from '../../lib/types';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { X } from 'lucide-react';

interface TaskEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onUpdateTask: (task: Task) => void;
}

const categories = ['Exercise', 'Relationships', 'Fun', 'Ambition', 'Work'];

const TaskEditDrawer: React.FC<TaskEditDrawerProps> = ({
  isOpen,
  onClose,
  task,
  onUpdateTask,
}) => {
  const [editedTask, setEditedTask] = useState<Task>(task);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedTask(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleCategorySelect = useCallback((category: string) => {
    setEditedTask(prev => ({
      ...prev,
      categories: prev.categories?.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...(prev.categories || []), category]
    }));
  }, []);

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'Work': return 'bg-blue-500';
      case 'Fun': return 'bg-yellow-500';
      case 'Relationships': return 'bg-purple-500';
      case 'Ambition': return 'bg-orange-500';
      case 'Exercise': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleSave = useCallback(() => {
    onUpdateTask(editedTask);
    onClose();
  }, [editedTask, onUpdateTask, onClose]);

  return (
    <Drawer open={isOpen} onClose={onClose}>
      <DrawerContent className="drawer-background drawer-content">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Edit Task</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            <div>
              <label htmlFor="text" className="block text-sm font-medium">
                Task Name
              </label>
              <Input
                id="text"
                name="text"
                value={editedTask.text}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Badge
                    key={category}
                    className={`cursor-pointer ${
                      editedTask.categories?.includes(category)
                        ? getCategoryColor(category)
                        : 'bg-gray-200 text-gray-700'
                    }`}
                    onClick={() => handleCategorySelect(category)}
                  >
                    {category}
                    {editedTask.categories?.includes(category) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="start_time" className="block text-sm font-medium">
                Start Time
              </label>
              <Input
                id="start_time"
                name="start_time"
                value={editedTask.start_time || ''}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="end_time" className="block text-sm font-medium">
                End Time
              </label>
              <Input
                id="end_time"
                name="end_time"
                value={editedTask.end_time || ''}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={handleSave}>Save</Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default TaskEditDrawer;