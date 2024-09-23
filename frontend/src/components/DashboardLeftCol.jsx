import React from 'react';
import { Pane, Heading, TextInputField, SelectField, Button, Checkbox, RadioGroup } from 'evergreen-ui';
import { Sun, Sunrise, Sunset, Moon, Flower } from 'lucide-react';
import TaskItem from './TaskItem';
import PriosDraggableList from '../../components/parts/PriosDraggableList';

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

      <Heading size={500} marginY={16}>Layout Preferences</Heading>
      
      <RadioGroup
        label="Day Structure"
        value={formData.layout_preference.structure || ''}
        options={[
          { label: 'Structured day with clear sections', value: 'structured' },
          { label: 'Flexible day without sections', value: 'unstructured' }
        ]}
        onChange={(event) => handleNestedChange({
          target: { name: 'layout_preference.structure', value: event.target.value }
        })}
      />

      {formData.layout_preference.structure === 'structured' && (
        <SelectField
          label="Structured Layout Type"
          name="layout_preference.subcategory"
          value={formData.layout_preference.subcategory || ''}
          onChange={handleNestedChange}
          marginY={8}
        >
          <option value="">Select a layout type</option>
          <option value="day-sections">Day Sections (Morning, Afternoon, Evening)</option>
          <option value="priority">Priority (High, Medium, Low)</option>
          <option value="category">Category Based (Work, Fun, Relationships, Ambition, Exercise)</option>
        </SelectField>
      )}

      <RadioGroup
        label="Task Timeboxing"
        value={formData.layout_preference.timeboxed || ''}
        options={[
          { label: 'Timeboxed tasks', value: 'timeboxed' },
          { label: 'Flexible timing', value: 'untimeboxed' }
        ]}
        onChange={(event) => handleNestedChange({
          target: { name: 'layout_preference.timeboxed', value: event.target.value }
        })}
        marginY={8}
      />

      <Button appearance="primary" onClick={submitForm} marginTop={16} isLoading={isLoading}>
        Update Schedule
      </Button>
    </Pane>
  );
};

export default DashboardLeftCol;