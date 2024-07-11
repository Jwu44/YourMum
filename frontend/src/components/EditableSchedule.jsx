import React from 'react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { Pane, Heading } from 'evergreen-ui';
import EditableScheduleRow from './EditableScheduleRow';

const EditableSchedule = ({ tasks, onUpdateTask, onDeleteTask, onReorderTasks }) => {
  const onDragEnd = (result) => {
    if (!result.destination) return;

    const reorderedTasks = Array.from(tasks);
    const [reorderedItem] = reorderedTasks.splice(result.source.index, 1);
    reorderedTasks.splice(result.destination.index, 0, reorderedItem);

    onReorderTasks(reorderedTasks);
  };

  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.section]) {
      acc[task.section] = [];
    }
    acc[task.section].push(task);
    return acc;
  }, {});

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {Object.entries(groupedTasks).map(([section, sectionTasks]) => (
        <Pane key={section} marginBottom={16}>
          <Heading size={500} marginBottom={8}>{section}</Heading>
          <Droppable droppableId={section}>
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {sectionTasks.map((task, index) => (
                  <EditableScheduleRow
                    key={task.id}
                    task={task}
                    index={index}
                    onUpdateTask={onUpdateTask}
                    onDeleteTask={onDeleteTask}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </Pane>
      ))}
    </DragDropContext>
  );
};

export default EditableSchedule;