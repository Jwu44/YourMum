import React, { useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Heading } from 'evergreen-ui';
import EditableScheduleRow from './EditableScheduleRow';

const EditableSchedule = ({ tasks, onUpdateTask, onDeleteTask, onReorderTasks }) => {
  const allItems = useMemo(() => 
    tasks.map(task => ({
      ...task,
      type: task.isSection ? 'section' : 'task'
    })),
    [tasks]
  );

  const onDragEnd = useCallback((result) => {
    if (!result.destination) return;

    const newItems = Array.from(allItems);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    let currentSection = '';
    const updatedItems = newItems.map(item => {
      if (item.type === 'section') {
        currentSection = item.text;
        return item;
      }
      return { ...item, section: currentSection };
    });

    onReorderTasks(updatedItems);
  }, [allItems, onReorderTasks]);

  const handleDeleteTask = useCallback((taskId) => {
    onDeleteTask(taskId);
    // If the task being deleted is the last task in its section, we need to remove the section as well
    const updatedItems = allItems.reduce((acc, item, index, arr) => {
      if (item.id === taskId) {
        // Skip this item as it's being deleted
        return acc;
      }
      if (item.type === 'section' && index < arr.length - 1 && arr[index + 1].id === taskId) {
        // This is a section header followed by the task being deleted
        // Check if there are any other tasks in this section
        const nextNonDeletedTask = arr.slice(index + 2).find(i => i.type !== 'section');
        if (!nextNonDeletedTask || nextNonDeletedTask.section !== item.text) {
          // If there are no more tasks in this section, skip the section header
          return acc;
        }
      }
      return [...acc, item];
    }, []);
    onReorderTasks(updatedItems);
  }, [allItems, onDeleteTask, onReorderTasks]);

  const renderDraggable = useCallback(({ item, index, snapshot, provided }) => (
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
          onDeleteTask={handleDeleteTask}
        />
      )}
    </div>
  ), [onUpdateTask, handleDeleteTask]);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="schedule">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {allItems.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={item.type === 'section'}>
                {(provided, snapshot) => renderDraggable({ item, index, snapshot, provided })}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default React.memo(EditableSchedule);