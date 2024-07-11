import React, { useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Pane, Checkbox, TextInput, IconButton } from 'evergreen-ui';

const EditableScheduleRow = ({ task, index, onUpdateTask, onDeleteTask }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(task.text);

  const handleSave = () => {
    onUpdateTask({ ...task, text: editedText });
    setIsEditing(false);
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided) => (
        <Pane
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          display="flex"
          alignItems="center"
          padding={8}
          marginY={4}
          background="tint1"
          borderRadius={4}
        >
          <Checkbox
            checked={task.completed}
            onChange={() => onUpdateTask({ ...task, completed: !task.completed })}
            marginRight={8}
          />
          {isEditing ? (
            <TextInput
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              onBlur={handleSave}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
              flex={1}
              autoFocus
            />
          ) : (
            <Pane onClick={() => setIsEditing(true)} flex={1}>
              {task.text}
            </Pane>
          )}
          <IconButton
            icon="trash"
            intent="danger"
            appearance="minimal"
            onClick={() => onDeleteTask(task.id)}
          />
        </Pane>
      )}
    </Draggable>
  );
};

export default EditableScheduleRow;