import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Task } from '../../lib/types';
import { Trash2 } from 'lucide-react';

interface EditableScheduleRowProps {
  task: Task;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  isDragging: boolean;
  showIndicator: boolean;
}

const getCategoryColor = (category: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (category) {
    case 'Work': return 'default';
    case 'Fun': return 'secondary';
    case 'Relationships': return 'destructive';
    case 'Ambition': return 'secondary';
    case 'Exercise': return 'outline';
    default: return 'default';
  }
};

const EditableScheduleRow: React.FC<EditableScheduleRowProps> = ({ task, onUpdateTask, onDeleteTask, isDragging, showIndicator }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(task.text);
  const inputRef = useRef<HTMLInputElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setEditedText(task.text);
  }, [task]);

  const handleSave = useCallback(() => {
    if (editedText.trim() !== task.text) {
      onUpdateTask({ ...task, text: editedText.trim(), categories: task.categories || [] });
    }
    setIsEditing(false);
  }, [editedText, onUpdateTask, task]);

  const handleCancel = useCallback(() => {
    setEditedText(task.text);
    setIsEditing(false);
  }, [task.text]);

  const handleToggleComplete = useCallback((checked: boolean) => {
    const updatedTask = { 
      ...task, 
      completed: checked,
      categories: task.categories || []
    };
    console.log('Toggling task with categories:', updatedTask.categories);
    onUpdateTask(updatedTask);
  }, [onUpdateTask, task]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (deleteButtonRef.current && deleteButtonRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    handleSave();
  }, [handleSave]);

  const handleDelete = useCallback(() => {
    onDeleteTask(task.id);
  }, [onDeleteTask, task.id]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div className="relative">
      <div
        className={`flex items-center p-2 my-1 bg-background rounded ${isDragging ? 'opacity-50' : ''}`}
        style={{
          marginLeft: task.is_subtask ? `${(task.level || 1) * 20}px` : 0,
        }}
      >
        {task.is_subtask && (
          <div className="w-4 h-4 mr-2 border-l border-b border-muted" />
        )}
        <Checkbox
          checked={task.completed}
          onCheckedChange={handleToggleComplete}
          className="mr-2"
        />
        {isEditing ? (
          <div className="flex items-center flex-1">
            <Input
              ref={inputRef}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button
              ref={deleteButtonRef}
              variant="destructive"
              size="icon"
              onClick={handleDelete}
              className="ml-2"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center flex-1">
            <span
              onClick={() => setIsEditing(true)}
              className={`flex-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}
            >
              {task.start_time && task.end_time ? `${task.start_time} - ${task.end_time}: ` : ''}
              {task.text}
            </span>
            {!isEditing && task.categories && task.categories.map((category, index) => (
              <Badge
                key={index}
                variant={getCategoryColor(category)}
                className="ml-1"
              >
                {category}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {showIndicator && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
        />
      )}
    </div>
  );
};

export default React.memo(EditableScheduleRow);