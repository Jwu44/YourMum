import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { Task } from '../../lib/types';
import { isBrowser } from '../../lib/utils';
import { TypographyH4 } from '../../app/fonts/text';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TaskEditDrawer from './TaskEditDrawer';

interface EditableScheduleRowProps {
  task: Task;
  index: number;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  moveTask: (dragIndex: number, hoverIndex: number, shouldIndent: boolean, targetSection: string | null) => void;
  isSection: boolean;
  children?: React.ReactNode; 
}

const EditableScheduleRow: React.FC<EditableScheduleRowProps> = ({ 
  task, 
  index,
  onUpdateTask, 
  onDeleteTask,
  moveTask,
  isSection,
  children
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const [isDragTarget, setIsDragTarget] = useState(false);
  const [dragType, setDragType] = useState<'above' | 'below' | 'indent' | null>(null);

  const handleToggleComplete = useCallback((checked: boolean) => {
    const updatedTask = { 
      ...task, 
      completed: checked,
      categories: task.categories || []
    };
    onUpdateTask(updatedTask);
  }, [onUpdateTask, task]);

  const handleEdit = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    onDeleteTask(task.id);
  }, [onDeleteTask, task.id]);

  const handleDrawerClose = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

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
      if (isSection) {
        moveTask(dragIndex, index, false, task.text);
      } else {
        moveTask(dragIndex, index, dragType === 'indent' && !isSection, null);
      }
    }
    setIsDragTarget(false);
    setDragType(null);
  }, [index, moveTask, dragType, isSection, task.text]);

  const handleDragEnd = useCallback(() => {
    if (rowRef.current) {
      rowRef.current.style.opacity = '1';
    }
  }, []);

  return (
    <>
      <motion.div
        ref={rowRef}
        draggable={!isSection && isBrowser()}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className={`relative flex items-center p-2 my-1 bg-background rounded ${isSection ? 'cursor-default flex-col items-start' : 'cursor-move'}`}
        style={{
          marginLeft: task.is_subtask ? `${(task.level || 1) * 20}px` : 0,
          minHeight: isSection ? '40px' : 'auto',
        }}
      >
        {!isSection && (
          <>
            {task.is_subtask && (
              <div className="w-4 h-4 mr-2 border-l border-b border-muted" />
            )}
            <Checkbox
              checked={task.completed}
              onCheckedChange={handleToggleComplete}
              className="mr-2 border-white"
            />
          </>
        )}
        {isSection ? (
          <>
            <TypographyH4 className="w-full mb-2">
              {task.text}
            </TypographyH4>
            <div className="w-full h-px bg-white opacity-50" />
          </>
        ) : (
          <span className={`flex-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
            {task.start_time && task.end_time ? `${task.start_time} - ${task.end_time}: ` : ''}
            {task.text}
          </span>
        )}
        {!isSection && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {isDragTarget && (isSection || dragType === 'below') && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" style={{ bottom: '-2px' }} />
        )}
        {isDragTarget && !isSection && dragType === 'above' && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" style={{ top: '-2px' }} />
        )}
        {isDragTarget && dragType === 'indent' && !task.is_subtask && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" style={{ bottom: '-2px' }} />
        )}
      </motion.div>
      {isDrawerOpen && (
        <TaskEditDrawer
          isOpen={isDrawerOpen}
          onClose={handleDrawerClose}
          task={task}
          onUpdateTask={onUpdateTask}
        />
      )}
    </>
  );
};

export default React.memo(EditableScheduleRow);