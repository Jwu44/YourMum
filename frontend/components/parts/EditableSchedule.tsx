import React, { useMemo, useCallback, useState } from 'react';
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
  const [potentialParentId, setPotentialParentId] = useState<string | null>(null);

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

  const moveTask = useCallback((dragIndex: number, hoverIndex: number, shouldIndent: boolean) => {
    const draggedTask = memoizedTasks[dragIndex];
    const newTasks = [...memoizedTasks];
    newTasks.splice(dragIndex, 1);

    const targetTask = newTasks[hoverIndex];
    if (shouldIndent && !targetTask.is_section && !draggedTask.is_subtask) {
      draggedTask.is_subtask = true;
      draggedTask.level = (targetTask.level || 0) + 1;
      draggedTask.parent_id = targetTask.id;
      newTasks.splice(hoverIndex + 1, 0, draggedTask);
    } else {
      // If the target is a section, always insert after it
      if (targetTask.is_section) {
        newTasks.splice(hoverIndex + 1, 0, draggedTask);
      } else {
        newTasks.splice(hoverIndex, 0, draggedTask);
      }
      // Reset subtask properties if it's not being indented
      draggedTask.is_subtask = false;
      draggedTask.level = 0;
      draggedTask.parent_id = null;
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
        item.type === 'section' ? (
          <TypographyH4 key={item.id} className="mt-3 mb-1">
            {item.text}
          </TypographyH4>
        ) : (
          <EditableScheduleRow
            key={item.id}
            task={item}
            index={index}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            moveTask={moveTask}
            isSection={item.is_section}
          />
        )
      ))}
    </Pane>
  );
};

export default React.memo(EditableSchedule);