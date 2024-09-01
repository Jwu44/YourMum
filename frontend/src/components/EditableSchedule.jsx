import React, { useMemo, useCallback, useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Heading, Pane } from 'evergreen-ui';
import EditableScheduleRow from './EditableScheduleRow';

const EditableSchedule = ({ tasks, onUpdateTask, onDeleteTask, onReorderTasks, isStructured }) => {
  const [potentialParentId, setPotentialParentId] = useState(null);
  const containerRef = useRef(null);

  const allItems = useMemo(() => {
    let currentSection = null;
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
  }, [tasks]);

  const onDragStart = useCallback(() => {
    // We can leave this empty or add any necessary logic for drag start
  }, []);

  const onDragEnd = useCallback((result) => {
    setPotentialParentId(null);
    if (!result.destination) return;
  
    const newItems = Array.from(allItems);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    
    const destinationIndex = result.destination.index;
    const targetItem = newItems[destinationIndex - 1];

    if (targetItem && targetItem.type === 'task' && 
        targetItem.section === reorderedItem.section &&
        destinationIndex > result.source.index) {
      reorderedItem.parentId = targetItem.id;
      reorderedItem.level = (targetItem.level || 0) + 1;
      reorderedItem.is_subtask = true;
    } else {
      reorderedItem.parentId = null;
      reorderedItem.level = 0;
      reorderedItem.is_subtask = false;
    }

    newItems.splice(destinationIndex, 0, reorderedItem);

    // Update section_index for all items
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      section_index: index
    }));

    console.log('Updated items after drag:', updatedItems);
    onReorderTasks(updatedItems);
  }, [allItems, onReorderTasks]);

  const onDragUpdate = useCallback((update) => {
    if (!update.destination) {
      setPotentialParentId(null);
      return;
    }

    const destinationIndex = update.destination.index;
    const sourceIndex = update.source.index;
    const isMovingDown = destinationIndex > sourceIndex;

    if (isMovingDown) {
      const potentialParent = allItems[destinationIndex - 1];
      if (potentialParent && potentialParent.type === 'task') {
        setPotentialParentId(potentialParent.id);
      } else {
        setPotentialParentId(null);
      }
    } else {
      setPotentialParentId(null);
    }
  }, [allItems]);

  const handleDeleteTask = useCallback((taskId) => {
    onDeleteTask(taskId);
    if (isStructured) {
      const updatedItems = allItems.filter(item => item.id !== taskId && item.parentId !== taskId);
      onReorderTasks(updatedItems);
    }
  }, [allItems, onDeleteTask, onReorderTasks, isStructured]);

  const renderDraggable = useCallback(({ item, index, snapshot, provided }) => (
    <Pane
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      style={{
        ...provided.draggableProps.style,
        marginLeft: `${(item.level || 0) * 20}px`,
      }}
      className={`editable-schedule-row ${snapshot.isDragging ? 'is-dragging' : ''}`}
    >
      {item.is_section ? (
        <Heading size={500} marginTop={16} marginBottom={8}>
          {item.text}
        </Heading>
      ) : (
        <EditableScheduleRow
          task={item}
          onUpdateTask={onUpdateTask}
          onDeleteTask={handleDeleteTask}
          isDragging={snapshot.isDragging}
          showIndicator={potentialParentId === item.id}
        />
      )}
    </Pane>
  ), [onUpdateTask, handleDeleteTask, potentialParentId]);

  const renderItems = useCallback(() => {
    if (!isStructured) {
      return allItems.filter(item => item.type !== 'section');
    }
    return allItems;
  }, [allItems, isStructured]);

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd} onDragUpdate={onDragUpdate}>
      <Droppable droppableId="schedule">
        {(provided) => (
          <Pane
            ref={el => {
              provided.innerRef(el);
              containerRef.current = el;
            }}
            {...provided.droppableProps}
          >
            {renderItems().map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={item.is_section}>
                {(provided, snapshot) => renderDraggable({ item, index, snapshot, provided })}
              </Draggable>
            ))}
            {provided.placeholder}
          </Pane>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default React.memo(EditableSchedule);