'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { FormData } from './types';

// Utility type for nested update
type NestedKeyOf<T> = {
  [K in keyof T & (string | number)]: T[K] extends object
    ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
    : `${K}`
}[keyof T & (string | number)];

// Define the actions that can be performed on the form data
type FormAction =
  | { type: 'UPDATE_FIELD'; field: NestedKeyOf<FormData>; value: any }
  | { type: 'RESET_FORM' };

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
    case 'RESET_FORM':
      return initialState;
    default:
      return state;
  }
};

// Create the context
const FormContext = createContext<{
  state: FormData;
  dispatch: React.Dispatch<FormAction>;
} | undefined>(undefined);

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