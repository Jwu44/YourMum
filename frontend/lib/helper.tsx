import { categorizeTask } from './api/users';
import { v4 as uuidv4 } from 'uuid';
import { Task, FormAction, DecompositionRequest, 
  DecompositionResponse, MicrostepFeedback, FeedbackResponse, 
  FormData, GetAISuggestionsResponse } from './types';
import { auth } from '@/auth/firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const today = new Date().toISOString().split('T')[0];

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

export const handleAddTask = async (tasks: Task[], newTask: string, categories: string[]) => {
  const result = await categorizeTask(newTask);
  const newTaskObject: Task = {
    id: uuidv4(),
    text: newTask.trim(),
    categories: (result?.categories) || categories,
    is_subtask: false,
    completed: false,
    is_section: false,
    section: null,
    parent_id: null,
    level: 0,
    section_index: tasks.length,
    type: "task",
    is_recurring: null,
    start_date: today,
  };
  return [...tasks, newTaskObject];
};

export const handleUpdateTask = (tasks: Task[], updatedTask: Task) => {
  return tasks.map(task => task.id === updatedTask.id ? updatedTask : task);
};

export const handleDeleteTask = (tasks: Task[], taskId: string) => {
  return tasks.filter(task => task.id !== taskId);
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

// Add new functions for microstep operations
export const handleMicrostepDecomposition = async (
  task: Task,
  formData: FormData
): Promise<DecompositionResponse> => {
  try {
    const request: DecompositionRequest = {
      task,
      energy_patterns: formData.energy_patterns,
      priorities: formData.priorities,
      work_start_time: formData.work_start_time,
      work_end_time: formData.work_end_time
    };

    const response = await fetch(`${API_BASE_URL}/api/tasks/decompose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to decompose task');
    }

    const data = await response.json();
    console.log(data)
    return data;
  } catch (error) {
    console.error('Error decomposing task:', error);
    // Return empty array on error since DecompositionResponse is now string[]
    return [];
}
};

export const submitMicrostepFeedback = async (
  taskId: string,
  microstepId: string,
  accepted: boolean,
  completionOrder?: number
): Promise<FeedbackResponse> => {
  try {
    const feedback: MicrostepFeedback = {
      task_id: taskId,
      microstep_id: microstepId,
      accepted,
      completion_order: completionOrder,
      timestamp: new Date().toISOString()
    };

    const response = await fetch(`${API_BASE_URL}/api/tasks/microstep-feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feedback)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit feedback');
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting microstep feedback:', error);
    return {
      database_status: 'error',
      colab_status: 'error',
      error: error instanceof Error ? error.message : 'Failed to submit feedback'
    };
  }
};

// Add helper function to handle microstep selection/rejection
export const handleMicrostepSelection = async (
  microstep: Task,
  accepted: boolean,
  tasks: Task[],
  onUpdateTask: (task: Task) => void
): Promise<void> => {
  try {
    if (!microstep.parent_id) return;

    // Submit feedback
    const feedbackResult = await submitMicrostepFeedback(
      microstep.parent_id,
      microstep.id,
      accepted
    );

    if (feedbackResult.database_status === 'error' || feedbackResult.colab_status === 'error') {
      console.warn('Feedback submission had errors:', feedbackResult);
    }

    if (accepted) {
      // Find parent task
      const parentTask = tasks.find(t => t.id === microstep.parent_id);
      if (!parentTask) return;

      // Get existing microsteps for this parent to determine position
      const existingMicrosteps = tasks.filter(
        t => t.parent_id === microstep.parent_id && t.is_microstep
      );

      // Create new task object from microstep
      const newSubtask: Task = {
        id: microstep.id,
        text: microstep.text,
        is_subtask: true,
        is_microstep: true,
        completed: false,
        is_section: false,
        section: parentTask.section,
        parent_id: parentTask.id,
        level: (parentTask.level || 0) + 1,
        section_index: (parentTask.section_index ?? 0) + existingMicrosteps.length + 1,
        type: 'microstep',
        categories: parentTask.categories || [],
        start_time: parentTask.start_time,
        end_time: parentTask.end_time,
        is_recurring: parentTask.is_recurring,
        start_date: parentTask.start_date
      };

      // Add the new subtask to tasks array
      onUpdateTask(newSubtask);
    }
  } catch (error) {
    console.error('Error handling microstep selection:', error);
  }
};

// Update existing functions to use new types
export const checkTaskCompletion = (task: Task, tasks: Task[]): boolean => {
  // If task has no microsteps, use its own completion state
  const microsteps = tasks.filter(
    t => t.parent_id === task.id && t.is_microstep
  );
  
  if (microsteps.length === 0) return task.completed;

  // Task is complete if all its microsteps are complete
  return microsteps.every(step => step.completed);
};

export const fetchAISuggestions = async (
  userId: string,
  date: string,
  currentSchedule: Task[],
  historicalSchedules: Task[][],
  priorities: Record<string, string>,
  energyPatterns: string[]
): Promise<GetAISuggestionsResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/schedule/suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        date,
        currentSchedule,
        historicalSchedules,
        priorities,
        energyPatterns
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch AI suggestions');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching AI suggestions:', error);
    throw error;
  }
};

export const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get the current user's Firebase ID token for API authentication
 * @returns Promise<string> - The authentication token
 * @throws Error if user is not authenticated
 */
const getAuthToken = async (): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated');
  }
  return await currentUser.getIdToken();
};

/**
 * Check if a schedule exists for a specific date
 * @param date The date to check for schedule existence
 * @returns Promise<boolean> indicating if a schedule exists
 */
export const checkScheduleExists = async (date: Date): Promise<boolean> => {
  try {
    // Format date for API
    const dateStr = formatDateToString(date);
    
    // Use the existing GET schedule endpoint to check if a schedule exists
    const response = await fetch(
      `${API_BASE_URL}/api/schedules/${dateStr}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
      }
    );

    // If we get a 200, schedule exists
    // If we get a 404, schedule doesn't exist
    // Any other error should be treated as "doesn't exist" for safety
    return response.ok;
  } catch (error) {
    console.error('Error checking schedule:', error);
    return false;
  }
};
