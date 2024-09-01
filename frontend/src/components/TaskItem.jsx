import React, { useState, useCallback } from 'react';
import { Pane, TextInput, Badge, Popover, Menu, Button } from 'evergreen-ui';

const categories = ['Exercise', 'Relationships', 'Fun', 'Ambition', 'Work'];

const TaskItem = ({ task, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task.text);
  const [isSelectingCategories, setIsSelectingCategories] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState(task.categories || []);

  const handleUpdate = useCallback(() => {
    if (editedTask.trim() !== task.text || selectedCategories !== task.categories) {
      onUpdate({ ...task, text: editedTask.trim(), categories: selectedCategories });
    }
    setIsEditing(false);
  }, [editedTask, selectedCategories, task, onUpdate]);

  const handleCategorySelect = useCallback((category) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  const handleCategoriesConfirm = useCallback(() => {
    onUpdate({ ...task, categories: selectedCategories });
    setIsSelectingCategories(false);
  }, [task, selectedCategories, onUpdate]);

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Work': return 'blue';
      case 'Fun': return 'yellow';
      case 'Relationships': return 'purple';
      case 'Ambition': return 'orange';
      case 'Exercise': return 'green';
      default: return 'neutral';
    }
  };

  const toggleCategorySelection = useCallback(() => {
    setIsSelectingCategories(prev => !prev);
  }, []);

  return (
    <Pane display="flex" alignItems="center" marginY={8}>
      {isEditing ? (
        <TextInput
          value={editedTask}
          onChange={(e) => setEditedTask(e.target.value)}
          onBlur={handleUpdate}
          onKeyPress={(e) => e.key === 'Enter' && handleUpdate()}
        />
      ) : (
        <Pane flex={1} onClick={() => setIsEditing(true)}>
          {task.text}
        </Pane>
      )}
      <Popover
        isShown={isSelectingCategories}
        onCloseComplete={() => setIsSelectingCategories(false)}
        content={
          <Pane padding={16}>
            <Menu>
              {categories.map((cat) => (
                <Menu.Item
                  key={cat}
                  onSelect={() => handleCategorySelect(cat)}
                  secondaryText={selectedCategories.includes(cat) ? "✓" : ""}
                >
                  {cat}
                </Menu.Item>
              ))}
            </Menu>
            <Button onClick={handleCategoriesConfirm} appearance="primary" intent="success" marginTop={8}>
              Confirm
            </Button>
          </Pane>
        }
      >
        <Pane onClick={toggleCategorySelection} cursor="pointer" marginLeft={8}>
          {task.categories && task.categories.map((category, index) => (
            <Badge
              key={index}
              color={getCategoryColor(category)}
              marginRight={4}
              marginBottom={4}
            >
              {category}
            </Badge>
          ))}
          <Badge 
            color="neutral" 
            marginRight={4} 
            marginBottom={4}
            onClick={toggleCategorySelection}
            cursor="pointer"
          >
            {task.categories && task.categories.length > 0 ? '+' : 'Add Category'}
          </Badge>
        </Pane>
      </Popover>
      <Pane
        onClick={() => onDelete(task.id)}
        marginLeft={8}
        cursor="pointer"
        color="grey"
        fontSize={16}
        fontWeight="bold"
      >
        ×
      </Pane>
    </Pane>
  );
};

export default React.memo(TaskItem);