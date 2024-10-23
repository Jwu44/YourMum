import React, { useState, useCallback, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

// Add this new type for recurrence options
type RecurrenceOption = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

const TaskEditDrawer: React.FC<TaskEditDrawerProps> = ({
  isOpen,
  onClose,
  task,
  onUpdateTask,
}) => {
  const [editedTask, setEditedTask] = useState<Task>(task);
  const [customRecurrence, setCustomRecurrence] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

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
  // New function to handle recurrence selection
  const handleRecurrenceChange = (value: RecurrenceOption) => {
    setEditedTask(prev => ({
      ...prev,
      is_recurring: value !== 'none' ? value : null,
      // Reset custom recurrence if not 'custom'
      custom_recurrence: value === 'custom' ? customRecurrence : null
    }));
  };

  // New function to handle custom recurrence input
  const handleCustomRecurrenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomRecurrence(value);
    setEditedTask(prev => ({
      ...prev,
      custom_recurrence: value
    }));
  };

  // Reset state when task prop changes
  useEffect(() => {
    setEditedTask({...task});
    setCustomRecurrence(task.custom_recurrence || '');
  }, [task]);

  const handleSave = useCallback(async () => {
    if (editedTask.is_recurring === 'custom' && !customRecurrence.trim()) {
      alert('Please enter a custom recurrence pattern');
      return;
    }
  
    setIsUpdating(true);
    try {
      const updatedTask: Task = {
        ...task,
        ...editedTask,
        categories: editedTask.categories || [],
        custom_recurrence: editedTask.is_recurring === 'custom' ? customRecurrence : null,
        // Preserve task structure
        is_section: task.is_section,
        type: task.type,
        section: task.section,
        section_index: task.section_index,
        level: task.level,
        is_subtask: task.is_subtask,
        parent_id: task.parent_id,
      };
  
      await onUpdateTask(updatedTask);
      
      // Add small delay before closing to ensure state updates are processed
      setTimeout(() => {
        onClose();
        setIsUpdating(false);
      }, 100);
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task. Please try again.');
      setIsUpdating(false);
    }
  }, [editedTask, customRecurrence, task, onUpdateTask, onClose]);

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
              {/* New recurrence selection field */}
              <div>
                <label htmlFor="recurrence" className="block text-sm font-medium">
                  Repeat every...
                </label>
                <Select
                  onValueChange={handleRecurrenceChange}
                  value={editedTask.is_recurring || 'none'}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select recurrence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Doesn't repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Custom recurrence input field */}
              {editedTask.is_recurring === 'custom' && (
                <div>
                  <label htmlFor="custom_recurrence" className="block text-sm font-medium">
                    Custom Recurrence Pattern
                  </label>
                  <Input
                    id="custom_recurrence"
                    name="custom_recurrence"
                    value={customRecurrence}
                    onChange={handleCustomRecurrenceChange}
                    placeholder="e.g., Every 2 weeks on Monday"
                    className="mt-1"
                  />
                </div>
              )}
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
          <Button onClick={handleSave} disabled={isUpdating} variant="outline">
            {isUpdating ? 'Saving...' : 'Save'}
          </Button>
        </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default TaskEditDrawer;