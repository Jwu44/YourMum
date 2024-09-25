import { categorizeTask } from './api';
import { v4 as uuidv4 } from 'uuid';
import { Task, FormData, FormAction } from './types';

const API_BASE_URL = 'http://localhost:8000/api';

interface LayoutPreference {
  timeboxed?: string;
  [key: string]: any;
}

interface UserData {
  layout_preference: LayoutPreference;
}

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
  layoutPreference: LayoutPreference
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

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmedLine = line.trim();
    if (trimmedLine.match(/^(Early Morning|Morning|Afternoon|Arvo|Evening|Work Day|Night|High|Medium|Low|Fun|Ambition|Relationships|Work|Exercise)/i)) {
      currentSection = trimmedLine;
      sectionStartIndex = index;
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

      const matchingTask = inputTasks.find(t => t && taskText.toLowerCase().includes(t.text.toLowerCase()));
      let categories = matchingTask ? matchingTask.categories || [] : [];

      if (categories.length === 0) {
        console.log("no categories found");
        const categorizedTask = await categorizeTask(taskText);
        categories = categorizedTask.categories;
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

export const generateNextDaySchedule = async (
  currentSchedule: Task[],
  userData: UserData,
  previousSchedules: Task[][] = []
): Promise<{ success: boolean; schedule?: Task[]; error?: string }> => {
  console.log("Generating next day schedule");

  try {
    const data = {
      current_schedule: currentSchedule,
      previous_schedules: previousSchedules,
      user_preferences: userData.layout_preference
    };

    const response = await fetch(`${API_BASE_URL}/generate_next_day_schedule`, {
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
    console.log("Next day schedule generated:", result.schedule);

    return {
      success: true,
      schedule: result.schedule
    };

  } catch (error) {
    console.error("Error generating next day schedule:", error);
    return {
      success: false,
      error: "There was an error generating the next day's schedule. Please try again."
    };
  }
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
  dispatch: React.Dispatch<FormAction>
) => (value: string): void => {
  dispatch({
    type: 'UPDATE_FIELD',
    field: 'energy_patterns',
    value: (prevPatterns: string[]) => {
      const currentPatterns = prevPatterns || [];
      return currentPatterns.includes(value)
        ? currentPatterns.filter((pattern: string) => pattern !== value)
        : [...currentPatterns, value];
    }
  });
};