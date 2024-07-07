import { useState, useEffect }  from 'react';
import { Pane, Heading, TextInputField, SelectField, Button, toaster } from 'evergreen-ui';
import { handleSimpleInputChange, handleNestedInputChange, handleAddTask, handleUpdateTask, handleDeleteTask } from '../helper';
import TaskItem from '../components/TaskItem';
import PriosDraggableList from '../components/PriosDraggableList';

const Dashboard = ({ formData, setFormData, response, submitForm }) => {
  const [newTask, setNewTask] = useState('');
  const [extractedSchedule, setExtractedSchedule] = useState('');
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

  useEffect(() => {
    if (response) {
      const scheduleContent = extractSchedule(response);
      setExtractedSchedule(scheduleContent);
    }
  }, [response]);

  useEffect(() => {
    const updatedPriorities = priorities.reduce((acc, priority, index) => {
      acc[priority.id] = index + 1; // Assign values 1, 2, 3, 4 based on position (top to bottom)
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

  const extractSchedule = (fullResponse) => {
    const scheduleRegex = /<schedule>([\s\S]*?)<\/schedule>/;
    const match = fullResponse.match(scheduleRegex);
    return match ? match[1].trim() : 'Schedule not found';
  };

  const formatSchedule = (scheduleText) => {
    const sections = scheduleText.split('\n\n');
    return sections.map((section, index) => (
      <div key={index} className="schedule-section">
        <Heading size={500} marginTop={16} marginBottom={8}>{section.split('\n')[0]}</Heading>
        <ul>
          {section.split('\n').slice(1).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    ));
  };

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

      {/* Right Column: Display Generated Schedule */}
      <Pane width="70%" padding={16} background="tint2" overflowY="auto">
        <Heading size={700} marginBottom={16}>Generated Schedule</Heading>
        {extractedSchedule ? (
          <Pane padding={16} background="white" borderRadius={4} elevation={1}>
            {formatSchedule(extractedSchedule)}
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