/**
 * Test for hasFormModifications helper function
 * Following TDD approach - these tests verify the logic for detecting user modifications
 */
import { hasFormModifications } from '@/lib/FormContext';
import { type FormData } from '@/lib/types';

// Mock the initial state from FormContext
const initialFormState: FormData = {
  work_start_time: '9:00 AM',
  work_end_time: '5:00 PM',
  tasks: [],
  energy_patterns: [],
  priorities: { health: '', relationships: '', fun_activities: '', ambitions: '' },
  layout_preference: {
    layout: 'todolist-structured',
    subcategory: 'day-sections',
    timing: 'untimebox',
    orderingPattern: undefined
  }
};

describe('hasFormModifications', () => {
  test('should return false for initial state', () => {
    const result = hasFormModifications(initialFormState);
    expect(result).toBe(false);
  });

  test('should return true when work times are modified', () => {
    const modifiedState = {
      ...initialFormState,
      work_start_time: '08:00'
    };
    const result = hasFormModifications(modifiedState);
    expect(result).toBe(true);
  });

  test('should return true when energy patterns are added', () => {
    const modifiedState = {
      ...initialFormState,
      energy_patterns: ['peak_morning']
    };
    const result = hasFormModifications(modifiedState);
    expect(result).toBe(true);
  });

  test('should return true when priorities are set', () => {
    const modifiedState = {
      ...initialFormState,
      priorities: {
        health: '1',
        relationships: '2',
        fun_activities: '3',
        ambitions: '4'
      }
    };
    const result = hasFormModifications(modifiedState);
    expect(result).toBe(true);
  });

  test('should return true when layout preference is modified', () => {
    const modifiedState = {
      ...initialFormState,
      layout_preference: {
        ...initialFormState.layout_preference,
        layout: 'todolist-unstructured'
      }
    };
    const result = hasFormModifications(modifiedState);
    expect(result).toBe(true);
  });

  test('should return true when tasks are loaded', () => {
    const modifiedState = {
      ...initialFormState,
      tasks: [
        {
          id: '1',
          text: 'Test task',
          completed: false,
          is_microstep: false
        }
      ]
    };
    const result = hasFormModifications(modifiedState);
    expect(result).toBe(true);
  });

  test('should return true for multiple modifications', () => {
    const modifiedState = {
      ...initialFormState,
      work_start_time: '08:00',
      energy_patterns: ['peak_morning', 'high_all_day'],
      priorities: {
        health: '1',
        relationships: '2',
        fun_activities: '3',
        ambitions: '4'
      }
    };
    const result = hasFormModifications(modifiedState);
    expect(result).toBe(true);
  });

  test('should handle partial priority modifications', () => {
    const modifiedState = {
      ...initialFormState,
      priorities: {
        health: '1',
        relationships: '', // Still empty
        fun_activities: '',
        ambitions: ''
      }
    };
    const result = hasFormModifications(modifiedState);
    expect(result).toBe(true);
  });

  test('should handle empty arrays correctly', () => {
    const stateWithEmptyArrays = {
      ...initialFormState,
      energy_patterns: [],
      tasks: []
    };
    const result = hasFormModifications(stateWithEmptyArrays);
    expect(result).toBe(false);
  });
});