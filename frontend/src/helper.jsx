import { categorizeTask } from './api';
import { v4 as uuidv4 } from 'uuid'; // Add this import

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

export const submitFormData = async (formData) => {
  console.log("Form Data Before Submission:", formData);

  try {
    const response = await fetch(`${API_BASE_URL}/submit_data`, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    console.log("Response from server:", data);
    
    // Return the entire data object
    return data;
  } catch (error) {
    console.error("Error submitting form:", error);
    throw error;
  }
};

export const extractSchedule = (response) => {  
  if (typeof response === 'object' && response.schedule) {
    return response.schedule;
  }
  
  if (typeof response === 'string') {
    const scheduleRegex = /<schedule>([\s\S]*?)<\/schedule>/;
    const match = response.match(scheduleRegex);
    if (match) {
      return match[1].trim();
    }
  }
  
  console.warn("No valid schedule found in the response.");
  return '';
};

export const handleAddTask = (setFormData, newTask, setNewTask, toaster) => async () => {
  if (newTask.trim()) {
    try {
      const result = await categorizeTask(newTask);
      console.log('Categorization result:', result);

      const newTaskObject = {
        id: uuidv4(),
        text: newTask.trim(),
        categories: result.categories || [],
        completed: false
      };

      setFormData(prevData => ({
        ...prevData,
        tasks: [...prevData.tasks, newTaskObject]
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

export const parseScheduleToTasks = async (scheduleText, inputTasks = [], layoutPreference) => {
  if (!scheduleText || typeof scheduleText !== 'string') {
    console.error('Invalid schedule text:', scheduleText);
    return [];
  }

  const scheduleRegex = /<schedule>([\s\S]*?)<\/schedule>/;
  const match = scheduleText.match(scheduleRegex);
  if (!match) {
    console.error('No <schedule> tags found in the text');
    return [];
  }

  const scheduleContent = match[1].trim();
  const lines = scheduleContent.split('\n');
  let currentSection = '';
  let taskStack = [];
  let tasks = [];
  let sectionStartIndex = 0;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmedLine = line.trim();
    if (trimmedLine.match(/^(Early Morning|Morning|Afternoon|Arvo|Evening|Work Day|Night|High|Medium|Low|Fun|Ambition|Relationships|Work|Exercise)/i)) {
      currentSection = trimmedLine;
      sectionStartIndex = index;
      tasks.push({
        id: uuidv4(), // Generate a unique ID
        text: trimmedLine,
        is_section: true,
        section: currentSection,
        parent_id: null,
        level: 0,
        section_index: 0,
        type: 'section',
        categories: []
      });
    } else if (trimmedLine) {
      const indentLevel = line.search(/\S|$/) / 2;
      let taskText = trimmedLine.replace(/^□ /, '');
      
      // Extract time if present and layout preference is not untimeboxed
      let startTime = null;
      let endTime = null;
      if (layoutPreference.timeboxed !== 'untimeboxed') {
        const timeMatch = taskText.match(/^(\d{1,2}:\d{2}(?:am|pm)?) - (\d{1,2}:\d{2}(?:am|pm)?):?\s*(.*)/i);
        if (timeMatch) {
          [, startTime, endTime, taskText] = timeMatch;
        }
      }

      // Find matching task with similar keywords
      const matchingTask = inputTasks.find(t => t && taskText.toLowerCase().includes(t.text.toLowerCase()));
      let categories = matchingTask ? matchingTask.categories : [];

      // If no categories found, categorize the task
      if (categories.length === 0) {
        console.log("no categories found")
        const categorizedTask = await categorizeTask(taskText);
        categories = categorizedTask.categories;
      }

      const task = {
        id: uuidv4(), // Generate a unique ID
        text: taskText,
        completed: false,
        is_subtask: indentLevel > 0,
        is_section: false,
        section: currentSection,
        parent_id: null,
        level: indentLevel,
        section_index: index - sectionStartIndex,
        type: 'task',
        categories: categories,
        start_time: startTime,
        end_time: endTime
      };

      // Log the created task
      console.log("Created Task:", task);
      
      while (taskStack.length > indentLevel) {
        taskStack.pop();
      }

      if (taskStack.length > 0) {
        task.parent_id = taskStack[taskStack.length - 1].id;
      }

      taskStack.push(task);
      tasks.push(task);
    }
  }

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

export const cleanupTasks = async (parsedTasks, existingTasks) => {
  // Assuming cleanupTasks is a function that processes parsedTasks
  // and returns a cleaned version of the tasks.
  // Modify this function to ensure categories are retained.

  const cleanedTasks = parsedTasks.map(task => {
    // Find the matching task in existingTasks to retain categories
    const matchingTask = existingTasks.find(t => t && t.id === task.id);
    return {
      ...task,
      categories: task.categories || (matchingTask ? matchingTask.categories : [])
    };
  });

  return cleanedTasks;
};

export const updatePriorities = (setFormData, priorities) => {
  const updatedPriorities = priorities.reduce((acc, priority, index) => {
    acc[priority.id] = index + 1;
    return acc;
  }, {});
  setFormData(prevData => ({ ...prevData, priorities: updatedPriorities }));
};

export const handleEnergyChange = (setFormData) => (value) => {
  setFormData(prevData => {
    const currentPatterns = prevData.energy_patterns || [];
    const updatedPatterns = currentPatterns.includes(value)
      ? currentPatterns.filter(pattern => pattern !== value)
      : [...currentPatterns, value];
    
    return {
      ...prevData,
      energy_patterns: updatedPatterns
    };
  });
};