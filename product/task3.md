# TASK-03: Add left side navbar
Status: To do

## Current Progress

## Requirements
Structure & Layout
1. Collapsible sidebar using Shadcn UI components with border on the right
2. Three main sections: Header, Content (Navigation Menu), and Footer
3. Full height layout that spans the entire viewport height

### Header Section
- Contain 'YourdAI" brand and logo Brand/Logo 
- Horizontal layout with gap between icon and text

### Navigation Menu Section
- Four main navigation items in vertical list format:
    1. Profile (User icon) - Links to "#" (placeholder)
    2. Inputs (Plus icon) - Links to "/inputs" page (functional)
    3. Archive (Archive icon) - Links to "#" (placeholder)
    4. Settings (Settings icon) - Links to "#" (placeholder)
- Menu item styling:
    - Height: 48px (h-12)
    - Icons: 20px size (w-5 h-5)
    - Text: Medium font weight
    - Hover state: Semi-transparent accent background
    - Smooth transition animations on hover
### Footer Section
User profile card displaying:
    - Avatar placeholder: Circular container with "U" initial
    - User name: "User" text
    - Background: Semi-transparent accent color
    - Horizontal layout with proper spacing

### Technical Requirements
- Icons: Use Lucide React icons (Calendar, User, Plus, Archive, Settings)
- Navigation: Use standard anchor tags (<a>) for navigation
- Styling: Use Tailwind CSS with semantic design tokens
- Responsiveness: Sidebar should work on both desktop and mobile
- Component structure: Built with Shadcn UI Sidebar primitives

### Color Scheme
- Use semantic design tokens (primary, sidebar-accent, muted-foreground, border)
- Maintain consistent opacity levels (20%, 30%, 50%)

### Interactive Behavior
- Hover effects on menu items
- Smooth color transitions
- Collapsible functionality (handled by parent SidebarProvider)
- Mobile-responsive trigger button support
