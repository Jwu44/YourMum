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
  moveTask: (dragIndex: number, hoverIndex: number, shouldIndent: boolean) => void;
  isSection: boolean;
  children?: React.ReactNode;
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
  moveTask,
  isSection,
  children
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(task.text);
  const inputRef = useRef<HTMLInputElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [isDragTarget, setIsDragTarget] = useState(false);
  const [dragType, setDragType] = useState<'above' | 'below' | 'indent' | null>(null);

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
    
    if (isSection) {
      setDragType('below');
      setIsDragTarget(true);
    } else {
      const rect = rowRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseY = e.clientY - rect.top;
        const threshold = rect.height / 3;

        if (mouseY < threshold) {
          setDragType('above');
        } else if (mouseY > rect.height - threshold) {
          setDragType('below');
        } else {
          setDragType('indent');
        }
        setIsDragTarget(true);
      }
    }
  }, [isSection]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragTarget(false);
    setDragType(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isBrowser() && e.dataTransfer) {
      const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      moveTask(dragIndex, index, dragType === 'indent' && !isSection);
    }
    setIsDragTarget(false);
    setDragType(null);
  }, [index, moveTask, dragType, isSection]);

  const handleDragEnd = useCallback(() => {
    if (rowRef.current) {
      rowRef.current.style.opacity = '1';
    }
  }, []);

  return (
    <div
      ref={rowRef}
      draggable={!isSection && isBrowser()}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      className={`relative flex items-center p-2 my-1 bg-background rounded ${isSection ? 'cursor-default' : 'cursor-move'}`}
      style={{
        marginLeft: task.is_subtask ? `${(task.level || 1) * 20}px` : 0,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className="flex-grow flex items-center"
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
      {isDragTarget && (isSection || dragType === 'below') && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" style={{ bottom: '-2px' }} />
      )}
      {isDragTarget && !isSection && dragType === 'above' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" style={{ top: '-2px' }} />
      )}
      {isDragTarget && dragType === 'indent' && !task.is_subtask && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" style={{ bottom: '-2px' }} />
      )}
      {isDragTarget && isSection && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" style={{ bottom: '-2px' }} />
      )}
    </div>
  );
};

export default React.memo(EditableScheduleRow);