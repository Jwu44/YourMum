import React, { useState } from 'react';
import { Pane, Heading, TextInput, toaster } from 'evergreen-ui';
import { useNavigate } from 'react-router-dom';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';
import TaskItem from '../components/TaskItem';
import { handleAddTask, handleUpdateTask, handleDeleteTask } from '../helper';

const Tasks = ({ formData, setFormData }) => {
  const navigate = useNavigate();
  const [newTask, setNewTask] = useState('');

  const addTask = handleAddTask(setFormData, newTask, setNewTask, toaster);
  const updateTask = handleUpdateTask(setFormData, toaster);
  const deleteTask = handleDeleteTask(setFormData, toaster);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTask();
    }
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
            onUpdate={updateTask}
            onDelete={deleteTask}
          />
        ))}
        <Pane display="flex" alignItems="center" marginY={8}>
          <TextInput
            placeholder="+ New task"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={handleKeyPress}
            onBlur={addTask}
            width="100%"
          />
        </Pane>
      </Pane>
      <OnboardingNav onBack={handlePrevious} onNext={handleNext} />
    </CenteredPane>
  );
};

export default Tasks;