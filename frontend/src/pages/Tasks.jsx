import React, { useState } from 'react';
import { Pane, Heading, TextInput, toaster, Paragraph } from 'evergreen-ui';
import { useRouter } from 'next/router';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';
import TaskItem from '../components/TaskItem';
import { handleAddTask, handleUpdateTask, handleDeleteTask } from '../helper';

const Tasks = ({ formData, setFormData }) => {
  const router = useRouter();
  const [newTask, setNewTask] = useState('');

  const addTask = handleAddTask(setFormData, newTask, setNewTask, toaster);

  const updateTask = (updatedTask) => {
    handleUpdateTask(setFormData, toaster)(updatedTask);
  };

  const updateTaskCategories = (taskId, newCategories) => {
    setFormData(prevData => ({
      ...prevData,
      tasks: prevData.tasks.map(task => 
        task.id === taskId
          ? { ...task, categories: newCategories }
          : task
      )
    }));
  };

  const deleteTask = handleDeleteTask(setFormData, toaster);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTask();
    }
  };

  const handleNext = () => {
    router.push('/energy-patterns');
  };

  const handlePrevious = () => {
    router.push('/priorities');
  };

  return (
    <CenteredPane>
      <Heading size={700} marginBottom={12} textAlign="center">
        What tasks do you have for today?
      </Heading>
      <Paragraph marginBottom={16}>
        There are 5 categories of task: Exercise, Relationships, Fun, Ambition and Work. You can assign multiple categories to each task.
      </Paragraph>
      <Pane>
        {formData.tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onUpdate={updateTask}
            onUpdateCategories={updateTaskCategories}
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

export async function getStaticProps() {
  return {
    props: {
      formData: {
        tasks: [],
      },
    },
  };
}

export default Tasks;