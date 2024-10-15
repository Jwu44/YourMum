import { categorizeTask } from './api';
import { v4 as uuidv4 } from 'uuid';
import type { FormData } from './types';
import { Task, FormAction, LayoutPreference } from './types';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export const handleSimpleInputChange = (setFormData: React.Dispatch<React.SetStateAction<FormData>>) => 
  (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

export const handleNestedInputChange = (setFormData: React.Dispatch<React.SetStateAction<FormData>>) => 
  (event: React.ChangeEvent<HTMLInputElement>) => {
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

export const submitFormData = async (formData: FormData) => {
  console.log("Form Data Before Submission:", formData);

  try {
    const response = await fetch(`${API_BASE_URL}/submit_data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json();
    console.log("Response from server:", data);
    return data;
  } catch (error) {
    console.error("Error submitting form:", error);
    throw error;
  }
};

export const extractSchedule = (response: any): string => {
  if (response && typeof response === 'object' && response.schedule) {
    return response.schedule;
  }
  
  if (typeof response === 'string') {
    const scheduleRegex = /<schedule>([\s\S]*?)<\/schedule>/;
    const match = response.match(scheduleRegex);
    if (match) return match[1].trim();
  }
  
  console.warn("No valid schedule found in the response.");
  return '';
};

export const handleAddTask = async (tasks: Task[], newTask: string, categories: string[]) => {
  const result = await categorizeTask(newTask);
  const newTaskObject: Task = {
    id: uuidv4(),
    text: newTask.trim(),
    categories: result.categories || categories,
    is_subtask: false,
    completed: false,
    is_section: false,
    section: null,
    parent_id: null,
    level: 0,
    section_index: tasks.length,
    type: "task"
  };
  return [...tasks, newTaskObject];
};

export const handleUpdateTask = (tasks: Task[], updatedTask: Task) => {
  return tasks.map(task => task.id === updatedTask.id ? updatedTask : task);
};

export const handleDeleteTask = (tasks: Task[], taskId: string) => {
  return tasks.filter(task => task.id !== taskId);
};

export const parseScheduleToTasks = async (
  scheduleText: string,
  inputTasks: Task[] = [],
  layoutPreference: LayoutPreference,
  scheduleId: string 
): Promise<Task[]> => {
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
  let taskStack: Task[] = [];
  let tasks: Task[] = [];
  let sectionStartIndex = 0;
  const taskMap = new Map<string, Task>(); // Use a Map to track unique tasks

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmedLine = line.trim();
    if (trimmedLine.match(/^(Early Morning|Morning|Afternoon|Arvo|Evening|Work Day|Night|High|Medium|Low|Fun|Ambition|Relationships|Work|Exercise)/i)) {
      currentSection = trimmedLine;
      sectionStartIndex = index;
      // Create section
      tasks.push({
        id: uuidv4(),
        text: trimmedLine,
        categories: [],
        is_subtask: false,
        completed: false,
        is_section: true,
        section: currentSection,
        parent_id: null,
        level: 0,
        section_index: 0,
        type: 'section'
      });
    } else if (trimmedLine) {
      const indentLevel = line.search(/\S|$/) / 2;
      let taskText = trimmedLine.replace(/^□ /, '').replace(/^- /, '');
      
      let startTime: string | null = null;
      let endTime: string | null = null;
      if (layoutPreference.timeboxed !== 'untimeboxed') {
        const timeMatch = taskText.match(/^(\d{1,2}:\d{2}(?:am|pm)?) - (\d{1,2}:\d{2}(?:am|pm)?):?\s*(.*)/i);
        if (timeMatch) {
          [, startTime, endTime, taskText] = timeMatch;
        }
      }

      // Check if the task already exists in the Map
      if (!taskMap.has(taskText)) {
        const matchingTask = inputTasks.find(t => t && taskText.toLowerCase().includes(t.text.toLowerCase()));
        let categories = matchingTask ? matchingTask.categories || [] : [];

        if (categories.length === 0) {
          console.log("no categories found");
          try {
            const categorizedTask = await categorizeTask(taskText);
            categories = categorizedTask.categories;
          } catch (error) {
            console.error("Error categorizing task:", error);
            categories = ['Uncategorized'];
          }
        }

        const task: Task = {
          id: uuidv4(),
          text: taskText,
          categories: categories,
          is_subtask: indentLevel > 0,
          completed: false,
          is_section: false,
          section: currentSection,
          parent_id: null,
          level: indentLevel,
          section_index: index - sectionStartIndex,
          type: 'task',
          start_time: startTime,
          end_time: endTime
        };

        taskMap.set(taskText, task);
        console.log("Created Task:", task);
        
        while (taskStack.length > indentLevel) {
          taskStack.pop();
        }

        if (taskStack.length > 0) {
          task.parent_id = taskStack[taskStack.length - 1].id;
        }

        taskStack.push(task);
        tasks.push(task);
      } else {
        console.log("Skipped duplicate task:", taskText);
      }
    }
  }

  const parsedTasks = tasks;  // This is the result of your parsing

  // Send the parsed tasks to the backend
  try {
    const response = await fetch(`${API_BASE_URL}/update_parsed_schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        scheduleId: scheduleId,
        parsedTasks: parsedTasks
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update parsed schedule');
    }

    console.log("Parsed schedule synced with backend");
  } catch (error) {
    console.error("Failed to sync parsed schedule with backend:", error);
  }

  return parsedTasks;
};

export const generateNextDaySchedule = async (
  currentSchedule: Task[],
  userData: FormData,
  previousSchedules: Task[][] = []
): Promise<{ success: boolean; schedule?: Task[]; error?: string }> => {
  console.log("Generating next day schedule locally");

  try {
    // Step 1: Identify unfinished tasks
    const unfinishedTasks = currentSchedule.filter(task => !task.completed && !task.is_section);

    // Step 2: Identify recurring tasks
    const recurringTasksResponse = await fetch(`${API_BASE_URL}/identify_recurring_tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_schedule: currentSchedule,
        previous_schedules: previousSchedules
      })
    });

    if (!recurringTasksResponse.ok) {
      throw new Error('Failed to identify recurring tasks');
    }

    const recurringTasksData = await recurringTasksResponse.json();
    const recurringTasks = recurringTasksData.recurring_tasks;

    // Step 3: Combine unfinished and recurring tasks
    let combinedTasks = [
      ...unfinishedTasks,
      ...recurringTasks.map((task: Task) => ({
        ...task,
        completed: false // Ensure recurring tasks are set to not completed
      })).filter((task: Task) => 
        !unfinishedTasks.some(unfinished => unfinished.id === task.id)
      )
    ];

    // Step 4: Format the next day schedule based on layout preference
    const layoutPreference: LayoutPreference = {
      structure: userData.layout_preference.structure as 'structured' | 'unstructured',
      subcategory: userData.layout_preference.subcategory,
      timeboxed: userData.layout_preference.timeboxed as 'timeboxed' | 'untimeboxed'
    };
    let formattedSchedule: Task[] = [];

    if (layoutPreference.structure === 'structured') {
      const sections = getSectionsFromCurrentSchedule(currentSchedule);
      formattedSchedule = formatStructuredSchedule(combinedTasks, sections, layoutPreference);
    } else {
      formattedSchedule = formatUnstructuredSchedule(combinedTasks, layoutPreference);
    }

    // Step 5: Assign time slots if timeboxed
    if (layoutPreference.timeboxed === 'timeboxed') {
      formattedSchedule = assignTimeSlots(formattedSchedule, userData.work_start_time, userData.work_end_time);
    }

    console.log("Next day schedule generated locally:", formattedSchedule);

    return {
      success: true,
      schedule: formattedSchedule
    };

  } catch (error) {
    console.error("Error generating next day schedule:", error);
    return {
      success: false,
      error: "There was an error generating the next day's schedule. Please try again."
    };
  }
};

const getSectionsFromCurrentSchedule = (currentSchedule: Task[]): string[] => {
  return currentSchedule
    .filter(task => task.is_section)
    .map(section => section.text);
};

const formatStructuredSchedule = (
  tasks: Task[],
  sections: string[],
  layoutPreference: LayoutPreference
): Task[] => {
  const formattedSchedule: Task[] = [];

  sections.forEach(section => {
    formattedSchedule.push({
      id: `section-${section.toLowerCase().replace(/\s+/g, '-')}`,
      text: section,
      is_section: true,
      type: 'section',
      completed: false,
      categories: [],
      is_subtask: false,
      section: section,
      parent_id: null,
      level: 0,
      section_index: formattedSchedule.length
    });

    const sectionTasks = tasks.filter(task => task.section === section);
    formattedSchedule.push(...sectionTasks);
  });

  // Add tasks without a section at the end
  const tasksWithoutSection = tasks.filter(task => !task.section);
  if (tasksWithoutSection.length > 0) {
    const lastSection = sections[sections.length - 1] || 'Other Tasks';
    if (!formattedSchedule.some(task => task.text === lastSection)) {
      formattedSchedule.push({
        id: `section-${lastSection.toLowerCase().replace(/\s+/g, '-')}`,
        text: lastSection,
        is_section: true,
        type: 'section',
        completed: false,
        categories: [],
        is_subtask: false,
        section: lastSection,
        parent_id: null,
        level: 0,
        section_index: formattedSchedule.length
      });
    }
    formattedSchedule.push(...tasksWithoutSection.map(task => ({ ...task, section: lastSection })));
  }

  return formattedSchedule;
};

const formatUnstructuredSchedule = (tasks: Task[], layoutPreference: LayoutPreference): Task[] => {
  return tasks;
};

const assignTimeSlots = (schedule: Task[], workStartTime: string, workEndTime: string): Task[] => {
  const workStart = new Date(`1970-01-01T${workStartTime}`);
  const workEnd = new Date(`1970-01-01T${workEndTime}`);
  const totalMinutes = (workEnd.getTime() - workStart.getTime()) / 60000;
  const minutesPerTask = Math.floor(totalMinutes / schedule.filter(task => !task.is_section).length);

  let currentTime = new Date(workStart);

  return schedule.map(task => {
    if (task.is_section) return task;

    const startTime = currentTime.toTimeString().slice(0, 5);
    currentTime.setMinutes(currentTime.getMinutes() + minutesPerTask);
    const endTime = currentTime.toTimeString().slice(0, 5);

    return {
      ...task,
      start_time: startTime,
      end_time: endTime
    };
  });
};

export const cleanupTasks = async (parsedTasks: Task[], existingTasks: Task[]): Promise<Task[]> => {
  const cleanedTasks = parsedTasks.map(task => {
    const matchingTask = existingTasks.find(t => t && t.id === task.id);
    return {
      ...task,
      categories: task.categories || (matchingTask ? matchingTask.categories : [])
    };
  });

  return cleanedTasks;
};

export const updatePriorities = (
  setFormData: React.Dispatch<React.SetStateAction<FormData>>,
  priorities: { id: string }[]
): void => {
  const updatedPriorities = {
    health: '',
    relationships: '',
    fun_activities: '',
    ambitions: ''
  };
  priorities.forEach((priority, index) => {
    updatedPriorities[priority.id as keyof typeof updatedPriorities] = (index + 1).toString();
  });
  setFormData((prevData: FormData) => ({ ...prevData, priorities: updatedPriorities }));
};

export const handleEnergyChange = (
  dispatch: React.Dispatch<FormAction>,
  currentPatterns: string[]
) => (value: string): void => {
  const updatedPatterns = currentPatterns.includes(value)
    ? currentPatterns.filter(pattern => pattern !== value)
    : [...currentPatterns, value];
  
  dispatch({
    type: 'UPDATE_FIELD',
    field: 'energy_patterns',
    value: updatedPatterns
  });
};