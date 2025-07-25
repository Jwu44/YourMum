import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/hooks/use-toast';
import SettingsPage from '@/app/settings/page';

// Mock dependencies
jest.mock('@/auth/AuthContext');
jest.mock('@/hooks/use-toast');
jest.mock('@/lib/api/settings', () => ({
  fetchUserProfile: jest.fn(),
  updateUserProfile: jest.fn()
}));
jest.mock('@/components/parts/SidebarLayout', () => {
  return { SidebarLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-layout">{children}</div> };
});

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock window location for redirect testing
const mockLocationAssign = jest.fn();
Object.defineProperty(window, 'location', {
  value: { assign: mockLocationAssign },
  writable: true
});

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockUser = {
  getIdToken: jest.fn().mockResolvedValue('mock-token'),
  uid: 'test-uid'
};

const mockUserProfile = {
  uid: 'test-uid',
  displayName: 'John Doe',
  email: 'john@example.com',
  jobTitle: 'Software Engineer',
  age: 30,
  role: 'free'
};

const mockToast = jest.fn();
const mockSignOut = jest.fn();

describe('Settings Logout Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ 
      user: mockUser, 
      signOut: mockSignOut 
    } as any);
    mockUseToast.mockReturnValue({ toast: mockToast } as any);
    
    // Mock successful profile fetch
    require('@/lib/api/settings').fetchUserProfile.mockResolvedValue(mockUserProfile);
    
    // Reset location assign mock
    mockLocationAssign.mockClear();
  });

  describe('Logout Button Rendering', () => {
    it('should render logout button in Account section', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Account')).toBeInTheDocument();
        expect(screen.getByText('Log out')).toBeInTheDocument();
      });
    });

    it('should have logout button with outline variant styling', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        const logoutButton = screen.getByText('Log out');
        expect(logoutButton).toHaveClass('border-input');
      });
    });

    it('should display logout button text correctly', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        const logoutButton = screen.getByText('Log out');
        expect(logoutButton).toBeInTheDocument();
        expect(logoutButton.tagName).toBe('BUTTON');
      });
    });
  });

  describe('Successful Logout Flow', () => {
    it('should call signOut and API endpoint on logout button click', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Logged out successfully' })
      });

      render(<SettingsPage />);
      
      await waitFor(() => {
        const logoutButton = screen.getByText('Log out');
        fireEvent.click(logoutButton);
      });

      await waitFor(() => {
        // Should call Firebase signOut
        expect(mockSignOut).toHaveBeenCalledTimes(1);
        
        // Should call backend logout API
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/auth/logout'),
          expect.objectContaining({
            method: 'DELETE',
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-token',
              'Content-Type': 'application/json'
            })
          })
        );
      });
    });

    it('should redirect to home page after successful logout', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Logged out successfully' })
      });

      render(<SettingsPage />);
      
      await waitFor(() => {
        const logoutButton = screen.getByText('Log out');
        fireEvent.click(logoutButton);
      });

      await waitFor(() => {
        expect(mockLocationAssign).toHaveBeenCalledWith('/');
      });
    });

    it('should show loading state during logout', async () => {
      // Mock delayed API response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Logged out successfully' })
        }), 100))
      );

      render(<SettingsPage />);
      
      await waitFor(() => {
        const logoutButton = screen.getByText('Log out');
        fireEvent.click(logoutButton);
      });

      // Should show loading state
      expect(screen.getByText('Logging out...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(mockLocationAssign).toHaveBeenCalledWith('/');
      }, { timeout: 2000 });
    });
  });

  describe('Error Handling', () => {
    it('should show error toast when logout API fails', async () => {
      // Mock API failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SettingsPage />);
      
      await waitFor(() => {
        const logoutButton = screen.getByText('Log out');
        fireEvent.click(logoutButton);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to log out. Please try again.',
          variant: 'destructive'
        });
      });
    });

    it('should show error toast when API returns error response', async () => {
      // Mock API error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      });

      render(<SettingsPage />);
      
      await waitFor(() => {
        const logoutButton = screen.getByText('Log out');
        fireEvent.click(logoutButton);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to log out. Please try again.',
          variant: 'destructive'
        });
      });
    });

    it('should show error toast when Firebase signOut fails', async () => {
      // Mock Firebase signOut failure
      mockSignOut.mockRejectedValueOnce(new Error('Firebase error'));

      render(<SettingsPage />);
      
      await waitFor(() => {
        const logoutButton = screen.getByText('Log out');
        fireEvent.click(logoutButton);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Failed to log out. Please try again.',
          variant: 'destructive'
        });
      });
    });

    it('should not redirect when logout fails', async () => {
      // Mock API failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SettingsPage />);
      
      await waitFor(() => {
        const logoutButton = screen.getByText('Log out');
        fireEvent.click(logoutButton);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });

      // Should not redirect on error
      expect(mockLocationAssign).not.toHaveBeenCalled();
    });

    it('should reset loading state after error', async () => {
      // Mock API failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SettingsPage />);
      
      await waitFor(() => {
        const logoutButton = screen.getByText('Log out');
        fireEvent.click(logoutButton);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });

      // Button should return to normal state
      expect(screen.getByText('Log out')).toBeInTheDocument();
      expect(screen.queryByText('Logging out...')).not.toBeInTheDocument();
    });
  });

  describe('Button State Management', () => {
    it('should disable logout button during logout process', async () => {
      // Mock delayed API response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Logged out successfully' })
        }), 100))
      );

      render(<SettingsPage />);
      
      await waitFor(() => {
        const logoutButton = screen.getByText('Log out');
        fireEvent.click(logoutButton);
      });

      // Button should be disabled during logout
      const loggingOutButton = screen.getByText('Logging out...');
      expect(loggingOutButton).toBeDisabled();
    });

    it('should prevent double clicks during logout', async () => {
      // Mock delayed API response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Logged out successfully' })
        }), 100))
      );

      render(<SettingsPage />);
      
      await waitFor(() => {
        const logoutButton = screen.getByText('Log out');
        fireEvent.click(logoutButton);
        fireEvent.click(logoutButton); // Double click
      });

      // Should only call signOut once
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
}); 