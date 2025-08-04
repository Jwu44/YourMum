import React, { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { X } from 'lucide-react'
import { type Task } from '@/lib/types'

interface TaskItemProps {
  task: Task
  onUpdate: (task: Task) => void
  onDelete: (id: string) => void
}

const categories = ['Exercise', 'Relationships', 'Fun', 'Ambition', 'Work']

const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTask, setEditedTask] = useState(task.text)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(task.categories || [])
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  const handleUpdate = useCallback(() => {
    if (editedTask.trim() !== task.text || selectedCategories !== task.categories) {
      onUpdate({
        ...task,
        text: editedTask.trim(),
        categories: selectedCategories
      })
    }
    setIsEditing(false)
  }, [editedTask, selectedCategories, task, onUpdate])

  const handleCategorySelect = useCallback((category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }, [])

  const handleCategoriesConfirm = useCallback(() => {
    onUpdate({ ...task, categories: selectedCategories })
    setIsPopoverOpen(false)
  }, [task, selectedCategories, onUpdate])

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'Work': return 'bg-blue-500'
      case 'Fun': return 'bg-yellow-500'
      case 'Relationships': return 'bg-purple-500'
      case 'Ambition': return 'bg-orange-500'
      case 'Exercise': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="flex items-center my-2 gap-2 sm:gap-3">
      {isEditing
        ? (
        <Input
          value={editedTask}
          onChange={(e) => { setEditedTask(e.target.value) }}
          onBlur={handleUpdate}
          onKeyPress={(e) => e.key === 'Enter' && handleUpdate()}
          className="flex-grow min-h-[44px] text-base"
        />
          )
        : (
        <div className="flex-grow cursor-pointer text-white py-3 px-2 rounded-md hover:bg-accent/10 transition-colors min-h-[44px] flex items-center" onClick={() => { setIsEditing(true) }}>
          {task.text}
        </div>
          )}
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <div className="flex items-center cursor-pointer">
            <div className="flex flex-wrap items-center gap-1">
              {selectedCategories.map((category, index) => (
                <Badge key={index} className={`text-xs ${getCategoryColor(category)}`}>
                  {category}
                </Badge>
              ))}
              <span className="inline-flex items-center justify-center w-11 h-11 sm:w-8 sm:h-8 rounded-full bg-secondary text-secondary-foreground font-bold text-lg hover:bg-secondary/80 transition-colors">
                +
              </span>
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat} className="flex items-center">
                <Checkbox
                  id={`category-${cat}`}
                  checked={selectedCategories.includes(cat)}
                  onCheckedChange={() => { handleCategorySelect(cat) }}
                  className="mr-3 h-5 w-5"
                />
                <label
                  htmlFor={`category-${cat}`}
                  className="flex-grow cursor-pointer py-2 text-base"
                >
                  {cat}
                </label>
              </div>
            ))}
          </div>
          <Button onClick={handleCategoriesConfirm} className="w-full mt-4 h-11">
            Confirm
          </Button>
        </PopoverContent>
      </Popover>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => { onDelete(task.id) }}
        className="h-11 w-11 p-0 sm:h-8 sm:w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
        aria-label="Delete task"
      >
        <X className="h-5 w-5 sm:h-4 sm:w-4" />
      </Button>
    </div>
  )
}

export default React.memo(TaskItem)
