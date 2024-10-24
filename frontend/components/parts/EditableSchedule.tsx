import React, { useMemo, useCallback } from 'react';
import { Pane } from 'evergreen-ui';
import { TypographyH4 } from '@/app/fonts/text';
import EditableScheduleRow from './EditableScheduleRow';
import { Task } from '../../lib/types';

interface EditableScheduleProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onReorderTasks: (tasks: Task[]) => void;
  layoutPreference: string;
}

const EditableSchedule: React.FC<EditableScheduleProps> = ({ 
  tasks, 
  onUpdateTask, 
  onDeleteTask, 
  onReorderTasks, 
  layoutPreference
}) => {
  const memoizedTasks = useMemo(() => {
    if (layoutPreference === 'category') {
      const groupedTasks = tasks.reduce((acc: { [key: string]: Task[] }, task) => {
        const category = task.categories?.[0] || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({...task}); // Create new reference
        return acc;
      }, {});

      return Object.entries(groupedTasks)
        .filter(([category]) => category !== 'Uncategorized')
        .flatMap(([category, categoryTasks]) => [
          {
            id: `section-${category}`,
            text: category.charAt(0).toUpperCase() + category.slice(1),
            is_section: true,
            type: 'section',
            categories: [],
            completed: false
          } as Task,
          ...categoryTasks.map(task => ({
            ...task,
            type: 'task',
            section: category
          }))
        ]);
    } else {
      let currentSection: string | null = null;
      let sectionStartIndex = 0;
      return tasks.map((task, index) => {
        if (task.is_section) {
          currentSection = task.text;
          sectionStartIndex = index;
          return {
            ...task,
            type: 'section',
            section: currentSection,
            sectionIndex: 0
          };
        }
        return {
          ...task,
          type: 'task',
          section: currentSection,
          sectionIndex: index - sectionStartIndex
        };
      });
    }
  }, [tasks, layoutPreference]);

  const handleUpdateTask = useCallback((updatedTask: Task) => {
    const taskIndex = memoizedTasks.findIndex(t => t.id === updatedTask.id);
    if (taskIndex !== -1) {
      // Create a new array with the updated task
      const newTasks = memoizedTasks.map(task => 
        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
      );
      
      // Call onUpdateTask before updating the local state
      onUpdateTask(updatedTask);
      onReorderTasks(newTasks);
    }
  }, [memoizedTasks, onUpdateTask, onReorderTasks]);

  const handleDeleteTask = useCallback((taskId: string) => {
    const newTasks = memoizedTasks.filter(task => 
      task.id !== taskId && task.parent_id !== taskId
    );
    onDeleteTask(taskId);
    onReorderTasks(newTasks);
  }, [memoizedTasks, onDeleteTask, onReorderTasks]);

  const moveTask = useCallback((dragIndex: number, hoverIndex: number, shouldIndent: boolean, targetSection: string | null) => {
    const draggedTask = {...memoizedTasks[dragIndex]}; // Create new reference
    const newTasks = memoizedTasks.filter((_, index) => index !== dragIndex);

    if (targetSection) {
      const sectionIndex = newTasks.findIndex(task => 
        task.is_section && task.text === targetSection
      );
      
      if (sectionIndex !== -1) {
        newTasks.splice(sectionIndex + 1, 0, { 
          ...draggedTask, 
          section: targetSection, 
          is_subtask: false, 
          level: 0, 
          parent_id: null,
          categories: [targetSection]
        });
      } else {
        newTasks.push({ 
          ...draggedTask, 
          section: targetSection, 
          is_subtask: false, 
          level: 0, 
          parent_id: null,
          categories: [targetSection]
        });
      }
    } else {
      const targetTask = newTasks[hoverIndex];
      const updatedDraggedTask = { ...draggedTask };
      
      if (shouldIndent && !targetTask.is_section && !draggedTask.is_subtask) {
        updatedDraggedTask.is_subtask = true;
        updatedDraggedTask.level = (targetTask.level || 0) + 1;
        updatedDraggedTask.parent_id = targetTask.id;
        newTasks.splice(hoverIndex + 1, 0, updatedDraggedTask);
      } else {
        if (targetTask.is_section) {
          newTasks.splice(hoverIndex + 1, 0, {
            ...updatedDraggedTask,
            is_subtask: false,
            level: 0,
            parent_id: null
          });
        } else {
          newTasks.splice(hoverIndex, 0, {
            ...updatedDraggedTask,
            is_subtask: false,
            level: 0,
            parent_id: null
          });
        }
      }
    }

    onReorderTasks(newTasks);
  }, [memoizedTasks, onReorderTasks]);

  return (
    <Pane>
      {memoizedTasks.map((item, index) => (
        <React.Fragment key={`${item.id}-${item.type}`}>
          <EditableScheduleRow
            task={item}
            index={index}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            moveTask={moveTask}
            isSection={item.type === 'section'}
          >
            {item.type === 'section' && (
              <TypographyH4 className="mt-3 mb-1">
                {item.text}
              </TypographyH4>
            )}
          </EditableScheduleRow>
        </React.Fragment>
      ))}
    </Pane>
  );
};

export default React.memo(EditableSchedule);