const API_BASE_URL = 'http://localhost:8000/api'; 

export const handleSimpleInputChange = (setFormData) => (event) => {
  const { name, value } = event.target;
  setFormData(prevData => ({ ...prevData, [name]: value }));
};

export const handleNestedInputChange = (setFormData) => (event) => {
  const { name, value } = event.target;
  const [category, subCategory] = name.split('.');
  setFormData(prevData => ({
    ...prevData,
    [category]: {
      ...prevData[category],
      [subCategory]: value
    }
  }));
};

export const submitFormData = async (formData, setLoading, setError, setResponse) => {
  setLoading(true);
  setError(null);
  console.log("Form Data Before Submission:", formData); // Log form data before submission

  try {
    const response = await fetch(`${API_BASE_URL}/submit_data`, {  // Replace with your actual backend URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    setLoading(false);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    console.log("Response from server:", data);
    setResponse(data.schedule); // Store the schedule in the state
  } catch (error) {
    setLoading(false);
    console.error("Error submitting form:", error);
    setError("There was an error submitting the form. Please try again.");
    setResponse(null); // Clear any previous response
  }
};

export const addTask = async (taskText) => {
  console.log("Adding new task:", taskText);

  try {
    const response = await fetch(`${API_BASE_URL}/categorize_task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ task: taskText })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    console.log("Response from server:", data);

    return {
      success: true,
      category: data.category
    };
  } catch (error) {
    console.error("Error adding task:", error);
    return {
      success: false,
      error: "There was an error adding the task. Please try again."
    };
  }
};

export const updateTask = async (taskText) => {
  console.log("Updating task:", taskText);

  try {
    const response = await fetch(`${API_BASE_URL}/categorize_task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ task: taskText })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    console.log("Response from server:", data);

    return {
      success: true,
      category: data.category
    };
  } catch (error) {
    console.error("Error updating task:", error);
    return {
      success: false,
      error: "There was an error updating the task. Please try again."
    };
  }
};

export const handleAddTask = (setFormData, newTask, setNewTask, toaster) => async () => {
  if (newTask.trim()) {
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
      toaster.danger('Failed to add task');
    }
  }
};

export const handleUpdateTask = (setFormData, toaster) => async (updatedTask) => {
  try {
    const result = await updateTask(updatedTask.text);
    if (result.success) {
      setFormData(prevData => ({
        ...prevData,
        tasks: prevData.tasks.map(task => 
          task.id === updatedTask.id ? { ...task, text: updatedTask.text, category: result.category } : task
        )
      }));
      toaster.success('Task updated successfully');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    toaster.danger('Failed to update task');
  }
};

export const handleDeleteTask = (setFormData, toaster) => (taskId) => {
  setFormData(prevData => ({
    ...prevData,
    tasks: prevData.tasks.filter(task => task.id !== taskId)
  }));
  toaster.notify('Task deleted');
};