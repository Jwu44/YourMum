import React, { useMemo, useCallback, useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Heading, Pane } from 'evergreen-ui';
import EditableScheduleRow from './EditableScheduleRow';

const EditableSchedule = ({ tasks, onUpdateTask, onDeleteTask, onReorderTasks, isStructured }) => {
  const [dragIndicator, setDragIndicator] = useState(null);
  const containerRef = useRef(null);

  const allItems = useMemo(() => {
    let currentSection = null;
    let sectionStartIndex = 0;
    return tasks.map((task, index) => {
      if (task.isSection) {
        currentSection = task.text;
        sectionStartIndex = index;
      }
      return {
        ...task,
        type: task.isSection ? 'section' : 'task',
        section: currentSection,
        sectionIndex: index - sectionStartIndex
      };
    });
  }, [tasks]);

  const onDragEnd = useCallback((result) => {
    setDragIndicator(null);
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
    } else {
      reorderedItem.parentId = null;
      reorderedItem.level = 0;
    }
  
    newItems.splice(destinationIndex, 0, reorderedItem);
  
    onReorderTasks(newItems);
  }, [allItems, onReorderTasks]);

  const onDragUpdate = useCallback((update) => {
    if (!update.destination || !containerRef.current) {
      setDragIndicator(null);
      return;
    }
  
    const containerRect = containerRef.current.getBoundingClientRect();
    const scrollTop = containerRef.current.scrollTop;
    const taskElements = containerRef.current.querySelectorAll('.editable-schedule-row');
    
    const sourceIndex = update.source.index;
    const destinationIndex = update.destination.index;
    const targetItem = allItems[destinationIndex];
  
    const targetElement = taskElements[destinationIndex];
  
    if (targetElement) {
      const targetRect = targetElement.getBoundingClientRect();
      const topPosition = targetRect.top - containerRect.top + scrollTop;
      const indentationLevel = targetItem.level || 0;
  
      // Calculate the potential indentation based on the drag position
      const dragThreshold = targetRect.left + 20; // 20px from the left edge
      const potentialIndentation = Math.max(0, Math.floor((update.clientX - dragThreshold) / 20));
  
      // Determine if we're creating a subtask (dragging downwards)
      const isCreatingSubtask = destinationIndex > sourceIndex && potentialIndentation > indentationLevel;
  
      // Set the indicator properties
      setDragIndicator({
        top: isCreatingSubtask ? targetRect.bottom - containerRect.top + scrollTop : topPosition,
        left: (isCreatingSubtask ? indentationLevel + 1 : indentationLevel) * 20,
        width: containerRect.width - ((isCreatingSubtask ? indentationLevel + 1 : indentationLevel) * 20),
        height: 2,
        backgroundColor: "#3366FF"
      });
    } else {
      setDragIndicator(null);
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
      {item.type === 'section' ? (
        <Heading size={500} marginTop={16} marginBottom={8}>
          {item.text}
        </Heading>
      ) : (
        <EditableScheduleRow
          task={item}
          onUpdateTask={onUpdateTask}
          onDeleteTask={handleDeleteTask}
          isDragging={snapshot.isDragging}
        />
      )}
    </Pane>
  ), [onUpdateTask, handleDeleteTask]);

  const renderItems = useCallback(() => {
    if (!isStructured) {
      return allItems.filter(item => item.type !== 'section');
    }
    return allItems;
  }, [allItems, isStructured]);

  return (
    <>
      <style>
        {`
          .editable-schedule-row.is-dragging,
          .editable-schedule-row.is-dragging * {
            opacity: 0.5 !important;
            transition: opacity 0.2s ease;
          }
        `}
      </style>
      <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate}>
        <Droppable droppableId="schedule">
          {(provided) => (
            <Pane
              position="relative"
              height="100%"
              overflowY="auto"
              ref={el => {
                provided.innerRef(el);
                containerRef.current = el;
              }}
              {...provided.droppableProps}
            >
              {renderItems().map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={item.type === 'section'}>
                  {(provided, snapshot) => renderDraggable({ item, index, snapshot, provided })}
                </Draggable>
              ))}
              {dragIndicator && (
                <Pane
                  position="absolute"
                  {...dragIndicator}
                  zIndex={1000}
                />
              )}
              {provided.placeholder}
            </Pane>
          )}
        </Droppable>
      </DragDropContext>
    </>
  );
};

export default React.memo(EditableSchedule);