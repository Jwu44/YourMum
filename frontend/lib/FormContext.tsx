'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { FormData, FormAction, FormContextType } from './types';

// Create the initial state
const initialState: FormData = {
  name: "",
  age: "",
  work_start_time: "",
  work_end_time: "",
  tasks: [],
  energy_patterns: [],
  priorities: { health: "", relationships: "", fun_activities: "", ambitions: "" },
  layout_preference: {
    structure: '',
    subcategory: '',
    timeboxed: ''
  }
};

// Helper function to set nested properties
const setNestedProperty = (obj: any, path: string, value: any): any => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const lastObj = keys.reduce((obj, key) => obj[key] = obj[key] || {}, obj);
  lastObj[lastKey] = value;
  return obj;
};

// Create the reducer function
const formReducer = (state: FormData, action: FormAction): FormData => {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return setNestedProperty({...state}, action.field, action.value);
    case 'UPDATE_NESTED_FIELD':
      return {
        ...state,
        [action.field]: {
          ...state[action.field],
          [action.subField]: action.value
        }
      };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task => 
          task.id === action.task.id ? action.task : task
        )
      };
    case 'RESET_FORM':
      return initialState;
    default:
      return state;
  }
};

// Update the context creation
const FormContext = createContext<FormContextType | undefined>(undefined);

// Create a provider component
export const FormProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(formReducer, initialState);

  return (
    <FormContext.Provider value={{ state, dispatch }}>
      {children}
    </FormContext.Provider>
  );
};

// Create a custom hook to use the form context
export const useForm = () => {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error('useForm must be used within a FormProvider');
  }
  return context;
};