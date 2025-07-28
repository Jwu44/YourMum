# TASK-19: Implement nested tasks via drag
Status: To do
## Problem
Users don't have the ability to drag tasks to be indented/outdented

## Requirements
- when dragging a task X under and slightly right (20px) from task Y, then show a purple horizontal bar with progressive opacity (purple with 2 opacities) to indicate indentation
    - once user releases the task, task is indented
    - task X is now a child of task Y
- when dragging a task X under and slightly left (20px) from task Y, then show purple horizontal bar (purple with 1 opacity) to outdent
    - once user releases task, task is outdented
    - task X is now below task Y positonally (no parent-child)

- Previous implementation which worked but is a bit complicated:
"  // Enhanced drag and drop handlers
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
"