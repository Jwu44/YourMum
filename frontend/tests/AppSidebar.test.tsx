/**
 * @file AppSidebar.test.tsx
 * @description Test suite for the AppSidebar component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AppSidebar } from '../components/parts/AppSidebar';
import { SidebarProvider } from '../components/ui/sidebar';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/dashboard'
  }),
  usePathname: () => '/dashboard'
}));

describe('AppSidebar', () => {
  beforeEach(() => {
    render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    );
  });

  describe('Header Section', () => {
    it('displays the yourdai logo as clickable link to dashboard', () => {
      const logoImage = screen.getByTestId('sidebar-header-icon');
      expect(logoImage).toBeInTheDocument();
      expect(logoImage.closest('a')).toHaveAttribute('href', '/dashboard');
    });

    it('has proper alt text for the logo', () => {
      const logoImage = screen.getByTestId('sidebar-header-icon');
      expect(logoImage).toHaveAttribute('alt', 'yourdai logo');
    });
  });

  describe('Navigation Menu Section', () => {
    it('renders all four navigation items', () => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Inputs')).toBeInTheDocument();
      expect(screen.getByText('Archive')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('displays correct icons for each navigation item', () => {
      expect(screen.getByTestId('nav-icon-profile')).toBeInTheDocument();
      expect(screen.getByTestId('nav-icon-inputs')).toBeInTheDocument();
      expect(screen.getByTestId('nav-icon-archive')).toBeInTheDocument();
      expect(screen.getByTestId('nav-icon-settings')).toBeInTheDocument();
    });

    it('has proper links for navigation items', () => {
      const inputsLink = screen.getByRole('link', { name: /inputs/i });
      expect(inputsLink).toHaveAttribute('href', '/inputs');
      
      // Placeholder links should have href="#"
      const profileLink = screen.getByRole('link', { name: /profile/i });
      expect(profileLink).toHaveAttribute('href', '#');
    });

    it('applies hover effects on menu items', () => {
      const profileItem = screen.getByTestId('nav-item-profile');
      
      fireEvent.mouseEnter(profileItem);
      expect(profileItem).toHaveClass('hover:bg-sidebar-accent/50');
    });

    it('has correct height for navigation items', () => {
      const profileItem = screen.getByTestId('nav-item-profile');
      expect(profileItem).toHaveClass('h-12');
    });
  });

  describe('Footer Section', () => {
    it('renders user profile card', () => {
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('displays user avatar with "U" initial', () => {
      const avatar = screen.getByTestId('user-avatar');
      expect(avatar).toBeInTheDocument();
      expect(screen.getByText('U')).toBeInTheDocument();
    });

    it('has proper styling for user profile section', () => {
      const userProfile = screen.getByTestId('user-profile');
      expect(userProfile).toHaveClass('bg-sidebar-accent/30');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for navigation', () => {
      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();
    });

    it('navigation items are keyboard accessible', () => {
      const inputsLink = screen.getByRole('link', { name: /inputs/i });
      inputsLink.focus();
      expect(inputsLink).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    it('maintains full height layout', () => {
      const sidebar = screen.getByTestId('app-sidebar');
      expect(sidebar).toHaveClass('h-screen');
    });

    it('has border on the right side', () => {
      const sidebar = screen.getByTestId('app-sidebar');
      expect(sidebar).toHaveClass('border-r');
    });
  });
});