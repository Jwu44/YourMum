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

export const parseScheduleToTasks = (scheduleText) => {
  if (!scheduleText || typeof scheduleText !== 'string') {
    console.error('Invalid schedule text:', scheduleText);
    return [];
  }

  const lines = scheduleText.split('\n');
  let currentSection = '';
  return lines.reduce((tasks, line, index) => {
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
    return tasks;
  }, []);
};

export const generateNextDaySchedule = async (currentSchedule, userData, previousSchedules = []) => {
  console.log("Generating next day schedule");

  try {
    // Prepare the data for the API call
    const data = {
      current_schedule: currentSchedule.map(item => item.text || item),
      previous_schedules: previousSchedules.map(schedule => schedule.map(item => item.text || item))
    };

    // Make the API call to identify recurring tasks
    const response = await fetch(`${API_BASE_URL}/identify_recurring_tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const result = await response.json();
    console.log("Recurring tasks identified:", result.recurring_tasks);

    const { layout_preference } = userData;
    const isStructured = layout_preference.subcategory.startsWith('structured');

    // Filter out unfinished tasks
    const unfinishedTasks = currentSchedule.filter(item => item && !item.completed && !item.isSection);

    // Create a map of recurring tasks to their previous sections
    const recurringTaskSections = new Map();
    [...previousSchedules, currentSchedule].reverse().forEach(schedule => {
      schedule.forEach(item => {
        if (item && result.recurring_tasks.includes(item.text) && !recurringTaskSections.has(item.text)) {
          recurringTaskSections.set(item.text, item.section);
          console.log(`Recurring task "${item.text}" assigned to section: ${item.section}`);
        }
      });
    });

    // Create a new schedule
    let newSchedule = [];

    // Function to get section index
    const getSectionIndex = (section) => {
      if (!section) return -1;
      const lowerSection = section.toLowerCase();
      if (lowerSection.includes('morning')) return 0;
      if (lowerSection.includes('afternoon')) return 1;
      if (lowerSection.includes('evening') || lowerSection.includes('night')) return 2;
      return -1;
    };

    // Combine unfinished and recurring tasks, prioritizing unfinished tasks
    const combinedTasks = new Map();

    // First, add all unfinished tasks
    unfinishedTasks.forEach(task => {
      combinedTasks.set(task.text, task);
    });

    // Then, add recurring tasks that aren't already in the unfinished tasks
    result.recurring_tasks.forEach(taskText => {
      if (!combinedTasks.has(taskText)) {
        const taskSection = recurringTaskSections.get(taskText);
        let standardSection = 'morning';
        if (taskSection) {
          const sectionIndex = getSectionIndex(taskSection);
          if (sectionIndex !== -1) {
            standardSection = ['morning', 'afternoon', 'evening'][sectionIndex];
          }
        }
        combinedTasks.set(taskText, {
          text: taskText,
          completed: false,
          isRecurring: true,
          section: standardSection
        });
      }
    });

    if (isStructured) {
      // Define sections with emojis
      const sections = [
        { id: 'morning', text: 'Morning 🌅', tasks: [] },
        { id: 'afternoon', text: 'Afternoon 🌇', tasks: [] },
        { id: 'evening', text: 'Evening 💤', tasks: [] }
      ];

      // Categorize tasks
      Array.from(combinedTasks.values()).forEach(task => {
        const sectionIndex = getSectionIndex(task.section);
        if (sectionIndex !== -1) {
          sections[sectionIndex].tasks.push(task);
        } else {
          console.warn(`Task "${task.text}" couldn't be assigned to a section. Defaulting to morning.`);
          sections[0].tasks.push({...task, section: 'morning'});
        }
      });

      // Build new schedule
      sections.forEach(section => {
        newSchedule.push({ id: `section-${section.id}`, text: section.text, isSection: true });
        section.tasks.forEach((task, index) => {
          newSchedule.push({
            ...task,
            id: `task-${section.id}-${index}-next`,
            completed: false,
            section: section.id
          });
        });
      });
    } else {
      // For unstructured layout, add tasks in their original order
      Array.from(combinedTasks.values()).forEach((task, index) => {
        newSchedule.push({
          ...task,
          id: `task-${index}-next`,
          completed: false
        });
      });
    }

    return {
      success: true,
      schedule: newSchedule
    };

  } catch (error) {
    console.error("Error generating next day schedule:", error);
    return {
      success: false,
      error: "There was an error generating the next day's schedule. Please try again."
    };
  }
};