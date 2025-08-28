import { type User } from 'firebase/auth'

// Minimal Slack metadata used by the UI for deep linking back to the message
export interface SlackMetadata {
  message_url?: string
  deep_link?: string
}

export interface Task {
  id: string
  text: string
  categories?: string[]
  completed: boolean
  is_subtask?: boolean
  is_section?: boolean
  section?: string | null
  parent_id?: string | null
  level?: number
  section_index?: number
  type?: string
  start_time?: string | null
  end_time?: string | null
  is_recurring?: RecurrenceType | null
  start_date?: string
  is_microstep?: boolean
  rationale?: string
  estimated_time?: string
  energy_level_required?: 'low' | 'medium' | 'high'
  gcal_event_id?: string
  // New integration fields
  source?: 'slack' | 'calendar' | 'manual'
  slack_message_url?: string
  // Preferred container for Slack message links; UI will prefer deep_link, then message_url
  slack_metadata?: SlackMetadata
}

export interface FormData {
  user?: UserDocument
  work_start_time: string
  work_end_time: string
  tasks: Task[]
  energy_patterns: string[]
  priorities: {
    health: string
    relationships: string
    fun_activities: string
    ambitions: string
  }
  // Replace legacy layout_preference with enhanced version
  layout_preference: LayoutPreference
  [key: string]: any
  scheduleId?: string
  response?: string
}

export interface Priority {
  id: string
  name: string
  icon: React.ElementType
  color: string
  bgColor: string
}

export interface MicrostepFeedback {
  task_id: string
  microstep_id: string
  accepted: boolean
  completion_order?: number
  timestamp?: string
}

// Add new type for decomposition cache
export interface DecompositionCacheEntry {
  taskText: string
  categories: string[]
  microsteps: Task[]
  successRate: number
  lastUsed: string
  totalSuggestions: number
  acceptedSuggestions: number
}

export interface DecompositionRequest {
  task: Task
  energy_patterns: string[]
  priorities: Record<string, string>
  work_start_time: string
  work_end_time: string
}

// Update the interface to reflect the new response format
export type DecompositionResponse = string[] // Array of microstep texts

export interface FeedbackResponse {
  database_status: 'success' | 'error'
  colab_status: 'success' | 'error'
  error?: string
}

// Utility type for nested update
export type NestedKeyOf<T> = {
  [K in keyof T & (string | number)]: T[K] extends object
    ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
    : `${K}`
}[keyof T & (string | number)]

export type FormAction = {
  type: 'UPDATE_FIELD'
  field: string
  value: any
} | {
  type: 'UPDATE_NESTED_FIELD'
  field: string
  subField: string
  value: any
} | {
  type: 'UPDATE_TASK'
  task: Task
} | {
  type: 'RESET_FORM'
}

// Base layout types (can be extended in the future)
export type BaseLayoutType =
  | 'todolist'
  | 'kanban'
  | 'calendar'
  | 'timeline'

// Structure variants for layouts
export type LayoutStructure =
  | 'structured'
  | 'unstructured'

// Subcategory types for structured layouts
export type TodolistSubcategory =
  | 'day-sections'
  | 'priority'
  | 'category'
  | 'custom'

export type KanbanSubcategory =
  | 'status'
  | 'priority'
  | 'assignee'
  | 'custom'

export type CalendarSubcategory =
  | 'day'
  | 'week'
  | 'month'
  | 'custom'

export type TimelineSubcategory =
  | 'chronological'
  | 'milestone'
  | 'custom'

// Combined layout type that connects base type with structure
export type ScheduleLayoutType =
  | `${BaseLayoutType}-${LayoutStructure}`

// Task ordering patterns (separated from timing)
export type TaskOrderingPattern =
  | 'batching'
  | 'alternating'
  | '3-3-3'

// Timing patterns (separated from ordering)
export type TimingPattern =
  | 'timebox'
  | 'untimebox'

