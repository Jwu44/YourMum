import React, { useState } from 'react';
import { Pane, Heading, TextInput, toaster } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';
import TaskItem from '../components/TaskItem';
import { addTask, updateTask } from '../helper.jsx';

const Tasks = ({ formData, setFormData }) => {
  const navigate = useNavigate();
  const [newTask, setNewTask] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAddTask = async () => {
    if (newTask.trim()) {
      setIsLoading(true);
      setError(null);

      try {
        const result = await addTask(newTask);
        if (result.success) {
          const newTaskId = Date.now();
          setFormData(prevData => ({
            ...prevData,
            tasks: [...prevData.tasks, { id: newTaskId, text: newTask.trim(), category: result.category }]
          }));
          setNewTask('');
          toaster.success('Task added successfully');
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        setError(error.message);
        toaster.danger('Failed to add task');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  };

  const handleUpdateTask = async (updatedTask) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await updateTask(updatedTask.text);
      if (result.success) {
        setFormData(prevData => ({
          ...prevData,
          tasks: prevData.tasks.map(task => 
            task.id === updatedTask.id ? { ...updatedTask, category: result.category } : task
          )
        }));
        toaster.success('Task updated successfully');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setError(error.message);
      toaster.danger('Failed to update task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = (taskId) => {
    setFormData(prevData => ({
      ...prevData,
      tasks: prevData.tasks.filter(task => task.id !== taskId)
    }));
    toaster.notify('Task deleted');
  };

  const handleNext = () => {
    navigate('/energy-levels');
  };

  const handlePrevious = () => {
    navigate('/work-times');
  };

  return (
    <CenteredPane>
      <Heading size={700} marginBottom={12} textAlign="center">
        What tasks do you have for today?
      </Heading>
      <Pane>
        {formData.tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
          />
        ))}
        <Pane display="flex" alignItems="center" marginY={8}>
          <TextInput
            placeholder="+ New task"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={handleKeyPress}
            onBlur={handleAddTask}
            width="100%"
            disabled={isLoading}
          />
        </Pane>
      </Pane>
      {error && <Pane marginY={8} color="red500">{error}</Pane>}
      <OnboardingNav onBack={handlePrevious} onNext={handleNext} />
    </CenteredPane>
  );
};

export default Tasks;