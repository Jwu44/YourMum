import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '@/app/dashboard/page';
import { AuthProvider } from '@/auth/AuthContext';
import { FormProvider } from '@/lib/FormContext';
import { calendarApi } from '@/lib/api/calendar';

// Mock calendar API
jest.mock('@/lib/api/calendar', () => ({
  calendarApi: {
    fetchEvents: jest.fn()
  }
}));

// Mock auth context with variable state
const mockAuthState = {
  currentUser: { uid: 'test-user-id' },
  loading: false,
  error: null,
  calendarConnectionStage: null as 'connecting' | 'verifying' | 'complete' | null
};

jest.mock('@/auth/AuthContext', () => ({
  ...jest.requireActual('@/auth/AuthContext'),
  useAuth: () => mockAuthState
}));

describe('Calendar Integration in Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset auth state
    mockAuthState.calendarConnectionStage = null;
  });

  test('should load calendar events when available', async () => {
    // Mock calendar events
    const mockEvents = [
      {
        id: 'event1',
        text: 'Team Meeting',
        completed: false,
        start_time: '2023-07-01T09:00:00Z',
        end_time: '2023-07-01T10:00:00Z',
        gcal_event_id: 'event123'
      }
    ];
    
    (calendarApi.fetchEvents as jest.Mock).mockResolvedValue(mockEvents);
    
    // Render dashboard with providers
    render(
      <AuthProvider>
        <FormProvider>
          <Dashboard />
        </FormProvider>
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(calendarApi.fetchEvents).toHaveBeenCalled();
    });
  });

  test('should show CalendarConnectionLoader during calendar connection', async () => {
    // Set calendar connection stage to 'connecting'
    mockAuthState.calendarConnectionStage = 'connecting';
    
    const { getByText } = render(
      <AuthProvider>
        <FormProvider>
          <Dashboard />
        </FormProvider>
      </AuthProvider>
    );
    
    // Should show calendar connection loader instead of dashboard
    expect(getByText('Connecting to Google Calendar...')).toBeInTheDocument();
    expect(getByText('Setting Up Your Calendar')).toBeInTheDocument();
  });

  test('should show different stages of calendar connection', async () => {
    // Test verifying stage
    mockAuthState.calendarConnectionStage = 'verifying';
    
    const { rerender, getByText } = render(
      <AuthProvider>
        <FormProvider>
          <Dashboard />
        </FormProvider>
      </AuthProvider>
    );
    
    expect(getByText('Verifying Connection...')).toBeInTheDocument();
    
    // Test complete stage
    mockAuthState.calendarConnectionStage = 'complete';
    
    rerender(
      <AuthProvider>
        <FormProvider>
          <Dashboard />
        </FormProvider>
      </AuthProvider>
    );
    
    expect(getByText('Calendar Connected!')).toBeInTheDocument();
  });

  test('should show normal dashboard when no calendar connection stage', async () => {
    // Ensure no calendar connection stage
    mockAuthState.calendarConnectionStage = null;
    
    // Mock successful calendar fetch to prevent loading state
    (calendarApi.fetchEvents as jest.Mock).mockResolvedValue({
      success: true,
      tasks: [],
      count: 0,
      date: '2023-07-01'
    });
    
    const { queryByText } = render(
      <AuthProvider>
        <FormProvider>
          <Dashboard />
        </FormProvider>
      </AuthProvider>
    );
    
    // Should NOT show calendar connection loader
    expect(queryByText('Setting Up Your Calendar')).not.toBeInTheDocument();
    expect(queryByText('Connecting to Google Calendar...')).not.toBeInTheDocument();
  });
});