import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import MicrostepSuggestions from '@/components/parts/MicrostepSuggestions';
import { TypographyH4 } from '../../app/fonts/text';
import { Sparkles, Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useForm } from '../../lib/FormContext';
import { useToast } from "@/hooks/use-toast";
import { 
  Task
} from '../../lib/types';
import { 
  handleMicrostepDecomposition
} from '../../lib/helper';
import { isBrowser } from '../../lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EditableScheduleRowProps {
  task: Task;
  index: number;
  onUpdateTask: (task: Task) => void;
  moveTask: (dragIndex: number, hoverIndex: number, shouldIndent: boolean, targetSection: string | null) => void;
  isSection: boolean;
  children?: React.ReactNode;
  allTasks: Task[];
  onEditTask?: (task: Task) => void; // New prop for edit functionality
  onDeleteTask?: (task: Task) => void; // New prop for delete functionality
}

// Interface for managing drag state
interface DragState {
  isDragTarget: boolean;
  dragType: 'above' | 'below' | 'indent' | null;
  indentationLevel: number;
  cursorPastCheckbox: boolean;
}

// Add this interface for the drag indicator props
interface DragIndicatorProps {
  left: number;
  width: string | number;
  opacity: number;
}

/**
 * Get custom emoji from localStorage
 */
const getCustomEmojis = (): { [sectionName: string]: string } => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem('sectionCustomEmojis');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

/**
 * Save custom emoji to localStorage
 */
const saveCustomEmoji = (sectionName: string, emoji: string) => {
  if (typeof window === 'undefined') return;
  try {
    const customEmojis = getCustomEmojis();
    customEmojis[sectionName] = emoji;
    localStorage.setItem('sectionCustomEmojis', JSON.stringify(customEmojis));
  } catch (error) {
    console.error('Failed to save custom emoji:', error);
  }
};

/**
 * Common emojis for quick selection
 */
const COMMON_EMOJIS = [
  '⚡️', '✏️', '☕️', '🌅', '🌆', '🎑', '🦕',
  '🎯', '💼', '🏠', '💪', '🧠', '❤️', '🎉',
  '📚', '🍎', '🚀', '⭐', '🔥', '💎', '🌟',
  '📝', '💻', '🎨', '🎵', '🏃', '🛏️', '🍽️'
];

/**
 * Simple emoji picker component using Popover
 */
