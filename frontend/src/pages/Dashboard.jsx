import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Pane, Heading, Button, toaster } from 'evergreen-ui';
import {
  handleAddTask,
  handleUpdateTask,
  handleDeleteTask,
  parseScheduleToTasks,
  generateNextDaySchedule,
  submitFormData,
  extractSchedule,
  cleanupTasks,
  updatePriorities,
  handleEnergyChange 
} from '../helper';
import { categorizeTask } from '../../lib/api';
import DashboardLeftCol from '../components/DashboardLeftCol';
import EditableSchedule from '../components/EditableSchedule';

const initialPriorities = [
  { id: 'health', name: 'Health' },
  { id: 'relationships', name: 'Relationships' },
  { id: 'fun_activities', name: 'Fun Activities' },
  { id: 'ambitions', name: 'Ambitions' }
];

const Dashboard = ({ formData = {}, setFormData, response, setResponse }) => {
  const [newTask, setNewTask] = useState('');
  const [scheduleDays, setScheduleDays] = useState([]);
  const [priorities, setPriorities] = useState(initialPriorities);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleSimpleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  }, [setFormData]);

  const handleNestedChange = useCallback((e) => {
    const { name, value } = e.target;
    const [category, subCategory] = name.split('.');
    setFormData(prevData => ({
      ...prevData,
      [category]: {
        ...prevData[category],
        [subCategory]: value
      }
    }));
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
    updatePriorities(setFormData, newPriorities);
  }, [setFormData]);

  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await submitFormData(formData);

      let scheduleContent = extractSchedule(result);
      console.log("Extracted schedule content:", scheduleContent);

      if (!scheduleContent) {
        toaster.danger('No valid schedule found in the response');
        return;
      }

      setResponse(scheduleContent);
      
      const parsedTasks = await parseScheduleToTasks(scheduleContent, formData.tasks || [], formData.layout_preference);

      const cleanedTasks = await cleanupTasks(parsedTasks, formData.tasks || []);

      setScheduleDays([cleanedTasks]);
      setCurrentDayIndex(0);
      toaster.success('Schedule updated successfully');
    } catch (error) {
      console.error("Error submitting form:", error);
      toaster.danger('Failed to update schedule. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [formData, setResponse]);

  useEffect(() => {
    if (response && formData) {
      const parsedTasks = parseScheduleToTasks(response);
      const cleanedTasks = cleanupTasks(parsedTasks, formData.tasks || []);
      setScheduleDays([cleanedTasks]);
      setCurrentDayIndex(0);
    }
  }, [response, formData]);

  const handleScheduleTaskUpdate = useCallback(async (updatedTask) => {
    if (updatedTask.text !== scheduleDays[currentDayIndex]?.find(task => task.id === updatedTask.id)?.text) {
      const categorizedTask = await categorizeTask(updatedTask.text);
      updatedTask.categories = categorizedTask.categories;
    }

    setScheduleDays(prevDays => {
      const newDays = [...prevDays];
      newDays[currentDayIndex] = newDays[currentDayIndex]?.map(task => 
        task.id === updatedTask.id ? { ...task, ...updatedTask, categories: updatedTask.categories || [] } : task
      ) || [];
      return newDays;
    });
  }, [currentDayIndex, scheduleDays]);

  const handleScheduleTaskDelete = useCallback((taskId) => {
    setScheduleDays(prevDays => {
      const newDays = [...prevDays];
      newDays[currentDayIndex] = newDays[currentDayIndex]?.filter(task => task.id !== taskId) || [];
      return newDays;
    });
  }, [currentDayIndex]);

  const handleScheduleReorder = useCallback((reorderedItems) => {
    setScheduleDays(prevDays => {
      const newDays = [...prevDays];
      newDays[currentDayIndex] = reorderedItems.map((item, index) => ({
        ...item,
        is_section: item.type === 'section',
        section_index: index
      }));
      return newDays;
    });
  }, [currentDayIndex]);

  const handleNextDay = useCallback(async () => {
    const currentSchedule = scheduleDays[currentDayIndex];
    if (!Array.isArray(currentSchedule)) {
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
        setScheduleDays(prevDays => [...prevDays, result.schedule]);
        setCurrentDayIndex(prevIndex => prevIndex + 1);
      } else {
        toaster.danger(result.error);
      }
    } catch (error) {
      console.error("Error generating next day schedule:", error);
      toaster.danger("Failed to generate next day's schedule. Please try again.");
    }
  }, [scheduleDays, currentDayIndex, formData]);

  const handlePreviousDay = useCallback(() => {
    if (currentDayIndex > 0) {
      setCurrentDayIndex(prevIndex => prevIndex - 1);
    }
  }, [currentDayIndex]);

  const renderSchedule = useMemo(() => (
    <Pane padding={16} background="white" borderRadius={4} elevation={1}>
      <EditableSchedule
        tasks={scheduleDays[currentDayIndex] || []}
        onUpdateTask={handleScheduleTaskUpdate}
        onDeleteTask={handleScheduleTaskDelete}
        onReorderTasks={handleScheduleReorder}
        layoutPreference={formData?.layout_preference?.subcategory || ''}
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
  ), [scheduleDays, currentDayIndex, handlePreviousDay, handleScheduleTaskUpdate, handleScheduleTaskDelete, handleScheduleReorder, handleNextDay, formData?.layout_preference?.subcategory]);

  const handleEnergyChangeCallback = useCallback((value) => {
    handleEnergyChange(setFormData)(value);
  }, [setFormData]);

  return (
    <Pane display="flex" height="100vh">
      {formData && (
        <DashboardLeftCol
          formData={formData}
          newTask={newTask}
          setNewTask={setNewTask}
          priorities={priorities}
          handleSimpleChange={handleSimpleChange}
          handleNestedChange={handleNestedChange}
          updateTask={updateTask}
          deleteTask={deleteTask}
          addTask={addTask}
          handleReorder={handleReorder}
          submitForm={handleSubmit}
          isLoading={isLoading}
          handleEnergyChange={handleEnergyChangeCallback}
        />
      )}
      <Pane width="70%" padding={16} background="tint2" overflowY="auto">
        <Heading size={700} marginBottom={16}>Generated Schedule</Heading>
        {scheduleDays.length > 0 && scheduleDays[currentDayIndex]?.length > 0 ? (
          renderSchedule
        ) : (
          <Heading size={500} marginTop={32}>
            {response ? 'Processing your schedule...' : 'Update your inputs and click "Update Schedule" to generate a schedule'}
          </Heading>
        )}
      </Pane>
    </Pane>
  );
};

export async function getStaticProps() {
  return {
    props: {
      formData: {
        tasks: [],
        layout_preference: { subcategory: '' },
        energy_patterns: [],
        priorities: {},
        // ... other default properties ...
      },
      response: null,
    },
  };
}

export default Dashboard;