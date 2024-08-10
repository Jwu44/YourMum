import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Pane, Checkbox, TextInput, IconButton, Paragraph } from 'evergreen-ui';

const EditableScheduleRow = ({ task, onUpdateTask, onDeleteTask, isDragging }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(task.text);
  const inputRef = useRef(null);
  const deleteButtonRef = useRef(null);

  useEffect(() => {
    setEditedText(task.text);
  }, [task]);

  const handleSave = useCallback(() => {
    if (editedText.trim() !== task.text) {
      onUpdateTask({ ...task, text: editedText.trim() });
    }
    setIsEditing(false);
  }, [editedText, onUpdateTask, task]);

  const handleCancel = useCallback(() => {
    setEditedText(task.text);
    setIsEditing(false);
  }, [task.text]);

  const handleToggleComplete = useCallback(() => {
    onUpdateTask({ ...task, completed: !task.completed });
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
    <Pane
      display="flex"
      alignItems="center"
      padding={8}
      marginY={4}
      background="tint1"
      borderRadius={4}
      marginLeft={`${(task.level || 0) * 20}px`} // Add indentation for subtasks
      className={`editable-schedule-row ${isDragging ? 'is-dragging' : ''}`}
    >
      {task.level > 0 && (
        <Pane width={16} height={16} marginRight={8} borderLeft={1} borderBottom={1} borderColor="muted" />
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
        <Paragraph
          onClick={() => setIsEditing(true)}
          flex={1}
          textDecoration={task.completed ? 'line-through' : 'none'}
          color={task.completed ? 'muted' : 'default'}
        >
          {task.text}
        </Paragraph>
      )}
    </Pane>
  );
};

export default React.memo(EditableScheduleRow);