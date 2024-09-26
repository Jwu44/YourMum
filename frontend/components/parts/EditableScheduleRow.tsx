import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { Task } from '../../lib/types';
import { isBrowser } from '../../lib/utils';

interface EditableScheduleRowProps {
  task: Task;
  index: number;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  moveTask: (dragIndex: number, hoverIndex: number) => void;
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

const EditableScheduleRow: React.FC<EditableScheduleRowProps> = ({ 
  task, 
  index,
  onUpdateTask, 
  onDeleteTask,
  moveTask
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(task.text);
  const inputRef = useRef<HTMLInputElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

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

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (isBrowser() && e.dataTransfer) {
      e.dataTransfer.setData('text/plain', index.toString());
      e.dataTransfer.effectAllowed = 'move';
      if (rowRef.current) {
        rowRef.current.style.opacity = '0.5';
      }
    }
  }, [index]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isBrowser() && e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (rowRef.current) {
      rowRef.current.style.borderTop = '2px solid #3366FF';
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (rowRef.current) {
      rowRef.current.style.borderTop = '';
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isBrowser() && e.dataTransfer) {
      const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      moveTask(dragIndex, index);
      if (rowRef.current) {
        rowRef.current.style.borderTop = '';
        rowRef.current.style.opacity = '1';
      }
    }
  }, [index, moveTask]);

  const handleDragEnd = useCallback(() => {
    if (rowRef.current) {
      rowRef.current.style.opacity = '1';
    }
  }, []);

  return (
    <motion.div
      ref={rowRef}
      draggable={isBrowser()}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="relative flex items-center p-2 my-1 bg-background rounded cursor-move"
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
        className="mr-2 border-white"
      />
      <div className="flex items-center flex-1">
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className={`flex-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}
          >
            {task.start_time && task.end_time ? `${task.start_time} - ${task.end_time}: ` : ''}
            {task.text}
          </span>
        )}
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
      <Button
        ref={deleteButtonRef}
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        className="ml-2 hover:bg-red-700"
      >
        <Trash2 className="h-4 w-4 text-white" />
      </Button>
    </motion.div>
  );
};

export default React.memo(EditableScheduleRow);