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
        acc[category].push(task);
        return acc;
      }, {});

      return Object.entries(groupedTasks)
        .filter(([category]) => category !== 'Uncategorized')
        .flatMap(([category, categoryTasks]) => [
          {
            id: `section-${category}`,
            text: category.charAt(0).toUpperCase() + category.slice(1),
            is_section: true,
            type: 'section'
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

  const moveTask = useCallback((dragIndex: number, hoverIndex: number, shouldIndent: boolean, targetSection: string | null) => {
    const draggedTask = memoizedTasks[dragIndex];
    const newTasks = [...memoizedTasks];
    newTasks.splice(dragIndex, 1);

    if (targetSection) {
      // Find the index of the section header
      const sectionIndex = newTasks.findIndex(task => task.is_section && task.text === targetSection);
      if (sectionIndex !== -1) {
        // Insert the task right after the section header
        newTasks.splice(sectionIndex + 1, 0, { 
          ...draggedTask, 
          section: targetSection, 
          is_subtask: false, 
          level: 0, 
          parent_id: null,
          categories: [targetSection] // Update the task's category
        });
      } else {
        // If section not found, add to the end
        newTasks.push({ 
          ...draggedTask, 
          section: targetSection, 
          is_subtask: false, 
          level: 0, 
          parent_id: null,
          categories: [targetSection] // Update the task's category
        });
      }
    } else {
      const targetTask = newTasks[hoverIndex];
      if (shouldIndent && !targetTask.is_section && !draggedTask.is_subtask) {
        draggedTask.is_subtask = true;
        draggedTask.level = (targetTask.level || 0) + 1;
        draggedTask.parent_id = targetTask.id;
        newTasks.splice(hoverIndex + 1, 0, draggedTask);
      } else {
        if (targetTask.is_section) {
          newTasks.splice(hoverIndex + 1, 0, draggedTask);
        } else {
          newTasks.splice(hoverIndex, 0, draggedTask);
        }
        draggedTask.is_subtask = false;
        draggedTask.level = 0;
        draggedTask.parent_id = null;
      }
    }

    onReorderTasks(newTasks);
  }, [memoizedTasks, onReorderTasks]);

  const handleUpdateTask = useCallback((updatedTask: Task) => {
    const newTasks = memoizedTasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    );
    onUpdateTask(updatedTask);
    onReorderTasks(newTasks);
  }, [memoizedTasks, onUpdateTask, onReorderTasks]);

  const handleDeleteTask = useCallback((taskId: string) => {
    const newTasks = memoizedTasks.filter(task => task.id !== taskId && task.parent_id !== taskId);
    onDeleteTask(taskId);
    onReorderTasks(newTasks);
  }, [memoizedTasks, onDeleteTask, onReorderTasks]);

  return (
    <Pane>
      {memoizedTasks.map((item, index) => (
        <React.Fragment key={item.id}>
          {item.type === 'section' ? (
            <EditableScheduleRow
              task={item}
              index={index}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              moveTask={moveTask}
              isSection={true}
            >
              <TypographyH4 className="mt-3 mb-1">
                {item.text}
              </TypographyH4>
            </EditableScheduleRow>
          ) : (
            <EditableScheduleRow
              task={item}
              index={index}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              moveTask={moveTask}
              isSection={false}
            />
          )}
        </React.Fragment>
      ))}
    </Pane>
  );
};

export default React.memo(EditableSchedule);