// Mapping of layout types to their valid subcategories
export interface LayoutSubcategoryMap {
  'todolist-structured': TodolistSubcategory
  'todolist-unstructured': never // Unstructured layouts don't have subcategories
  'kanban-structured': KanbanSubcategory
  'kanban-unstructured': never
  'calendar-structured': CalendarSubcategory
  'calendar-unstructured': never
  'timeline-structured': TimelineSubcategory
  'timeline-unstructured': never
}

// Enhanced layout preference interface with improved typing and timing/ordering separation
export interface LayoutPreference {
  layout: ScheduleLayoutType
  subcategory: string // Using string for backward compatibility, but should be one of the subcategory types
  timing: TimingPattern // NEW FIELD: Separate timing preference
  orderingPattern?: TaskOrderingPattern // UPDATED: Now optional, no timing patterns
}

// Helper function type to get valid subcategories for a layout type
export type SubcategoriesForLayout<T extends ScheduleLayoutType> =
  T extends keyof LayoutSubcategoryMap ? LayoutSubcategoryMap[T] : never

// Helper function to validate if a subcategory is valid for a given layout type
export function isValidSubcategoryForLayout (
  layout: ScheduleLayoutType,
  subcategory: string
): boolean {
  // For unstructured layouts, any subcategory (or none) is valid
  if (layout.includes('unstructured')) {
    return true
  }

  // For structured layouts, check against valid subcategories
  if (layout.startsWith('todolist')) {
    return ['day-sections', 'priority', 'category', 'custom'].includes(subcategory)
  } else if (layout.startsWith('kanban')) {
    return ['status', 'priority', 'assignee', 'custom'].includes(subcategory)
  } else if (layout.startsWith('calendar')) {
    return ['day', 'week', 'month', 'custom'].includes(subcategory)
  } else if (layout.startsWith('timeline')) {
    return ['chronological', 'milestone', 'custom'].includes(subcategory)
  }

  return false
}

// Add a new type for the form context
export interface FormContextType {
  state: FormData
  dispatch: React.Dispatch<FormAction>
}

// Add new types for recurrence
export type WeekDay = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'
export type MonthWeek = 'first' | 'second' | 'third' | 'fourth' | 'last'

export interface RecurrenceType {
  frequency: 'none' | 'daily' | 'weekly' | 'monthly' | null
  dayOfWeek?: WeekDay
  weekOfMonth?: MonthWeek
}

export interface TaskEditFormData {
  text: string
  categories: string[]
  start_time?: string | null
  end_time?: string | null
  is_recurring: RecurrenceType
}

export const RECURRENCE_OPTIONS = [
  { value: 'none', label: "Doesn't repeat" },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly on {day}' }, // Template for weekly
  { value: 'monthly', label: 'Monthly on the {week} {day}' } // Template for monthly
]

export type SuggestionType =
  | 'Energy Optimization'
  | 'Procrastination Prevention'
  | 'Priority Rebalancing'
  | 'Task Structure'
  | 'Time Management'

export interface AISuggestion {
  id: string
  text: string
  type: SuggestionType
  rationale: string
  confidence: number
  categories: string[]
  user_id: string
  date: string
}

export interface GetAISuggestionsResponse {
  suggestions: AISuggestion[]
  metadata: {
    generated_at: string
    count: number
  }
}

export interface CalendarCredentials {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  scopes: string[]
}

// Add new user-related interfaces
export interface UserDocument {
  googleId: string
  email: string
  displayName: string
  photoURL?: string
  role: UserRole
  timezone?: string
  jobTitle?: string
  age?: number
  calendarSynced: boolean
  lastLogin: string
  createdAt: string
  metadata?: {
    lastModified: string
  }
  calendar?: {
    connected: boolean
    credentials?: CalendarCredentials
    lastSyncTime: string | null
    syncStatus: 'never' | 'in_progress' | 'completed' | 'failed'
    selectedCalendars: string[]
    error: string | null
    settings?: {
      autoSync: boolean
      syncFrequency: number
      defaultReminders: boolean
    }
  }
}

