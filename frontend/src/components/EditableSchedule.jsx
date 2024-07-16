import React from 'react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import {  Heading } from 'evergreen-ui';
import EditableScheduleRow from './EditableScheduleRow';

const EditableSchedule = ({ tasks, onUpdateTask, onDeleteTask, onReorderTasks }) => {
  const onDragEnd = (result) => {
    if (!result.destination) return;

    const reorderedTasks = Array.from(tasks);
    const [reorderedItem] = reorderedTasks.splice(result.source.index, 1);
    reorderedTasks.splice(result.destination.index, 0, reorderedItem);

    onReorderTasks(reorderedTasks);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="schedule">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {tasks.map((task, index) => (
              task.isSection ? (
                <Heading key={task.id} size={500} marginTop={16} marginBottom={8}>
                  {task.text}
                </Heading>
              ) : (
                <EditableScheduleRow
                  key={task.id}
                  task={task}
                  index={index}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                />
              )
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default EditableSchedule;