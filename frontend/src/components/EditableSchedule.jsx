import React, { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {  Heading } from 'evergreen-ui';
import EditableScheduleRow from './EditableScheduleRow';

const EditableSchedule = ({ tasks, onUpdateTask, onDeleteTask, onReorderTasks }) => {
  const allItems = useMemo(() => {
    return tasks.reduce((acc, task, index) => {
      if (task.isSection) {
        acc.push({ ...task, type: 'section' });
      } else {
        acc.push({ ...task, type: 'task' });
      }
      return acc;
    }, []);
  }, [tasks]);

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const newItems = Array.from(allItems);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    // Update the section of tasks if necessary
    let currentSection = '';
    const updatedItems = newItems.map(item => {
      if (item.type === 'section') {
        currentSection = item.text;
        return item;
      } else {
        return { ...item, section: currentSection };
      }
    });

    onReorderTasks(updatedItems);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="schedule">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {allItems.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={item.type === 'section'}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      ...provided.draggableProps.style,
                      opacity: snapshot.isDragging ? 0.5 : 1,
                    }}
                  >
                    {item.type === 'section' ? (
                      <Heading size={500} marginTop={16} marginBottom={8}>
                        {item.text}
                      </Heading>
                    ) : (
                      <EditableScheduleRow
                        task={item}
                        onUpdateTask={onUpdateTask}
                        onDeleteTask={onDeleteTask}
                      />
                    )}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default EditableSchedule;