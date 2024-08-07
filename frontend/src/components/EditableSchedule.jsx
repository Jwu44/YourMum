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
    
    if (result.destination.index > result.source.index &&
        newItems[result.destination.index - 1].type === 'task' &&
        newItems[result.destination.index - 1].section === reorderedItem.section) {
      reorderedItem.parentId = newItems[result.destination.index - 1].id;
      reorderedItem.level = (newItems[result.destination.index - 1].level || 0) + 1;
    } else {
      reorderedItem.parentId = null;
      reorderedItem.level = 0;
    }

    newItems.splice(result.destination.index, 0, reorderedItem);

    onReorderTasks(newItems);
  }, [allItems, onReorderTasks]);

  const onDragUpdate = useCallback((update) => {
    if (!update.destination || !containerRef.current) {
      setDragIndicator(null);
      return;
    }

    const destinationIndex = update.destination.index;
    const sourceIndex = update.source.index;
    const draggedItem = allItems[sourceIndex];

    if (destinationIndex > sourceIndex && destinationIndex < allItems.length) {
      const potentialParentIndex = destinationIndex - 1;
      const potentialParent = allItems[potentialParentIndex];
      
      if (potentialParent && potentialParent.type === 'task' && potentialParent.section === draggedItem.section) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const scrollTop = containerRef.current.scrollTop;

        // Find the start of the current section
        const sectionStartIndex = allItems.findIndex(item => item.isSection && item.text === potentialParent.section);
        
        // Calculate the top position based on the index within the section and a fixed row height
        const rowHeight = 40; // Adjust this value based on your actual row height
        const topPosition = ((potentialParentIndex - sectionStartIndex) * rowHeight) - scrollTop;

        setDragIndicator({
          top: topPosition + rowHeight, // Position it below the potential parent
          left: (potentialParent.level + 1) * 20,
          width: containerRect.width - ((potentialParent.level + 1) * 20)
        });
      } else {
        setDragIndicator(null);
      }
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
    </Pane>
  ), [onUpdateTask, handleDeleteTask]);

  const renderItems = useCallback(() => {
    if (!isStructured) {
      return allItems.filter(item => item.type !== 'section');
    }
    return allItems;
  }, [allItems, isStructured]);

  return (
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
                top={dragIndicator.top}
                left={dragIndicator.left}
                width={dragIndicator.width}
                height={2}
                backgroundColor="#3366FF"
                zIndex={1000}
              />
            )}
            {provided.placeholder}
          </Pane>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default React.memo(EditableSchedule);