interface EmojiPickerProps {
  currentEmoji: string;
  onEmojiChange: (emoji: string) => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ currentEmoji, onEmojiChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleEmojiSelect = useCallback((emoji: string) => {
    onEmojiChange(emoji);
    setIsOpen(false);
  }, [onEmojiChange]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "text-lg cursor-pointer transition-all duration-200 select-none border-none bg-transparent p-1 rounded hover-selection",
            isHovered && "scale-110"
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          title="Click to change emoji"
        >
          {currentEmoji}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <div className="grid grid-cols-7 gap-1">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiSelect(emoji)}
              className={cn(
                "w-8 h-8 flex items-center justify-center text-lg hover-selection rounded transition-colors",
                emoji === currentEmoji && "selection-active"
              )}
              title={`Select ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Click any emoji to select it
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/**
 * Get the appropriate emoji for a section based on its name
 * First checks for custom emojis, then falls back to hardcoded mapping
 */
const getSectionIcon = (sectionName: string, onEmojiChange?: (emoji: string) => void): React.ReactNode => {
  const customEmojis = getCustomEmojis();
  
  // Check for custom emoji first
  if (customEmojis[sectionName]) {
    return (
      <EmojiPicker 
        currentEmoji={customEmojis[sectionName]}
        onEmojiChange={(emoji) => {
          saveCustomEmoji(sectionName, emoji);
          onEmojiChange?.(emoji);
        }}
      />
    );
  }

  const lowerName = sectionName.toLowerCase();
  let defaultEmoji = '🦕'; // Default emoji
  
  // Priority-based sections
  if (lowerName.includes('high priority')) {
    defaultEmoji = '⚡️';
  } else if (lowerName.includes('medium priority')) {
    defaultEmoji = '✏️';
  } else if (lowerName.includes('low priority')) {
    defaultEmoji = '☕️';
  }
  // Time-based sections
  else if (lowerName.includes('morning')) {
    defaultEmoji = '🌅';
  } else if (lowerName.includes('afternoon') || lowerName.includes('arvo')) {
    defaultEmoji = '🌆';
  } else if (lowerName.includes('evening') || lowerName.includes('night')) {
    defaultEmoji = '🎑';
  }
  
  return (
    <EmojiPicker 
      currentEmoji={defaultEmoji}
      onEmojiChange={(emoji) => {
        saveCustomEmoji(sectionName, emoji);
        onEmojiChange?.(emoji);
      }}
    />
  );
};

const EditableScheduleRow: React.FC<EditableScheduleRowProps> = ({ 
  task, 
  index,
  onUpdateTask, 
  moveTask,
  isSection,
  onEditTask, // New prop for edit functionality
  onDeleteTask // New prop for delete functionality
}) => {
  // Local UI states
  const [dragState, setDragState] = useState<DragState>({
    isDragTarget: false,
    dragType: null,
    indentationLevel: 0,
    cursorPastCheckbox: false
  });
  
  // Refs for DOM measurements
  const rowRef = useRef<HTMLDivElement>(null);
  const checkboxRef = useRef<HTMLDivElement>(null);

  // New state for microsteps
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [suggestedMicrosteps, setSuggestedMicrosteps] = useState<Task[]>([]);
  const [showMicrosteps, setShowMicrosteps] = useState(false);

  // Hooks
  const { state: formData } = useForm();
  const { toast } = useToast();

  // Can only decompose non-section, non-microstep, non-subtask tasks
  const canDecompose = !isSection && !task.is_microstep && !task.is_subtask;

  // Add state for re-rendering when emoji changes
  const [, forceUpdate] = useState(0);

  // Callback to force re-render when emoji changes
  const handleEmojiChange = useCallback(() => {
    forceUpdate(prev => prev + 1);
  }, []);

  // Handlers for task operations
  const handleToggleComplete = useCallback((checked: boolean) => {
    onUpdateTask({ 
      ...task, 
      completed: checked,
      categories: task.categories || []
    });
  }, [task, onUpdateTask]);

  /**
   * Handle edit task action
   * Add delay to allow dropdown menu overlay to fully close and cleanup
   */
  const handleEditTask = useCallback(() => {
    try {
      if (onEditTask) {
        // 🔧 FIX: Add small delay to allow dropdown overlay cleanup
        // This prevents race condition between dropdown and drawer overlays
        setTimeout(() => {
          onEditTask(task);
        }, 50); // Minimal delay for overlay cleanup
      }
    } catch (error) {
      console.error('Error triggering edit task:', error);
      toast({
        title: "Error",
        description: "Failed to open edit dialog",
        variant: "destructive",
      });
    }
  }, [task, onEditTask, toast]);

  /**
   * Handle delete task action
   * Add delay to allow dropdown menu overlay to fully close and cleanup
   */
  const handleDeleteTask = useCallback(() => {
    try {
      if (onDeleteTask) {
        // 🔧 FIX: Add small delay to allow dropdown overlay cleanup
        // This prevents race condition between dropdown overlays
        setTimeout(() => {
          onDeleteTask(task);
        }, 50); // Minimal delay for overlay cleanup
      }
    } catch (error) {
      console.error('Error triggering delete task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  }, [task, onDeleteTask, toast]);

  // Enhanced drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (isBrowser() && e.dataTransfer) {
      e.dataTransfer.setData('text/plain', index.toString());
      e.dataTransfer.effectAllowed = 'move';
      if (rowRef.current) {
        rowRef.current.style.opacity = '0.5';
      }
    }
  }, [index]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isBrowser() || !e.dataTransfer || isSection) {
      return;
    }

    e.dataTransfer.dropEffect = 'move';
    
    try {
      const rect = rowRef.current?.getBoundingClientRect();
      const checkboxRect = checkboxRef.current?.getBoundingClientRect();
      
      if (!rect || !checkboxRect) {
        return;
      }

      // Calculate cursor position relative to checkbox
      const cursorPastCheckbox = e.clientX > (checkboxRect.right);
      
      // Calculate available indentation levels based on current task level
      const maxIndentLevel = cursorPastCheckbox ? 
        Math.min((task.level || 0) + 1, 3) : 0; // Limit max indent to 3 levels
      
      // Calculate vertical position for drag type
      const mouseY = e.clientY - rect.top;
      const threshold = rect.height / 3;

      const newDragState: DragState = {
        isDragTarget: true,
        dragType: null,
        indentationLevel: maxIndentLevel,
        cursorPastCheckbox
      };

      if (mouseY < threshold) {
        newDragState.dragType = 'above';
      } else if (mouseY > rect.height - threshold) {
        newDragState.dragType = 'below';
      } else {
        newDragState.dragType = 'indent';
      }

      setDragState(newDragState);
      
    } catch (error) {
      console.error('Error in handleDragOver:', error);
      // Reset to safe state on error
      setDragState({
        isDragTarget: false,
        dragType: null,
        indentationLevel: 0,
        cursorPastCheckbox: false
      });
    }
  }, [isSection, task.level]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragState({
      isDragTarget: false,
      dragType: null,
      indentationLevel: 0,
      cursorPastCheckbox: false
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isBrowser() && e.dataTransfer) {
      const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      
      if (isSection) {
        moveTask(dragIndex, index, false, task.text);
      } else {
        // Only indent if we're in indent mode and cursor is past checkbox
        const shouldIndent = dragState.dragType === 'indent' && dragState.cursorPastCheckbox;
        
        // If dropping below, we need to adjust the target index
        const targetIndex = dragState.dragType === 'below' ? index + 1 : index;
        
        moveTask(dragIndex, targetIndex, shouldIndent, null);
      }
    }
    
    // Reset drag state
    setDragState({
      isDragTarget: false,
      dragType: null,
      indentationLevel: 0,
      cursorPastCheckbox: false
    });
  }, [index, moveTask, dragState, isSection, task.text]);

  const handleDragEnd = useCallback(() => {
    if (rowRef.current) {
      rowRef.current.style.opacity = '1';
    }
  }, []);

  // Implements blue line indicator behaviour
  const getDragIndicators = useCallback(() => {
    if (!dragState.isDragTarget) return null;

    if (!dragState.cursorPastCheckbox || dragState.dragType === 'above') {
      // Single line for regular reordering
      return (
        <div
          className="absolute right-0 left-0 h-0.5 bg-blue-500"
          style={{ 
            opacity: 0.5,
            bottom: '-1px' // Position at bottom of row
          }}
        />
      );
    }

    if (dragState.dragType === 'indent') {
      const totalLevels = dragState.indentationLevel + 1;
      const indicators: DragIndicatorProps[] = [];

      for (let i = 0; i < totalLevels; i++) {
        const isFirstLine = i === 0;
        const leftOffset = i * 20; // 20px indent per level
        const opacity = 0.3 + (i * 0.2); // Increasing opacity for each level

        indicators.push({
          left: leftOffset,
          width: isFirstLine ? 8 : `calc(100% - ${leftOffset}px)`,
          opacity
        });
      }

      return (
        <div className="absolute inset-0 pointer-events-none">
          {indicators.map((indicator, index) => (
            <React.Fragment key={index}>
              <div
                className="absolute h-0.5 bg-blue-500"
                style={{
                  left: indicator.left,
                  width: indicator.width,
                  opacity: indicator.opacity,
                  bottom: '-1px', // Position at bottom of row
                  transform: 'none' // Remove vertical centering
                }}
              />
              {index < indicators.length - 1 && (
                <div className="w-1" /> // 2px spacing between lines
              )}
            </React.Fragment>
          ))}
        </div>
      );
    }

    return null;
  }, [dragState]);

  /**
   * Handles task decomposition into microsteps
   * 
   * Uses the AI service to break down a task into smaller, more manageable steps
   * and presents them to the user for selection.
   */
  const handleDecompose = useCallback(async () => {
    // Guard clause - only proceed if decomposition is allowed and not already in progress
    if (!canDecompose || isDecomposing) return;

    try {
      // Set loading state and clear any existing microsteps
      setIsDecomposing(true);
      setShowMicrosteps(false);
      
      // Get microstep texts from backend
      const microstepTexts = await handleMicrostepDecomposition(task, formData);
      
      // Convert microstep texts into full Task objects
      // Updated to handle both string array and object array responses
      const microstepTasks = microstepTexts.map((step: string | { 
        text: string; 
        rationale?: string;
        estimated_time?: string;
        energy_level_required?: 'low' | 'medium' | 'high';
      }) => {
        // Handle both string and object formats
        const isObject = typeof step !== 'string';
        const text = isObject ? step.text : step;
        const rationale = isObject ? step.rationale : undefined;
        const estimatedTime = isObject ? step.estimated_time : undefined;
        const energyLevel = isObject ? step.energy_level_required : undefined;
        
        return {
          id: crypto.randomUUID(), // Generate unique ID for each microstep
          text, // The microstep text
          rationale, // Store explanation if available
          estimated_time: estimatedTime, // Store time estimate if available
          energy_level_required: energyLevel, // Store energy level if available
          is_microstep: true, // Mark as microstep
          completed: false,
          is_section: false,
          section: task.section, // Inherit section from parent
          parent_id: task.id, // Link to parent task
          level: (task.level || 0) + 1, // Indent one level from parent
          type: 'microstep',
          categories: task.categories || [], // Inherit categories from parent
          // Add layout-related information for proper rendering
          section_index: 0 // Will be recalculated when added to schedule
        };
      });

      // Update UI with new microsteps
      setSuggestedMicrosteps(microstepTasks);
      setShowMicrosteps(true);
      
      // Show success message
      toast({
        title: "Success",
        description: "Select which microsteps to add",
      });
      
    } catch (error) {
      // Handle and display any errors
      console.error('Error decomposing task:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to decompose task",
        variant: "destructive",
      });
    } finally {
      // Reset loading state regardless of outcome
      setIsDecomposing(false);
    }
  }, [canDecompose, task, formData, toast, isDecomposing]);

  /**
   * Handles user acceptance of a suggested microstep
   * 
   * Converts a microstep suggestion into an actual task and adds it to the schedule
   * Preserves layout information and parent-child relationships.
   * 
   * @param microstep - The microstep suggestion to convert to a task
   */
  const handleMicrostepAccept = useCallback(async (microstep: Task) => {
    try {      
      // Create a new task object with all required properties for a subtask
      const newSubtask: Task = {
        ...microstep,
        id: crypto.randomUUID(), // Generate new ID for the actual task
        is_subtask: true,
        parent_id: task.id, // Link to parent task
        level: (task.level || 0) + 1, // Indent one level from parent
        section: task.section, // Inherit section from parent
        categories: task.categories || [], // Inherit categories from parent
        completed: false,
        is_section: false,
        type: 'task', // Change type from 'microstep' to 'task'
        start_time: null,
        end_time: null,
        is_recurring: null,
        section_index: 0, // Will be recalculated by EditableSchedule
        // Include additional properties from the microstep if available
        rationale: microstep.rationale || task.rationale,
        estimated_time: microstep.estimated_time || task.estimated_time,
        energy_level_required: microstep.energy_level_required || task.energy_level_required
      };

      // Call the main onUpdateTask function which will handle the task creation
      onUpdateTask(newSubtask);

      // Remove the microstep from suggestions
      setSuggestedMicrosteps(prev => prev.filter(step => step.id !== microstep.id));

      // Close suggestions panel when all microsteps are handled
      if (suggestedMicrosteps.length <= 1) {
        setShowMicrosteps(false);
      }

      // Show success toast
      toast({
        title: "Success",
        description: "Microstep added to schedule",
      });

    } catch (error) {
      console.error('Error accepting microstep:', error);
      toast({
        title: "Error",
        description: "Failed to add microstep to schedule",
        variant: "destructive",
      });
    }
  }, [task, onUpdateTask, suggestedMicrosteps.length, toast]);

  // Update the handleMicrostepReject to simply remove the suggestion
  const handleMicrostepReject = useCallback((microstep: Task) => {
    // Remove the rejected microstep from suggestions
    setSuggestedMicrosteps(prev => prev.filter(step => step.id !== microstep.id));

    // Close suggestions panel when all microsteps are handled
    if (suggestedMicrosteps.length <= 1) {
      setShowMicrosteps(false);
    }
  }, [suggestedMicrosteps.length]);

  // Enhanced task actions with decompose button and ellipses dropdown
  const renderTaskActions = () => (
    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      {/* Decompose button - existing functionality */}
      {canDecompose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDecompose}
          disabled={isDecomposing}
          className="h-8 w-8 p-0 gradient-accent hover:opacity-90 text-primary-foreground hover:scale-105 transition-all duration-200"
        >
          {isDecomposing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 animate-sparkle" />
          )}
        </Button>
      )}

      {/* Ellipses dropdown menu - new functionality */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
            aria-label="Task actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={handleEditTask}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleDeleteTask}
            className="flex items-center gap-2 cursor-pointer text-destructive hover-selection"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      <div
        ref={rowRef}
        draggable={!isSection && isBrowser()}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        className={cn(
          "relative flex items-center",
          isSection ? "cursor-default" : "cursor-move",
          isDecomposing && "animate-pulse",
          task.level && task.level > 0 ? "pl-8" : "",
          // Section styling
          isSection ? "mt-6 mb-4" : 
          // Task card styling following TaskList.tsx reference
          "group gap-4 p-4 my-2 rounded-xl border border-border bg-card hover:bg-task-hover transition-all duration-200 shadow-soft"
        )}
        style={{
          marginLeft: task.is_subtask ? `${(task.level || 1) * 20}px` : 0,
          minHeight: isSection ? '48px' : 'auto',
        }}
      >
        {/* Task/Section Content */}
        {!isSection && (
          <>
            <div ref={checkboxRef} className="flex items-center">
              {task.is_subtask && (
                <div className="w-4 h-4 mr-2 border-l border-b border-muted" />
              )}
              <Checkbox
                checked={task.completed}
                onCheckedChange={handleToggleComplete}
                className="h-5 w-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-200"
              />
            </div>
          </>
        )}

        {isSection ? (
          <div className="flex items-center gap-3 px-4 py-3">
            {getSectionIcon(task.text, handleEmojiChange)}
            <TypographyH4 className="text-foreground font-semibold mb-0">
              {task.text}
            </TypographyH4>
          </div>
        ) : (
          <span className={cn(
            "flex-1 text-foreground transition-all duration-200",
            task.completed && "line-through text-muted-foreground"
          )}>
            {task.start_time && task.end_time ? 
              `${task.start_time} - ${task.end_time}: ` : ''}
            {task.text}
          </span>
        )}

        {/* Task Actions - only show for non-section tasks */}
        {!isSection && renderTaskActions()}

        {/* Enhanced Drag Indicators */}
        {getDragIndicators()}
      </div>

      {/* Microstep Suggestions */}
      {showMicrosteps && suggestedMicrosteps.length > 0 && (
        <MicrostepSuggestions
          microsteps={suggestedMicrosteps}
          onAccept={handleMicrostepAccept}
          onReject={handleMicrostepReject}
          className="mt-2"
        />
      )}
    </motion.div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(EditableScheduleRow);