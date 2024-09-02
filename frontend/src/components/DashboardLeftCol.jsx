import React from 'react';
import { Pane, Heading, TextInputField, SelectField, Button, Checkbox } from 'evergreen-ui';
import { Sun, Sunrise, Sunset, Moon, Flower } from 'lucide-react';
import TaskItem from './TaskItem';
import PriosDraggableList from './PriosDraggableList';

const DashboardLeftCol = ({
  formData,
  newTask,
  setNewTask,
  priorities,
  handleSimpleChange,
  handleNestedChange,
  updateTask,
  deleteTask,
  addTask,
  handleReorder,
  submitForm,
  handleEnergyChange,
  isLoading
}) => {
  const energyOptions = [
    { value: 'high_all_day', label: 'High-Full of energy during the day', icon: Flower },
    { value: 'peak_morning', label: 'Energy peaks in the morning', icon: Sunrise },
    { value: 'peak_afternoon', label: 'Energy peaks in the afternoon', icon: Sun },
    { value: 'peak_evening', label: 'Energy peaks in the evening', icon: Sunset },
    { value: 'low_energy', label: 'Low energy, need help increasing', icon: Moon },
  ];

  return (
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
        onKeyDown={(e) => {
          if (e.key === 'Enter' && newTask.trim()) {
            addTask();
          }
        }}
      />
      <Button 
        onClick={() => {
          if (newTask.trim()) {
            addTask();
          }
        }} 
        marginBottom={16}
      >
        Add Task
      </Button>
      <Heading size={500} marginY={16}>Priorities (Drag to reorder)</Heading>
      <PriosDraggableList items={priorities} onReorder={handleReorder} />

      <Heading size={500} marginY={16}>Energy Patterns</Heading>
      {energyOptions.map((option) => (
        <Pane key={option.value} display="flex" alignItems="center" marginBottom={8}>
          <Checkbox
            checked={(formData.energy_patterns || []).includes(option.value)}
            onChange={() => handleEnergyChange(option.value)}
            marginRight={8}
          />
          <option.icon size={16} style={{ marginRight: 8 }} />
          <span>{option.label}</span>
        </Pane>
      ))}

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
      <Button appearance="primary" onClick={submitForm} marginTop={16} isLoading={isLoading}>
        Update Schedule
      </Button>
    </Pane>
  );
};

export default DashboardLeftCol;