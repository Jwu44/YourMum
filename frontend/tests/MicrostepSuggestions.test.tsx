import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import MicrostepSuggestions from '../MicrostepSuggestions'
import { type Task } from '@/lib/types'

describe('MicrostepSuggestions - Optimized', () => {
  const mockMicrosteps: Task[] = [
    {
      id: '1',
      text: 'First microstep',
      completed: false,
      is_section: false,
      rationale: 'This is the first step'
    },
    {
      id: '2',
      text: 'Second microstep',
      completed: false,
      is_section: false,
      rationale: 'This is the second step'
    },
    {
      id: '3',
      text: 'Third microstep without rationale',
      completed: false,
      is_section: false
    }
  ]

  const mockProps = {
    microsteps: mockMicrosteps,
    onAccept: jest.fn(),
    onReject: jest.fn(),
    className: 'test-class'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render all microsteps with correct text', () => {
    render(<MicrostepSuggestions {...mockProps} />)

    expect(screen.getByText('First microstep')).toBeInTheDocument()
    expect(screen.getByText('Second microstep')).toBeInTheDocument()
    expect(screen.getByText('Third microstep without rationale')).toBeInTheDocument()
  })

  it('should display rationale when available', () => {
    render(<MicrostepSuggestions {...mockProps} />)

    expect(screen.getByText('This is the first step')).toBeInTheDocument()
    expect(screen.getByText('This is the second step')).toBeInTheDocument()
  })

  it('should not display rationale when not available', () => {
    const microstepsWithoutRationale = [
      {
        id: '1',
        text: 'Step without rationale',
        completed: false,
        is_section: false
      }
    ]

    render(<MicrostepSuggestions {...mockProps} microsteps={microstepsWithoutRationale} />)

    expect(screen.getByText('Step without rationale')).toBeInTheDocument()
    // Should not have any secondary rationale text (only main text)
    const rationaleElements = screen.queryAllByText(/This is/i)
    expect(rationaleElements).toHaveLength(0)
  })

  it('should call onAccept when accept button is clicked', () => {
    render(<MicrostepSuggestions {...mockProps} />)

    const acceptButtons = screen.getAllByLabelText('Accept microstep')
    fireEvent.click(acceptButtons[0])

    expect(mockProps.onAccept).toHaveBeenCalledWith(mockMicrosteps[0])
    expect(mockProps.onAccept).toHaveBeenCalledTimes(1)
  })

  it('should call onReject when reject button is clicked', () => {
    render(<MicrostepSuggestions {...mockProps} />)

    const rejectButtons = screen.getAllByLabelText('Reject microstep')
    fireEvent.click(rejectButtons[1])

    expect(mockProps.onReject).toHaveBeenCalledWith(mockMicrosteps[1])
    expect(mockProps.onReject).toHaveBeenCalledTimes(1)
  })

  it('should render disabled checkboxes for all microsteps', () => {
    render(<MicrostepSuggestions {...mockProps} />)

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(3)

    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeDisabled()
      expect(checkbox).not.toBeChecked()
    })
  })

  it('should apply custom className', () => {
    const { container } = render(<MicrostepSuggestions {...mockProps} />)
    
    const containerDiv = container.firstChild as HTMLElement
    expect(containerDiv).toHaveClass('test-class')
  })

  it('should render with correct accessibility attributes', () => {
    render(<MicrostepSuggestions {...mockProps} />)

    // Check that buttons have proper aria labels
    expect(screen.getAllByLabelText('Accept microstep')).toHaveLength(3)
    expect(screen.getAllByLabelText('Reject microstep')).toHaveLength(3)
  })

  it('should handle empty microsteps array', () => {
    render(<MicrostepSuggestions {...mockProps} microsteps={[]} />)

    // Should render the container but no microstep items
    expect(screen.queryByText('First microstep')).not.toBeInTheDocument()
  })
})