import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Pane, Checkbox, TextInput, IconButton, Paragraph, Badge } from 'evergreen-ui';

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

const EditableScheduleRow = ({ task, onUpdateTask, onDeleteTask, isDragging, showIndicator }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(task.text);
  const inputRef = useRef(null);
  const deleteButtonRef = useRef(null);

  useEffect(() => {
    setEditedText(task.text);
  }, [task]);

  const handleSave = useCallback(() => {
    if (editedText.trim() !== task.text) {
      onUpdateTask({ ...task, text: editedText.trim(), categories: task.categories || [] });
    }
    setIsEditing(false);
  }, [editedText, onUpdateTask, task]);

  const handleCancel = useCallback(() => {
    setEditedText(task.text);
    setIsEditing(false);
  }, [task.text]);

  const handleToggleComplete = useCallback(() => {
    const updatedTask = { 
      ...task, 
      completed: !task.completed,
      categories: task.categories || [] // Ensure categories are included
    };
    console.log('Toggling task with categories:', updatedTask.categories);
    onUpdateTask(updatedTask);
  }, [onUpdateTask, task]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  const handleBlur = useCallback((e) => {
    if (deleteButtonRef.current && deleteButtonRef.current.contains(e.relatedTarget)) {
      return;
    }
    handleSave();
  }, [handleSave]);

  const handleDelete = useCallback(() => {
    onDeleteTask(task.id);
  }, [onDeleteTask, task.id]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <Pane position="relative">
      <Pane
        display="flex"
        alignItems="center"
        padding={8}
        marginY={4}
        background="tint1"
        borderRadius={4}
        marginLeft={task.is_subtask ? `${(task.level || 1) * 20}px` : 0}
        className={`editable-schedule-row ${isDragging ? 'is-dragging' : ''}`}
      >
        {task.is_subtask && (
          <Pane width={16} height={16} marginRight={8} borderLeft="1px solid" borderBottom="1px solid" borderColor="muted" />
        )}
        <Checkbox
          checked={task.completed}
          onChange={handleToggleComplete}
          marginRight={8}
        />
        {isEditing ? (
          <Pane display="flex" alignItems="center" flex={1}>
            <TextInput
              ref={inputRef}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              flex={1}
            />
            <IconButton
              ref={deleteButtonRef}
              icon="trash"
              intent="danger"
              onClick={handleDelete}
              marginLeft={8}
            />
          </Pane>
        ) : (
          <Pane flex={1} display="flex" alignItems="center">
            <Paragraph
              onClick={() => setIsEditing(true)}
              flex={1}
              textDecoration={task.completed ? 'line-through' : 'none'}
              color={task.completed ? 'muted' : 'default'}
            >
              {task.start_time && task.end_time ? `${task.start_time} - ${task.end_time}: ` : ''}
              {task.text}
            </Paragraph>
            {!isEditing && task.categories && task.categories.map((category, index) => (
              <Badge
                key={index}
                color={getCategoryColor(category)}
                marginLeft={4}
              >
                {category}
              </Badge>
            ))}
          </Pane>
        )}
      </Pane>
      {showIndicator && (
        <Pane
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          height={2}
          backgroundColor="#3366FF"
        />
      )}
    </Pane>
  );
};

export default React.memo(EditableScheduleRow);