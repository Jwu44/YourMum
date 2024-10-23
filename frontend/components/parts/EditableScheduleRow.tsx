import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  // State management
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDragTarget, setIsDragTarget] = useState(false);
  const [dragType, setDragType] = useState<'above' | 'below' | 'indent' | null>(null);

  // Refs for stable event handling and DOM access
  const rowRef = useRef<HTMLDivElement>(null);
  const handlersRef = useRef({
    onUpdateTask,
    onDeleteTask,
    moveTask,
    task,
    index
  });

  // Update refs when props change
  useEffect(() => {
    handlersRef.current = {
      onUpdateTask,
      onDeleteTask,
      moveTask,
      task,
      index
    };
  }, [onUpdateTask, onDeleteTask, moveTask, task, index]);

  // Task update handler with structural property preservation
  const handleTaskUpdate = useCallback((updatedTask: Task) => {
    const currentTask = handlersRef.current.task;
    handlersRef.current.onUpdateTask({
      ...updatedTask,
      // Preserve structural properties
      is_section: currentTask.is_section,
      type: currentTask.type,
      section: currentTask.section,
      section_index: currentTask.section_index,
      level: currentTask.level,
      is_subtask: currentTask.is_subtask,
      parent_id: currentTask.parent_id
    });
    setIsDrawerOpen(false);
  }, []);

  // Task completion toggle handler
  const handleToggleComplete = useCallback((checked: boolean, e: React.MouseEvent) => {
    // Prevent event bubbling
    e?.stopPropagation?.();
    
    const currentTask = handlersRef.current.task;
    // Create a new task object to ensure proper state update
    const updatedTask = {
      ...currentTask,
      completed: checked,
      // Preserve all other properties
      categories: currentTask.categories || [],
      is_section: currentTask.is_section,
      type: currentTask.type,
      section: currentTask.section,
      section_index: currentTask.section_index,
      level: currentTask.level,
      is_subtask: currentTask.is_subtask,
      parent_id: currentTask.parent_id,
      id: currentTask.id // Ensure ID is preserved
    };
    
    // Call update with the complete task object
    handlersRef.current.onUpdateTask(updatedTask);
  }, []);

  // Edit drawer handlers
  const handleEdit = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  // Delete handler
  const handleDelete = useCallback(() => {
    const currentTask = handlersRef.current.task;
    handlersRef.current.onDeleteTask(currentTask.id);
  }, []);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (isBrowser() && e.dataTransfer) {
      e.dataTransfer.setData('text/plain', handlersRef.current.index.toString());
      e.dataTransfer.effectAllowed = 'move';
      if (rowRef.current) {
        rowRef.current.style.opacity = '0.5';
      }
    }
  }, []);

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
      const currentTask = handlersRef.current.task;
      const currentIndex = handlersRef.current.index;
      
      if (isSection) {
        handlersRef.current.moveTask(dragIndex, currentIndex, false, currentTask.text);
      } else {
        handlersRef.current.moveTask(
          dragIndex,
          currentIndex,
          dragType === 'indent' && !isSection,
          null
        );
      }
    }
    setIsDragTarget(false);
    setDragType(null);
  }, [isSection, dragType]);

  const handleDragEnd = useCallback(() => {
    if (rowRef.current) {
      rowRef.current.style.opacity = '1';
    }
    setIsDragTarget(false);
    setDragType(null);
  }, []);

  // Reset drag state when task changes
  useEffect(() => {
    setIsDragTarget(false);
    setDragType(null);
  }, [task]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      key={`${task.id}-${task.text}-${task.completed}`}
      className="relative" // Add relative positioning
    >
      <div
        ref={rowRef}
        draggable={!isSection && isBrowser()}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        onClick={(e) => {
          // Stop click propagation
          e.stopPropagation();
        }}
        className={`
          relative flex items-center p-2 my-1 bg-background rounded
          ${isSection ? 'cursor-default flex-col items-start' : 'cursor-move'}
          hover:bg-accent/50 transition-colors
        `}
        style={{
          marginLeft: task.is_subtask ? `${(task.level || 1) * 20}px` : 0,
          minHeight: isSection ? '40px' : 'auto',
          pointerEvents: 'auto', // Ensure the container receives events
        }}
      >
        {!isSection && (
          <div className="flex items-center flex-1 pointer-events-auto">
            {task.is_subtask && (
              <div className="w-4 h-4 mr-2 border-l border-b border-muted pointer-events-none" />
            )}
            <Checkbox
              checked={task.completed}
              onCheckedChange={(checked) => {
                // Explicitly cast to boolean and ensure event isolation
                const isChecked = Boolean(checked);
                // Use setTimeout to ensure clean event queue
                setTimeout(() => handleToggleComplete(isChecked, {} as React.MouseEvent), 0);
              }}
              className="mr-2 border-white"
              // Add key to ensure proper React reconciliation
              key={`checkbox-${task.id}`}
              // Add aria-label for accessibility
              aria-label={`Mark "${task.text}" as ${task.completed ? 'incomplete' : 'complete'}`}
            />
            <span 
              className={`flex-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}
              onClick={(e) => e.stopPropagation()} // Prevent click propagation
            >
              {task.start_time && task.end_time ? `${task.start_time} - ${task.end_time}: ` : ''}
              {task.text}
            </span>
          </div>
        )}
        
        {isSection ? (
          <div className="w-full pointer-events-none">
            <TypographyH4 className="mb-2">
              {task.text}
            </TypographyH4>
            <div className="w-full h-px bg-white opacity-50" />
          </div>
        ) : (
          <div className="pointer-events-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={(e) => e.stopPropagation()} // Prevent click propagation
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {isDragTarget && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              borderTop: dragType === 'above' ? '2px solid #3b82f6' : 'none',
              borderBottom: (dragType === 'below' || dragType === 'indent') ? '2px solid #3b82f6' : 'none',
            }}
          />
        )}
      </div>

      {isDrawerOpen && (
        <TaskEditDrawer
          isOpen={isDrawerOpen}
          onClose={handleDrawerClose}
          task={task}
          onUpdateTask={handleTaskUpdate}
        />
      )}
    </motion.div>
  );
};

// Improved memo comparison
export default React.memo(EditableScheduleRow, (prevProps, nextProps) => {
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.text === nextProps.task.text &&
    prevProps.task.completed === nextProps.task.completed &&
    prevProps.task.is_recurring === nextProps.task.is_recurring &&
    prevProps.task.custom_recurrence === nextProps.task.custom_recurrence &&
    prevProps.task.start_time === nextProps.task.start_time &&
    prevProps.task.end_time === nextProps.task.end_time &&
    prevProps.index === nextProps.index &&
    prevProps.isSection === nextProps.isSection &&
    JSON.stringify(prevProps.task.categories) === JSON.stringify(nextProps.task.categories)
  );
});