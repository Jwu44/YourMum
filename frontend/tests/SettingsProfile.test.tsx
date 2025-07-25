import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { fetchUserProfile, updateUserProfile } from '@/lib/api/settings';
import SettingsPage from '@/app/settings/page';

// Mock dependencies
jest.mock('@/auth/AuthContext');
jest.mock('@/hooks/use-toast');
jest.mock('@/lib/api/settings');
jest.mock('@/components/parts/SidebarLayout', () => {
  return { SidebarLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-layout">{children}</div> };
});

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockFetchUserProfile = fetchUserProfile as jest.MockedFunction<typeof fetchUserProfile>;
const mockUpdateUserProfile = updateUserProfile as jest.MockedFunction<typeof updateUserProfile>;

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

describe('Settings Profile Section', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser } as any);
    mockUseToast.mockReturnValue({ toast: mockToast } as any);
    mockFetchUserProfile.mockResolvedValue(mockUserProfile as any);
    mockUpdateUserProfile.mockResolvedValue(mockUserProfile as any);
  });

  describe('Initial State', () => {
    it('should render all profile fields as editable by default', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Name')).not.toBeDisabled();
        expect(screen.getByLabelText('Job title')).not.toBeDisabled();
        expect(screen.getByLabelText('Age')).not.toBeDisabled();
      });
    });

    it('should keep email field disabled', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Email address')).toBeDisabled();
      });
    });

    it('should not show Edit Profile button', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
      });
    });

    it('should show Save and Cancel buttons', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });

    it('should have Save button disabled initially (no changes)', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Save')).toBeDisabled();
      });
    });
  });

  describe('Change Detection', () => {
    it('should enable Save button when any field is changed', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText('Name');
        fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
        expect(screen.getByText('Save')).not.toBeDisabled();
      });
    });

    it('should disable Save button when field is reverted to original value', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText('Name');
        fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
        expect(screen.getByText('Save')).not.toBeDisabled();
        
        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        expect(screen.getByText('Save')).toBeDisabled();
      });
    });

    it('should detect changes in job title field', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        const jobTitleInput = screen.getByLabelText('Job title');
        fireEvent.change(jobTitleInput, { target: { value: 'Senior Engineer' } });
        expect(screen.getByText('Save')).not.toBeDisabled();
      });
    });

    it('should detect changes in age field', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        const ageInput = screen.getByLabelText('Age');
        fireEvent.change(ageInput, { target: { value: '31' } });
        expect(screen.getByText('Save')).not.toBeDisabled();
      });
    });
  });

  describe('Validation', () => {
    it('should show error when age is invalid', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        const ageInput = screen.getByLabelText('Age');
        fireEvent.change(ageInput, { target: { value: '200' } });
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: "Invalid age",
          description: "Please enter a valid age between 1 and 150.",
          variant: "destructive"
        }));
      });
    });

    it('should show error when job title exceeds 50 characters', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        const jobTitleInput = screen.getByLabelText('Job title');
        fireEvent.change(jobTitleInput, { target: { value: 'A'.repeat(51) } });
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: "Job title too long",
          description: "Job title must be 50 characters or less.",
          variant: "destructive"
        }));
      });
    });

    it('should disable Save button when validation fails', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        const ageInput = screen.getByLabelText('Age');
        fireEvent.change(ageInput, { target: { value: '200' } });
        expect(screen.getByText('Save')).toBeDisabled();
      });
    });
  });

  describe('Save Functionality', () => {
    it('should call updateUserProfile with correct data when Save is clicked', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText('Name');
        fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
        
        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);
        
        expect(mockUpdateUserProfile).toHaveBeenCalledWith('mock-token', {
          displayName: 'Jane Doe',
          jobTitle: 'Software Engineer',
          age: 30
        });
      });
    });

    it('should show success toast after successful save', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText('Name');
        fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
        
        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: "Profile updated",
          description: "Your profile has been successfully updated."
        }));
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should reset all fields to original values when Cancel is clicked', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText('Name');
        const jobTitleInput = screen.getByLabelText('Job title');
        const ageInput = screen.getByLabelText('Age');
        
        // Make changes
        fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
        fireEvent.change(jobTitleInput, { target: { value: 'Senior Engineer' } });
        fireEvent.change(ageInput, { target: { value: '31' } });
        
        // Click Cancel
        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);
        
        // Check fields are reset
        expect(nameInput).toHaveValue('John Doe');
        expect(jobTitleInput).toHaveValue('Software Engineer');
        expect(ageInput).toHaveValue('30');
      });
    });

    it('should disable Save button after Cancel is clicked', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText('Name');
        fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
        
        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);
        
        expect(screen.getByText('Save')).toBeDisabled();
      });
    });
  });

  describe('Button Layout', () => {
    it('should have Save and Cancel buttons right-aligned within Profile card', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        const buttonContainer = screen.getByText('Save').closest('div');
        expect(buttonContainer).toHaveClass('justify-end');
      });
    });

    it('should use consistent styling with other card sections', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        const saveButton = screen.getByText('Save');
        const cancelButton = screen.getByText('Cancel');
        
        // Save button should be default variant
        expect(saveButton).toHaveClass('bg-primary');
        
        // Cancel button should be outline variant
        expect(cancelButton).toHaveClass('border-input');
      });
    });
  });
}); 