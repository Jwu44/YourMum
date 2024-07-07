import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Pane, Text } from 'evergreen-ui';

const PriosDraggableList = ({ items, onReorder }) => {
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    onReorder(newItems);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="list">
        {(provided) => (
          <Pane
            {...provided.droppableProps}
            ref={provided.innerRef}
            background="tint2"
            padding={16}
            borderRadius={8}
          >
            {items.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(provided, snapshot) => (
                  <Pane
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    background={snapshot.isDragging ? 'blue100' : 'white'}
                    marginY={8}
                    padding={16}
                    borderRadius={4}
                    boxShadow="0 0 0 1px rgba(67, 90, 111, 0.14), 0 2px 4px rgba(67, 90, 111, 0.14)"
                    display="flex"
                    alignItems="center"
                  >
                    <Text size={400}>{index + 1}. {item.name}</Text>
                  </Pane>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </Pane>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default PriosDraggableList;