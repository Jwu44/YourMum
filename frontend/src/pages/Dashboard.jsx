import React, { useState, useEffect, useCallback } from 'react';
import { Pane, Heading, TextInputField, SelectField, Button, toaster } from 'evergreen-ui';
import { handleSimpleInputChange, handleNestedInputChange, handleAddTask, handleUpdateTask, handleDeleteTask } from '../helper';
import TaskItem from '../components/TaskItem';
import PriosDraggableList from '../components/PriosDraggableList';
import EditableSchedule from '../components/EditableSchedule';

const Dashboard = ({ formData, setFormData, response, submitForm }) => {
  const [newTask, setNewTask] = useState('');
  const [scheduleTasks, setScheduleTasks] = useState([]);
  const [priorities, setPriorities] = useState([
    { id: 'health', name: 'Health' },
    { id: 'relationships', name: 'Relationships' },
    { id: 'fun_activities', name: 'Fun Activities' },
    { id: 'ambitions', name: 'Ambitions' }
  ]);

  const handleSimpleChange = handleSimpleInputChange(setFormData);
  const handleNestedChange = handleNestedInputChange(setFormData);

  const addTask = handleAddTask(setFormData, newTask, setNewTask, toaster);
  const updateTask = handleUpdateTask(setFormData, toaster);
  const deleteTask = handleDeleteTask(setFormData, toaster);

  const extractSchedule = useCallback((fullResponse) => {
    const scheduleRegex = /<schedule>([\s\S]*?)<\/schedule>/;
    const match = fullResponse.match(scheduleRegex);
    return match ? match[1].trim() : '';
  }, []);

  const parseScheduleToTasks = useCallback((scheduleText) => {
    const lines = scheduleText.split('\n');
    let currentSection = '';
    let tasks = [];
  
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine.match(/^(Morning|Afternoon|Evening)/i)) {
        currentSection = trimmedLine;
        tasks.push({
          id: `section-${index}`,
          text: trimmedLine,
          isSection: true,
          section: currentSection
        });
      } else if (trimmedLine) {
        tasks.push({
          id: `task-${index}`,
          text: trimmedLine.replace(/^□ /, ''),
          completed: false,
          isSection: false,
          section: currentSection
        });
      }
    });
  
    return tasks;
  }, []);

  useEffect(() => {
    if (response) {
      const scheduleContent = extractSchedule(response);
      const parsedTasks = parseScheduleToTasks(scheduleContent);
      setScheduleTasks(parsedTasks);
    }
  }, [response, extractSchedule, parseScheduleToTasks]);

  useEffect(() => {
    const updatedPriorities = priorities.reduce((acc, priority, index) => {
      acc[priority.id] = index + 1;
      return acc;
    }, {});

    setFormData(prevData => ({
      ...prevData,
      priorities: updatedPriorities
    }));
  }, [priorities, setFormData]);

  const handleReorder = (newPriorities) => {
    setPriorities(newPriorities);
  };

  const handleScheduleTaskUpdate = useCallback((updatedTask) => {
    setScheduleTasks(prevTasks => 
      prevTasks.map(task => task.id === updatedTask.id ? { ...task, ...updatedTask } : task)
    );
  }, []);

  const handleScheduleTaskDelete = useCallback((taskId) => {
    setScheduleTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  }, []);

  const handleScheduleReorder = useCallback((reorderedItems) => {
    const newScheduleTasks = reorderedItems.map(item => {
      if (item.type === 'section') {
        return { ...item, isSection: true };
      } else {
        return { ...item, isSection: false };
      }
    });
    setScheduleTasks(newScheduleTasks);
  }, []);

  return (
    <Pane display="flex" height="100vh">
      {/* Left Column: Editable Input Forms */}
      <Pane width="30%" padding={16} background="tint1" overflowY="auto">
        <Heading size={700} marginBottom={16}>Edit Inputs</Heading>
        <TextInputField
          label="Work Start Time"
          name="work_start_time"
          value={formData.work_start_time}
          onChange={handleSimpleChange}
          placeholder="Enter your work start time"
        />
        <TextInputField
          label="Work End Time"
          name="work_end_time"
          value={formData.work_end_time}
          onChange={handleSimpleChange}
          placeholder="Enter your work end time"
        />
        <Heading size={500} marginBottom={8}>Tasks</Heading>
        {formData.tasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            onUpdate={updateTask}
            onDelete={deleteTask}
          />
        ))}
        <TextInputField
          placeholder="Add new task"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              addTask();
            }
          }}
        />
        <Heading size={500} marginY={16}>Priorities (Drag to reorder)</Heading>
        <PriosDraggableList items={priorities} onReorder={handleReorder} />
        <SelectField
          label="Planner Layout Preference"
          name="layout_preference.type"
          value={formData.layout_preference.type}
          onChange={handleNestedChange}
        >
          <option value="kanban">Kanban</option>
          <option value="to-do-list">To-do List</option>
        </SelectField>
        {formData.layout_preference.type === 'to-do-list' && (
          <SelectField
            label="To-do List Subcategory"
            name="layout_preference.subcategory"
            value={formData.layout_preference.subcategory}
            onChange={handleNestedChange}
          >
            <option value="structured-timeboxed">Structured and Time-Boxed</option>
            <option value="structured-untimeboxed">Structured and Un-Time-Boxed</option>
            <option value="unstructured-timeboxed">Unstructured and Time-Boxed</option>
            <option value="unstructured-untimeboxed">Unstructured and Un-Time-Boxed</option>
          </SelectField>
        )}
        <Button appearance="primary" onClick={submitForm} marginTop={16}>Update Schedule</Button>
      </Pane>

      {/* Right Column: Display Editable Generated Schedule */}
      <Pane width="70%" padding={16} background="tint2" overflowY="auto">
        <Heading size={700} marginBottom={16}>Generated Schedule</Heading>
        {scheduleTasks.length > 0 ? (
          <Pane padding={16} background="white" borderRadius={4} elevation={1}>
            <EditableSchedule
              tasks={scheduleTasks}
              onUpdateTask={handleScheduleTaskUpdate}
              onDeleteTask={handleScheduleTaskDelete}
              onReorderTasks={handleScheduleReorder}
            />
          </Pane>
        ) : (
          <Heading size={500} marginTop={32}>
            {response ? 'Generating your schedule...' : 'Update your inputs and click "Update Schedule" to generate a schedule'}
          </Heading>
        )}
      </Pane>
    </Pane>
  );
};

export default Dashboard;