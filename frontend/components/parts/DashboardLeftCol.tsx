import React from 'react';
import { TypographyH3, TypographyH4 } from '@/app/fonts/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sun, Sunrise, Sunset, Moon, Flower } from 'lucide-react';
import { Reorder, motion } from 'framer-motion';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import TaskItem from './TaskItem';
import { Task, FormData, Priority } from '../../lib/types';

interface DashboardLeftColProps {
  formData: FormData;
  newTask: string;
  setNewTask: (task: string) => void;
  priorities: Priority[];
  handleSimpleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleNestedChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  addTask: () => void;
  handleReorder: (newPriorities: Priority[]) => void;
  submitForm: () => void;
  handleEnergyChange: (value: string) => void;
  isLoading: boolean;
}

const DraggableCard: React.FC<{ item: Priority }> = ({ item }) => (
  <motion.div layout>
    <Card className="mb-4 cursor-move bg-gray-800 border-gray-700">
      <CardHeader className="flex flex-row items-center space-x-4 py-2">
        <CardTitle className="text-white">{item.name}</CardTitle>
      </CardHeader>
    </Card>
  </motion.div>
);

const DashboardLeftCol: React.FC<DashboardLeftColProps> = ({
  formData,
  newTask,
  setNewTask,
  priorities,
  handleSimpleChange,
  handleNestedChange,
  updateTask,
  deleteTask,
  addTask,
  handleReorder,
  submitForm,
  handleEnergyChange,
  isLoading
}) => {
  const energyOptions = [
    { value: 'high_all_day', label: 'High-Full of energy during the day', icon: Flower },
    { value: 'peak_morning', label: 'Energy peaks in the morning', icon: Sunrise },
    { value: 'peak_afternoon', label: 'Energy peaks in the afternoon', icon: Sun },
    { value: 'peak_evening', label: 'Energy peaks in the evening', icon: Sunset },
    { value: 'low_energy', label: 'Low energy, need help increasing', icon: Moon },
  ];

  return (
    <div className="h-full w-full p-6 bg-gray-900 overflow-y-auto text-white">
      <TypographyH3 className="mb-6">Edit Inputs</TypographyH3>
      <div className="space-y-6">
        <div>
          <Label htmlFor="work_start_time">Work Start Time</Label>
          <Input
            id="work_start_time"
            name="work_start_time"
            value={formData.work_start_time}
            onChange={handleSimpleChange}
            placeholder="Enter your work start time"
            className="bg-gray-800 text-white border-gray-700"
          />
        </div>
        <div>
          <Label htmlFor="work_end_time">Work End Time</Label>
          <Input
            id="work_end_time"
            name="work_end_time"
            value={formData.work_end_time}
            onChange={handleSimpleChange}
            placeholder="Enter your work end time"
            className="bg-gray-800 text-white border-gray-700"
          />
        </div>

        <div>
          <TypographyH4 className="mb-2">Tasks</TypographyH4>
          {formData.tasks.map((task: Task) => (
            <TaskItem
              key={task.id}
              task={task}
              onUpdate={updateTask}
              onDelete={deleteTask}
            />
          ))}
          <Input
            placeholder="Add new task"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTask.trim()) {
                addTask();
              }
            }}
            className="mt-2 bg-gray-800 text-white border-gray-700"
          />
          <Button 
            onClick={() => {
              if (newTask.trim()) {
                addTask();
              }
            }} 
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Add Task
          </Button>
        </div>

        <div>
          <TypographyH4 className="mb-2">Priorities (Drag to reorder)</TypographyH4>
          <Reorder.Group axis="y" values={priorities} onReorder={handleReorder}>
            {priorities.map((item) => (
              <Reorder.Item key={item.id} value={item}>
                <DraggableCard item={item} />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>

        <div>
          <TypographyH4 className="mb-2">Energy Patterns</TypographyH4>
          {energyOptions.map((option) => (
            <div key={option.value} className="flex items-center mb-2">
              <Checkbox
                id={option.value}
                checked={(formData.energy_patterns || []).includes(option.value)}
                onCheckedChange={() => handleEnergyChange(option.value)}
                className="mr-2 border-white"
              />
              <Label htmlFor={option.value} className="flex items-center">
                <option.icon className="w-4 h-4 mr-2" />
                <span>{option.label}</span>
              </Label>
            </div>
          ))}
        </div>

        <div>
          <TypographyH4 className="mb-2">Layout Preferences</TypographyH4>
          <RadioGroup
            value={formData.layout_preference.structure || ''}
            onValueChange={(value) => handleNestedChange({
              target: { name: 'layout_preference.structure', value }
            } as React.ChangeEvent<HTMLInputElement>)}
            className="space-y-2"
          >
            <div className="flex items-center">
              <RadioGroupItem value="structured" id="structured" className="border-white" />
              <Label htmlFor="structured" className="ml-2">Structured day with clear sections</Label>
            </div>
            <div className="flex items-center">
              <RadioGroupItem value="unstructured" id="unstructured" className="border-white" />
              <Label htmlFor="unstructured" className="ml-2">Flexible day without sections</Label>
            </div>
          </RadioGroup>

          {formData.layout_preference.structure === 'structured' && (
            <div className="mt-4">
              <Label htmlFor="layout_subcategory">Structured Layout Type</Label>
              <Select
                value={formData.layout_preference.subcategory || ''}
                onValueChange={(value) => handleNestedChange({
                  target: { name: 'layout_preference.subcategory', value }
                } as React.ChangeEvent<HTMLSelectElement>)}
              >
                <SelectTrigger id="layout_subcategory" className="bg-gray-800 text-white border-gray-700">
                  <SelectValue placeholder="Select a layout type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-white border-gray-700">
                  <SelectItem value="day-sections">Day Sections (Morning, Afternoon, Evening)</SelectItem>
                  <SelectItem value="priority">Priority (High, Medium, Low)</SelectItem>
                  <SelectItem value="category">Category Based (Work, Fun, Relationships, Ambition, Exercise)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <RadioGroup
            value={formData.layout_preference.timeboxed || ''}
            onValueChange={(value) => handleNestedChange({
              target: { name: 'layout_preference.timeboxed', value }
            } as React.ChangeEvent<HTMLInputElement>)}
            className="mt-4 space-y-2"
          >
            <div className="flex items-center">
              <RadioGroupItem value="timeboxed" id="timeboxed" className="border-white" />
              <Label htmlFor="timeboxed" className="ml-2">Timeboxed tasks</Label>
            </div>
            <div className="flex items-center">
              <RadioGroupItem value="untimeboxed" id="untimeboxed" className="border-white" />
              <Label htmlFor="untimeboxed" className="ml-2">Flexible timing</Label>
            </div>
          </RadioGroup>
        </div>

        <Button 
          onClick={submitForm} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
          disabled={isLoading}
        >
          {isLoading ? 'Updating...' : 'Update Schedule'}
        </Button>
      </div>
    </div>
  );
};

export default DashboardLeftCol;