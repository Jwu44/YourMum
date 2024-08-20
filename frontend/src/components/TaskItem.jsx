import React, { useState, useRef, useEffect } from 'react';
import { Pane, TextInput, Badge, Spinner, Popover, Menu } from 'evergreen-ui';

const categories = ['Exercise', 'Relationships', 'Fun', 'Ambition', 'Work'];

const TaskItem = ({ task, onUpdate, onUpdateCategory, onDelete }) => {
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
      case 'Relationships':
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
      <Pane>
        {isLoading ? (
          <Spinner size={12} marginRight={8} />
        ) : (
          <Popover
            content={
              <Menu>
                {categories.map((cat) => (
                  <Menu.Item
                    key={cat}
                    onSelect={() => onUpdateCategory(task.id, cat)}
                  >
                    {cat}
                  </Menu.Item>
                ))}
              </Menu>
            }
          >
            <Badge
              color={getCategoryColor(task.categories[0])}
              marginRight={4}
              marginBottom={4}
              cursor="pointer"
            >
              {task.categories[0]}
            </Badge>
          </Popover>
        )}
      </Pane>
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