export interface CalendarEvent {
  id: string
  calendarId: string
  summary: string
  description?: string
  start: { dateTime: string, timeZone: string }
  end: { dateTime: string, timeZone: string }
  recurringEventId?: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  created: string
  updated: string
  creator: { email: string, displayName?: string }
  organizer: { email: string, displayName?: string }
}

export type UserRole = 'free' | 'premium' | 'admin'

export interface AuthResponse {
  message: string
  user: UserDocument
  isNewUser?: boolean
}

// Backend API response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  calendarConnectionStage: 'connecting' | 'verifying' | 'complete' | null
}

export interface AuthContextType extends AuthState {
  currentUser: User | null
  signIn: (redirectTo?: string) => Promise<void> // Updated to accept optional parameter
  signOut: () => Promise<void>
  reconnectCalendar: () => Promise<void> // New method for calendar reconnection
}

// Python backend response types
export interface PythonBackendResponse<T> {
  message?: string
  error?: string
  data?: T
  status: 'success' | 'error'
}

// Session types
export interface SessionData {
  token: string
  userId: string
  expiresAt: number
}

// Create a base schedule metadata type to reduce duplication
export interface ScheduleMetadataBase {
  createdAt: string
  lastModified: string
  totalTasks: number
  calendarEvents: number
  recurringTasks?: number
}

export interface ScheduleDocument {
  date: string
  tasks: Task[]
  userId: string
  inputs: {
    name: string
    age: string
    work_start_time: string
    work_end_time: string
    energy_patterns: string[]
    // Update to use LayoutPreference
    layout_preference: LayoutPreference
    priorities: Record<string, string>
    tasks: string[]
  }
  schedule: Task[]
  metadata: {
    createdAt: string
    lastModified: string
    calendarSynced: boolean
    totalTasks: number
    calendarEvents: number
    // Add new fields for enhanced metadata
    recurringTasks?: number
    orderingPattern?: TaskOrderingPattern
  }
}

// Update ScheduleResponse to extend the base metadata
export interface ScheduleResponse {
  _id: string
  date: string
  tasks: Task[]
  layout?: ScheduleLayoutType
  orderingPattern?: TaskOrderingPattern
  metadata: ScheduleMetadataBase
}

export interface TimeSlot {
  start: string
  end: string
  isOccupied: boolean
}

export interface ScheduleMetadata {
  totalTasks?: number
  calendarEvents?: number
  recurringTasks?: number
  generatedAt: string
  error?: string
}

// New interface for structured schedule data
export interface ScheduleData {
  tasks: Task[]
  layout: ScheduleLayoutType
  orderingPattern?: TaskOrderingPattern
  scheduleId?: string
  metadata: {
    generatedAt: string
    totalTasks: number
    calendarEvents: number
    recurringTasks: number
    error?: string
  }
}

export interface GoogleCalendarEvent {
  id: string
  summary: string
  start: { dateTime: string, date?: string }
  end: { dateTime: string, date?: string }
  recurrence?: string[]
}

export interface RedirectResult {
  user: {
    uid: string
    email: string | null
    displayName: string | null
    photoURL: string | null
    getIdToken: (forceRefresh: boolean) => Promise<string>
  }
  credentials: CalendarCredentials
  hasCalendarAccess: boolean
  scopes: string[] // Changed from string to string[] for better typing
}

export interface FirebaseUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  getIdToken: (forceRefresh: boolean) => Promise<string>
}

export interface WithHandleGetStarted {
  handleGetStarted: () => Promise<void>
}

export interface CalendarCredentials {
  accessToken: string
  expiresAt: number
  scopes: string[]
}

// Profile form data interface for settings page
export interface ProfileFormData {
  displayName: string
  email: string
  jobTitle: string
  age: string // String to handle form input, will be converted to number
}
