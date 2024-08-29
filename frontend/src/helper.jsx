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
      const response = await fetch(`${API_BASE_URL}/categorize_task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task: newTask })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json();
      
      setFormData(prevData => ({
        ...prevData,
        tasks: [...prevData.tasks, result]
      }));
      setNewTask('');
      toaster.success('Task added successfully');
    } catch (error) {
      console.error("Error adding task:", error);
      toaster.danger('Failed to add task');
    }
  }
};

export const handleUpdateTask = (setFormData, toaster) => async (updatedTask) => {
  try {
    const response = await fetch(`${API_BASE_URL}/categorize_task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ task: updatedTask.text })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const result = await response.json();

    setFormData(prevData => ({
      ...prevData,
      tasks: prevData.tasks.map(task => 
        task.id === updatedTask.id 
          ? { 
              ...task, 
              text: updatedTask.text, 
              categories: result.categories // Use the categories from the API response
            }
          : task
      )
    }));

    toaster.success('Task updated successfully');
  } catch (error) {
    console.error("Error updating task:", error);
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
  let taskStack = [];
  let tasks = [];
  let sectionStartIndex = 0;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine.match(/^(Morning|Afternoon|Evening)/i)) {
      currentSection = trimmedLine;
      sectionStartIndex = index;
      tasks.push({
        id: `section-${index}`,
        text: trimmedLine,
        is_section: true,
        section: currentSection,
        parent_id: null,
        level: 0,
        section_index: 0,
        type: 'section'
      });
    } else if (trimmedLine) {
      const indentLevel = line.search(/\S|$/) / 2; // Assuming 2 spaces per indent level
      const task = {
        id: `task-${index}`,
        text: trimmedLine.replace(/^□ /, ''),
        completed: false,
        is_subtask: indentLevel > 0,
        is_section: false,
        section: currentSection,
        parent_id: null,
        level: indentLevel,
        section_index: index - sectionStartIndex,
        type: 'task'
      };

      while (taskStack.length > indentLevel) {
        taskStack.pop();
      }

      if (taskStack.length > 0) {
        task.parent_id = taskStack[taskStack.length - 1].id;
      }

      taskStack.push(task);
      tasks.push(task);
    }
  });

  return tasks;
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
    const unfinishedTasks = currentSchedule.filter(item => item && !item.completed && !item.is_section);

    // Create a map of recurring tasks to their previous sections
    const recurringTaskSections = new Map();
    [...previousSchedules, currentSchedule].forEach(schedule => {
      schedule.forEach(item => {
        if (item && result.recurring_tasks.includes(item.text)) {
          recurringTaskSections.set(item.text, item.section);
        }
      });
    });

    // Combine unfinished and recurring tasks, avoiding duplication
    const combinedTasks = new Map();

    // First, add all unfinished tasks
    unfinishedTasks.forEach(task => {
      combinedTasks.set(task.text, { ...task, isRecurring: false });
    });

    // Then, add recurring tasks that aren't already in the unfinished tasks
    result.recurring_tasks.forEach(taskText => {
      if (!combinedTasks.has(taskText)) {
        const taskSection = recurringTaskSections.get(taskText) || 'morning';
        combinedTasks.set(taskText, {
          text: taskText,
          completed: false,
          isRecurring: true,
          section: taskSection
        });
      }
    });

    let newSchedule = [];

    if (isStructured) {
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
        newSchedule.push({
          id: `section-${section.id}`,
          text: section.text,
          is_section: true,
          section: section.id,
          parent_id: null,
          level: 0,
          section_index: 0,
          type: 'section'
        });
        section.tasks.forEach((task, index) => {
          newSchedule.push({
            ...task,
            id: `task-${section.id}-${index}-next`,
            completed: false,
            section: section.id,
            is_subtask: task.level > 0,
            is_section: false,
            parent_id: null,
            level: task.level || 0,
            section_index: index,
            type: 'task'
          });
        });
      });
    } else {
      // For unstructured layout, add tasks in their original order
      newSchedule = Array.from(combinedTasks.values()).map((task, index) => ({
        ...task,
        id: `task-${index}-next`,
        completed: false,
        is_subtask: task.level > 0,
        is_section: false,
        parent_id: null,
        level: task.level || 0,
        section_index: index,
        type: 'task'
      }));
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

// Helper function to get section index (unchanged)
const getSectionIndex = (section) => {
  if (!section) return -1;
  const lowerSection = section.toLowerCase();
  if (lowerSection.includes('morning')) return 0;
  if (lowerSection.includes('afternoon')) return 1;
  if (lowerSection.includes('evening') || lowerSection.includes('night')) return 2;
  return -1;
};
