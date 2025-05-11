import { UserDocument, Task } from '../types';
import { auth } from '@/auth/firebase';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Use the calendar part of UserDocument type
type CalendarStatus = NonNullable<UserDocument['calendar']>;

export const calendarApi = {
  async connectCalendar(credentials: any) {
    try {
      // Get the current user's token
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/calendar/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ credentials }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to connect calendar: ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error connecting to calendar:', error);
      throw error;
    }
  },

  async disconnectCalendar() {
    try {
      // Get the current user's token
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/calendar/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to disconnect calendar: ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      throw error;
    }
  },

  async getCalendarStatus(): Promise<CalendarStatus> {
    try {
      // Get the current user's token
      const idToken = await auth.currentUser?.getIdToken();
      
      const response = await fetch(`${API_BASE_URL}/api/calendar/status`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get calendar status: ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error getting calendar status:', error);
      throw error;
    }
  },

  async verifyCalendarPermissions(accessToken: string): Promise<{
    hasPermissions: boolean;
    availableCalendars?: Array<{
      id: string;
      summary: string;
      primary: boolean;
    }>;
    error?: string;
  }> {
    try {
      // Get the current user's token
      const idToken = await auth.currentUser?.getIdToken();
      
      const response = await fetch(`${API_BASE_URL}/api/calendar/verify-permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ accessToken }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to verify calendar permissions: ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error verifying calendar permissions:', error);
      throw error;
    }
  },

  async fetchEvents(date: string): Promise<Task[]> {
    try {
      // Get the current user's token
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/calendar/events?date=${date}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch calendar events: ${errorText}`);
      }
      
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  }
};