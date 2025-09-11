import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/hooks/use-toast';
import SettingsPage from '@/app/settings/page';
import { deleteUserAccount } from '@/lib/api/settings';

// Mock dependencies
jest.mock('@/auth/AuthContext');
jest.mock('@/hooks/use-toast');
jest.mock('@/lib/api/settings', () => ({
  fetchUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
  deleteUserAccount: jest.fn()
}));
jest.mock('@/components/parts/SidebarLayout', () => {
  return { SidebarLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-layout">{children}</div> };
});

// Mock window location for redirect testing
const mockLocationAssign = jest.fn();
Object.defineProperty(window, 'location', {
  value: { assign: mockLocationAssign },
  writable: true
});

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockDeleteUserAccount = deleteUserAccount as jest.MockedFunction<typeof deleteUserAccount>;

const mockUser = {
  getIdToken: jest.fn().mockResolvedValue('mock-token'),
  uid: 'test-uid'
} as any;

const mockSignOut = jest.fn();
const mockToast = jest.fn();

describe('Settings Page - Account Deletion', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockLocationAssign.mockClear();
    
    // Setup default mock implementations
    mockUseAuth.mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
      loading: false,
      error: null,
      signIn: jest.fn(),
      currentUser: mockUser,
      reconnectCalendar: jest.fn(),
      handleOAuthCallback: jest.fn(),
      calendarConnectionStage: null
    });

    mockUseToast.mockReturnValue({
      toast: mockToast,
      toasts: [],
      dismiss: jest.fn()
    });

    // Mock successful profile fetch
    require('@/lib/api/settings').fetchUserProfile.mockResolvedValue({
      uid: 'test-uid',
      displayName: 'John Doe',
      email: 'john@example.com',
      role: 'free'
    });
  });

  it('renders delete account button', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Delete your account')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });
  });

  it('opens confirmation dialog when delete button is clicked', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButton);

    // Check that dialog is opened
    expect(screen.getByText('Delete account')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this account?')).toBeInTheDocument();
  });

  it('closes dialog when cancel is clicked', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    // Open dialog
    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButton);

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    // Dialog should be closed (title not visible)
    await waitFor(() => {
      expect(screen.queryByText('Delete account')).not.toBeInTheDocument();
    });
  });

  it('successfully deletes account when confirmed', async () => {
    mockDeleteUserAccount.mockResolvedValue({
      success: true,
      message: 'Account deleted successfully',
      deleted_documents: 5
    });

    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    // Open dialog
    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButton);

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockDeleteUserAccount).toHaveBeenCalledWith('mock-token');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Account deleted successfully',
        description: 'Your account and all data have been permanently deleted.',
        variant: 'success'
      });
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockLocationAssign).toHaveBeenCalledWith('/');
    });
  });

  it('handles deletion with warnings', async () => {
    mockDeleteUserAccount.mockResolvedValue({
      success: true,
      message: 'Account deleted successfully',
      deleted_documents: 3,
      warnings: ['Slack disconnection failed']
    });

    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    // Open dialog and confirm
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Account deleted successfully',
        description: 'Warning: Slack disconnection failed',
        variant: 'success'
      });
    });
  });

  it('handles deletion errors', async () => {
    mockDeleteUserAccount.mockRejectedValue(new Error('Network error'));

    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    // Open dialog and confirm
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Failed to delete account',
        description: 'Network error',
        variant: 'destructive'
      });
      expect(mockSignOut).not.toHaveBeenCalled();
      expect(mockLocationAssign).not.toHaveBeenCalled();
    });
  });

  it('shows loading state during deletion', async () => {
    // Make the API call hang to test loading state
    mockDeleteUserAccount.mockImplementation(() => new Promise(() => {}));

    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    // Open dialog and confirm
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    // Check loading state
    await waitFor(() => {
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });
  });
}); 