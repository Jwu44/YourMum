import React, { useMemo, useCallback, useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult, DraggableProvided, DraggableStateSnapshot, DroppableProvided, DragUpdate } from 'react-beautiful-dnd';
import { Pane } from 'evergreen-ui';
import { TypographyH4 } from '@/app/fonts/text';
import { Task } from '../../lib/types';
import EditableScheduleRow from './EditableScheduleRow';

interface EditableScheduleProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onReorderTasks: (tasks: Task[]) => void;
  layoutPreference: string;
}

interface RenderDraggableProps {
  item: Task;
  snapshot: DraggableStateSnapshot;
  provided: DraggableProvided;
}

const EditableSchedule: React.FC<EditableScheduleProps> = ({ tasks, onUpdateTask, onDeleteTask, onReorderTasks, layoutPreference }) => {
  const [potentialParentId, setPotentialParentId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const allItems = useMemo(() => {
    if (layoutPreference === 'category') {
      const groupedTasks = tasks.reduce((acc: { [key: string]: Task[] }, task) => {
        const category = task.categories[0] || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(task);
        return acc;
      }, {});

      return Object.entries(groupedTasks)
        .filter(([category]) => category !== 'Uncategorized') // Remove Uncategorized category
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

  const isStructured = layoutPreference.startsWith('structured');

  const onDragStart = useCallback(() => {
    // We can leave this empty or add any necessary logic for drag start
  }, []);

  const onDragEnd = useCallback((result: DropResult) => {
    setPotentialParentId(null);
    if (!result.destination) return;
  
    const newItems = Array.from(allItems);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    
    const destinationIndex = result.destination.index;
    const targetItem = newItems[destinationIndex - 1];

    // Determine the new section for the reordered item
    let newSection = reorderedItem.section;
    for (let i = destinationIndex; i >= 0; i--) {
      if (newItems[i] && newItems[i].is_section) {
        newSection = newItems[i].text;
        break;
      }
    }

    if (targetItem && targetItem.type === 'task' && 
        targetItem.section === newSection &&
        destinationIndex > result.source.index) {
      reorderedItem.parent_id = targetItem.id;
      reorderedItem.level = (targetItem.level || 0) + 1;
      reorderedItem.is_subtask = true;
    } else {
      reorderedItem.parent_id = null;
      reorderedItem.level = 0;
      reorderedItem.is_subtask = false;
    }

    const reorderedItemWithCategories = {
      ...reorderedItem,
      categories: reorderedItem.categories || []
    };

    reorderedItemWithCategories.section = newSection;

    newItems.splice(destinationIndex, 0, reorderedItemWithCategories);

    const updatedItems = newItems.map((item, index) => ({
      ...item,
      section_index: index,
      categories: item.categories || []
    }));

    onReorderTasks(updatedItems);
  }, [allItems, onReorderTasks]);

  const onDragUpdate = useCallback((update: DragUpdate) => {
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

  const handleDeleteTask = useCallback((taskId: string) => {
    onDeleteTask(taskId);
    if (isStructured) {
      const updatedItems = allItems.filter(item => item.id !== taskId && item.parent_id !== taskId);
      onReorderTasks(updatedItems);
    }
  }, [allItems, onDeleteTask, onReorderTasks, isStructured]);

  const renderDraggable = useCallback(({ item, snapshot, provided }: RenderDraggableProps) => (
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
        <TypographyH4 className="mt-3 mb-1">
          {item.text}
        </TypographyH4>
      ) : (
        <EditableScheduleRow
          task={item}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          isDragging={snapshot.isDragging}
          showIndicator={potentialParentId === item.id}
        />
      )}
    </Pane>
  ), [onUpdateTask, onDeleteTask, potentialParentId]);

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd} onDragUpdate={onDragUpdate}>
      <Droppable droppableId="schedule">
        {(provided: DroppableProvided) => (
          <Pane
            ref={(el: HTMLDivElement | null) => {
              provided.innerRef(el);
              containerRef.current = el;
            }}
            {...provided.droppableProps}
          >
            {allItems.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={item.type === 'section'}>
                {(provided, snapshot) => renderDraggable({ item, snapshot, provided })}
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