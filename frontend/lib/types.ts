export interface Task {
  id: string;
  text: string;
  categories: string[];
  is_subtask: boolean;
  completed: boolean;
  is_section: boolean;
  section: string | null;
  parent_id: string | null;
  level: number;
  section_index: number;
  type: string;
  start_time?: string | null;
  end_time?: string | null;
}
  
export interface FormData {
  name: string;
  age: string;
  work_start_time: string;
  work_end_time: string;
  tasks: Task[];
  energy_patterns: string[];
  priorities: {
    health: string;
    relationships: string;
    fun_activities: string;
    ambitions: string;
  };
  layout_preference: {
    structure: string;
    subcategory: string;
    timeboxed: string;
  };
  [key: string]: any;
}