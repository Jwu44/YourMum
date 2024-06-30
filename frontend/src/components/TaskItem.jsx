import React, { useState, useRef, useEffect } from 'react';
import { Pane, TextInput, Badge, Spinner } from 'evergreen-ui';

const TaskItem = ({ task, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task.text);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleUpdate = async () => {
    if (editedTask.trim() !== task.text) {
      setIsLoading(true);
      await onUpdate({ ...task, text: editedTask.trim() });
      setIsLoading(false);
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleUpdate();
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Work':
        return 'blue';
      case 'Fun':
        return 'yellow';
      case 'Relationship':
        return 'purple';
      case 'Ambition':
        return 'orange';
      case 'Exercise':
        return 'green';
      default:
        return 'neutral';
    }
  };

  return (
    <Pane display="flex" alignItems="center" marginY={8}>
      {isEditing ? (
        <TextInput
          ref={inputRef}
          value={editedTask}
          onChange={(e) => setEditedTask(e.target.value)}
          onBlur={handleUpdate}
          onKeyPress={handleKeyPress}
          width="100%"
        />
      ) : (
        <Pane flex={1} onClick={() => setIsEditing(true)} cursor="text">
          {task.text}
        </Pane>
      )}
      <Badge color={getCategoryColor(task.category)} marginRight={8}>
        {isLoading ? <Spinner size={12} /> : task.category}
      </Badge>
      <Pane
        onClick={() => onDelete(task.id)}
        marginLeft={8}
        cursor="pointer"
        color="grey"
        fontSize={16}
        fontWeight="bold"
        role="button"
      >
        ×
      </Pane>
    </Pane>
  );
};

export default TaskItem;