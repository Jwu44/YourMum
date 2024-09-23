import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem } from '@/components/ui/command';
import { Check, X } from 'lucide-react';

interface Task {
  id: string;
  text: string;
  categories: string[];
}

interface TaskItemProps {
  task: Task;
  onUpdate: (task: Task) => void;
  onDelete: (id: string) => void;
}

const categories = ['Exercise', 'Relationships', 'Fun', 'Ambition', 'Work'];

const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task.text);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(task.categories || []);

  const handleUpdate = useCallback(() => {
    if (editedTask.trim() !== task.text || selectedCategories !== task.categories) {
      onUpdate({ ...task, text: editedTask.trim(), categories: selectedCategories });
    }
    setIsEditing(false);
  }, [editedTask, selectedCategories, task, onUpdate]);

  const handleCategorySelect = useCallback((category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  const handleCategoriesConfirm = useCallback(() => {
    onUpdate({ ...task, categories: selectedCategories });
  }, [task, selectedCategories, onUpdate]);

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

  return (
    <div className="flex items-center my-2">
      {isEditing ? (
        <Input
          value={editedTask}
          onChange={(e) => setEditedTask(e.target.value)}
          onBlur={handleUpdate}
          onKeyPress={(e) => e.key === 'Enter' && handleUpdate()}
          className="flex-grow"
        />
      ) : (
        <div className="flex-grow cursor-pointer" onClick={() => setIsEditing(true)}>
          {task.text}
        </div>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <div className="flex cursor-pointer ml-2">
            {selectedCategories.map((category, index) => (
              <Badge key={index} className={`mr-1 mb-1 ${getCategoryColor(category)}`}>
                {category}
              </Badge>
            ))}
            <Badge variant="outline" className="mr-1 mb-1">
              {selectedCategories.length > 0 ? '+' : 'Add Category'}
            </Badge>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <Command>
            <CommandGroup>
              {categories.map((cat) => (
                <CommandItem
                  key={cat}
                  onSelect={() => handleCategorySelect(cat)}
                  className="flex justify-between items-center"
                >
                  {cat}
                  {selectedCategories.includes(cat) && <Check className="h-4 w-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
          <Button onClick={handleCategoriesConfirm} className="w-full mt-2">
            Confirm
          </Button>
        </PopoverContent>
      </Popover>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(task.id)}
        className="ml-2"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default React.memo(TaskItem);