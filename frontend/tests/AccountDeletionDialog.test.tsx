import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AccountDeletionDialog } from '@/components/parts/AccountDeletionDialog'

describe('AccountDeletionDialog', () => {
  const mockOnOpenChange = jest.fn()
  const mockOnConfirmDelete = jest.fn()

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onConfirmDelete: mockOnConfirmDelete,
    isDeleting: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the dialog when open is true', () => {
    render(<AccountDeletionDialog {...defaultProps} />)
    
    expect(screen.getByText('Delete account')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to delete this account?')).toBeInTheDocument()
  })

  it('does not render the dialog when open is false', () => {
    render(<AccountDeletionDialog {...defaultProps} open={false} />)
    
    expect(screen.queryByText('Delete account')).not.toBeInTheDocument()
  })

  it('displays warning message and data list', () => {
    render(<AccountDeletionDialog {...defaultProps} />)
    
    expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument()
    expect(screen.getByText('Your profile and settings')).toBeInTheDocument()
    expect(screen.getByText('All your schedules and tasks')).toBeInTheDocument()
    expect(screen.getByText('AI suggestions and feedback')).toBeInTheDocument()
    expect(screen.getByText('Calendar and Slack integrations')).toBeInTheDocument()
  })

  it('calls onOpenChange when Cancel button is clicked', () => {
    render(<AccountDeletionDialog {...defaultProps} />)
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onConfirmDelete when Delete button is clicked', () => {
    render(<AccountDeletionDialog {...defaultProps} />)
    
    const deleteButton = screen.getByText('Delete')
    fireEvent.click(deleteButton)
    
    expect(mockOnConfirmDelete).toHaveBeenCalledTimes(1)
  })

  it('shows loading state when isDeleting is true', () => {
    render(<AccountDeletionDialog {...defaultProps} isDeleting={true} />)
    
    expect(screen.getByText('Deleting...')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeDisabled()
    expect(screen.getByText('Deleting...')).toBeDisabled()
  })

  it('has proper button variants for destructive action', () => {
    render(<AccountDeletionDialog {...defaultProps} />)
    
    const cancelButton = screen.getByText('Cancel')
    const deleteButton = screen.getByText('Delete')
    
    // Check that buttons are present and properly configured
    expect(cancelButton).toBeInTheDocument()
    expect(deleteButton).toBeInTheDocument()
    // The destructive styling is applied via the Button component's variant prop
    expect(deleteButton).toHaveClass('bg-destructive')
  })

  it('prevents interaction when deleting', () => {
    render(<AccountDeletionDialog {...defaultProps} isDeleting={true} />)
    
    const cancelButton = screen.getByText('Cancel')
    const deleteButton = screen.getByText('Deleting...')
    
    fireEvent.click(cancelButton)
    fireEvent.click(deleteButton)
    
    // Should not call handlers when disabled
    expect(mockOnOpenChange).not.toHaveBeenCalled()
    expect(mockOnConfirmDelete).not.toHaveBeenCalled()
  })
}) 