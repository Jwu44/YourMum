import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Task, RecurrenceType, RECURRENCE_OPTIONS } from '../../lib/types';

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
  const [editedTask, setEditedTask] = useState<Task>({
    ...task,
    is_recurring: task.is_recurring || null,
  });

  // Add a ref to track if we need cleanup
  const needsCleanup = useRef(false);

  // Set up on mount and clean up on unmount
  useEffect(() => {
    // Store original pointer-events value
    const originalPointerEvents = document.body.style.pointerEvents;
    
    if (isOpen) {
      needsCleanup.current = true;
    }

    return () => {
      if (needsCleanup.current) {
        document.body.style.pointerEvents = originalPointerEvents || 'auto';
        needsCleanup.current = false;
      }
    };
  }, [isOpen]);

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

  const handleRecurrenceChange = useCallback((value: string) => {
    // Convert empty string to null, otherwise use the value as RecurrenceType
    const recurrenceValue = value === 'none' ? null : value as RecurrenceType;
    setEditedTask(prev => ({
      ...prev,
      is_recurring: recurrenceValue
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
    try {
      const updatedTask = {
        ...editedTask,
        type: task.type, // Preserve original task type
        is_section: task.is_section, // Preserve section status
        id: task.id, // Ensure ID is preserved
      };
      onUpdateTask(updatedTask);
    } finally {
      onClose();
    }
  }, [editedTask, task, onUpdateTask, onClose]);

  // Handle close with proper cleanup
  const handleClose = useCallback(() => {
    if (needsCleanup.current) {
      document.body.style.pointerEvents = 'auto';
      needsCleanup.current = false;
    }
    onClose();
  }, [onClose]);

  return (
    <Drawer 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      modal={true} // Ensure it's modal
    >
      <DrawerContent
        className="fixed inset-y-0 right-0 h-full w-full bg-[#000000] shadow-lg outline-none "
        onPointerDownOutside={(e) => {
          e.preventDefault();
          handleClose();
        }}
      >
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
            <div>
              <label className="block text-sm font-medium mb-2">
                Recur every...
              </label>
              <Select
                value={editedTask.is_recurring || 'none'}
                onValueChange={handleRecurrenceChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select recurrence" />
                </SelectTrigger>
                <SelectContent className="select-content">
                  {RECURRENCE_OPTIONS.map((option) => (
                    <SelectItem 
                      key={option.value || 'none'} 
                      value={option.value || 'none'} // Use 'none' instead of empty string
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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