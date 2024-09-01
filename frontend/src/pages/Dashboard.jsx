import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Pane, Heading, TextInputField, SelectField, Button, toaster } from 'evergreen-ui';
import {
  handleSimpleInputChange,
  handleNestedInputChange,
  handleAddTask,
  handleUpdateTask,
  handleDeleteTask,
  parseScheduleToTasks,
  generateNextDaySchedule
} from '../helper';
import TaskItem from '../components/TaskItem';
import PriosDraggableList from '../components/PriosDraggableList';
import EditableSchedule from '../components/EditableSchedule';

const initialPriorities = [
  { id: 'health', name: 'Health' },
  { id: 'relationships', name: 'Relationships' },
  { id: 'fun_activities', name: 'Fun Activities' },
  { id: 'ambitions', name: 'Ambitions' }
];

const Dashboard = ({ formData, setFormData, response, submitForm }) => {
  const [newTask, setNewTask] = useState('');
  const [scheduleDays, setScheduleDays] = useState([]);
  const [priorities, setPriorities] = useState(initialPriorities);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  const handleSimpleChange = useCallback((e) => {
    handleSimpleInputChange(setFormData)(e);
  }, [setFormData]);

  const handleNestedChange = useCallback((e) => {
    handleNestedInputChange(setFormData)(e);
  }, [setFormData]);

  const addTask = useCallback(() => {
    handleAddTask(setFormData, newTask, setNewTask, toaster)();
  }, [setFormData, newTask, setNewTask]);

  const updateTask = useCallback((updatedTask) => {
    handleUpdateTask(setFormData, toaster)(updatedTask);
  }, [setFormData]);

  const deleteTask = useCallback((taskId) => {
    handleDeleteTask(setFormData, toaster)(taskId);
  }, [setFormData]);

  const handleReorder = useCallback((newPriorities) => {
    setPriorities(newPriorities);
  }, []);

  const extractSchedule = useCallback((fullResponse) => {
    const scheduleRegex = /<schedule>([\s\S]*?)<\/schedule>/;
    const match = fullResponse.match(scheduleRegex);
    return match ? match[1].trim() : '';
  }, []);

  useEffect(() => {
    if (response) {
      const scheduleContent = extractSchedule(response);
      const parsedTasks = parseScheduleToTasks(scheduleContent);
      setScheduleDays([parsedTasks]);
      setCurrentDayIndex(0);
    }
  }, [response, extractSchedule]);

  useEffect(() => {
    const updatedPriorities = priorities.reduce((acc, priority, index) => {
      acc[priority.id] = index + 1;
      return acc;
    }, {});
    setFormData(prevData => ({ ...prevData, priorities: updatedPriorities }));
  }, [priorities, setFormData]);

  const handleScheduleTaskUpdate = useCallback((updatedTask) => {
    console.log('Updating task:', updatedTask);
    setScheduleDays(prevDays => {
      const newDays = [...prevDays];
      const updateTaskRecursive = (tasks) => {
        return tasks.map(task => {
          if (task.id === updatedTask.id) {
            return { ...task, ...updatedTask, is_subtask: task.level > 0 };
          }
          if (task.children) {
            return { ...task, children: updateTaskRecursive(task.children) };
          }
          return task;
        });
      };
      newDays[currentDayIndex] = updateTaskRecursive(newDays[currentDayIndex]);
      return newDays;
    });
  }, [currentDayIndex]);

  const handleScheduleTaskDelete = useCallback((taskId) => {
    setScheduleDays(prevDays => {
      const newDays = [...prevDays];
      const deleteTaskRecursive = (tasks) => {
        return tasks.filter(task => {
          if (task.id === taskId) {
            return false;
          }
          if (task.children) {
            task.children = deleteTaskRecursive(task.children);
          }
          return true;
        });
      };
      newDays[currentDayIndex] = deleteTaskRecursive(newDays[currentDayIndex]);
      return newDays;
    });
  }, [currentDayIndex]);

  const handleScheduleReorder = useCallback((reorderedItems) => {
    console.log('Reordered items:', reorderedItems);
    setScheduleDays(prevDays => {
      const newDays = [...prevDays];
      newDays[currentDayIndex] = reorderedItems.map((item, index) => {
        const updatedItem = {
          ...item,
          is_section: item.type === 'section',
          section_index: index // Update section_index based on new order
        };
        console.log('Updated item:', updatedItem);
        return updatedItem;
      });
      return newDays;
    });
  }, [currentDayIndex]);

  const handleNextDay = useCallback(async () => {
    const currentSchedule = scheduleDays[currentDayIndex];
    
    if (!Array.isArray(currentSchedule)) {
      console.error("Current schedule is not an array:", currentSchedule);
      toaster.danger("Invalid schedule data. Please try again.");
      return;
    }
  
    try {
      const result = await generateNextDaySchedule(
        currentSchedule, 
        formData, 
        scheduleDays.slice(0, currentDayIndex + 1)
      );
      
      if (result.success) {
        setScheduleDays(prevDays => {
          const updatedDays = [...prevDays];
          updatedDays[currentDayIndex + 1] = result.schedule;
          return updatedDays;
        });
        setCurrentDayIndex(prevIndex => prevIndex + 1);
      } else {
        toaster.danger(result.error);
      }
    } catch (error) {
      console.error("Error generating next day schedule:", error);
      toaster.danger("Failed to generate next day's schedule. Please try again.");
    } finally {
    }
  }, [scheduleDays, currentDayIndex, formData]);

  const handlePreviousDay = useCallback(() => {
    if (currentDayIndex > 0) {
      setCurrentDayIndex(prevIndex => prevIndex - 1);
    }
  }, [currentDayIndex]);

  const renderLeftColumn = useMemo(() => (
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
        onKeyPress={(e) => e.key === 'Enter' && addTask()}
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
  ), [formData, newTask, priorities, handleSimpleChange, handleNestedChange, updateTask, deleteTask, addTask, handleReorder, submitForm]);

  const renderSchedule = useMemo(() => (
    <Pane padding={16} background="white" borderRadius={4} elevation={1}>
      <EditableSchedule
        tasks={scheduleDays[currentDayIndex] || []}
        onUpdateTask={(updatedTask) => {
          console.log('Updated task:', updatedTask);
          handleScheduleTaskUpdate(updatedTask);
        }}
        onDeleteTask={handleScheduleTaskDelete}
        onReorderTasks={handleScheduleReorder}
        isStructured={formData.layout_preference.subcategory.startsWith('structured')}
      />
      <Pane display="flex" justifyContent="space-between" marginTop={16}>
        <Button
          appearance="primary"
          onClick={handlePreviousDay}
          disabled={currentDayIndex === 0}
        >
          Previous
        </Button>
        <Button 
          appearance="primary"
          onClick={handleNextDay}>
          Next Day
        </Button>
      </Pane>
    </Pane>
  ), [scheduleDays, currentDayIndex, handlePreviousDay, handleScheduleTaskUpdate, handleScheduleTaskDelete, handleScheduleReorder, handleNextDay, formData.layout_preference.subcategory]);

  return (
    <Pane display="flex" height="100vh">
      {renderLeftColumn}
      <Pane width="70%" padding={16} background="tint2" overflowY="auto">
        <Heading size={700} marginBottom={16}>Generated Schedule</Heading>
        {scheduleDays.length > 0 ? (
          renderSchedule
        ) : (
          <Heading size={500} marginTop={32}>
            {response ? 'Generating your schedule...' : 'Update your inputs and click "Update Schedule" to generate a schedule'}
          </Heading>
        )}
      </Pane>
    </Pane>
  );
};

export default React.memo(Dashboard);