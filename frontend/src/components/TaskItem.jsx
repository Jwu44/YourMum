import React, { useState } from 'react';
import { Pane, TextInput, Button, Badge, Spinner } from 'evergreen-ui';

const TaskItem = ({ task, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task.text);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async () => {
    setIsLoading(true);
    await onUpdate({ ...task, text: editedTask });
    setIsLoading(false);
    setIsEditing(false);
  };

  return (
    <Pane display="flex" alignItems="center" marginY={8}>
      {isEditing ? (
        <>
          <TextInput
            value={editedTask}
            onChange={(e) => setEditedTask(e.target.value)}
            width="100%"
          />
          <Button onClick={handleUpdate} marginLeft={8} isLoading={isLoading}>
            Save
          </Button>
        </>
      ) : (
        <>
          <Pane flex={1}>{task.text}</Pane>
          <Badge color="blue" marginRight={8}>
            {isLoading ? <Spinner size={12} /> : task.category}
          </Badge>
          <Button onClick={() => setIsEditing(true)} marginRight={8}>
            Edit
          </Button>
          <Button onClick={() => onDelete(task.id)}>Delete</Button>
        </>
      )}
    </Pane>
  );
};

export default TaskItem;