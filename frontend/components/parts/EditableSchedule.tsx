import React, { useState, useEffect, useCallback } from 'react';
import { Task } from '../../lib/types';
import EditableScheduleRow from './EditableScheduleRow';
import { TypographyH4 } from '@/app/fonts/text';

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
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const moveTask = useCallback((dragIndex: number, hoverIndex: number) => {
    const draggedTask = localTasks[dragIndex];
    const newTasks = [...localTasks];
    newTasks.splice(dragIndex, 1);
    newTasks.splice(hoverIndex, 0, draggedTask);
    setLocalTasks(newTasks);
    onReorderTasks(newTasks);
  }, [localTasks, onReorderTasks]);

  const handleUpdateTask = useCallback((updatedTask: Task) => {
    const newTasks = localTasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    );
    setLocalTasks(newTasks);
    onUpdateTask(updatedTask);
  }, [localTasks, onUpdateTask]);

  const handleDeleteTask = useCallback((taskId: string) => {
    const newTasks = localTasks.filter(task => task.id !== taskId);
    setLocalTasks(newTasks);
    onDeleteTask(taskId);
  }, [localTasks, onDeleteTask]);

  return (
    <div>
      {localTasks.map((task, index) => (
        task.is_section ? (
          <TypographyH4 key={task.id} className="mt-3 mb-1">
            {task.text}
          </TypographyH4>
        ) : (
          <EditableScheduleRow
            key={task.id}
            task={task}
            index={index}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            moveTask={moveTask}
          />
        )
      ))}
    </div>
  );
};

export default React.memo(EditableSchedule);