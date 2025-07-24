# TASK-13: Update dashboard UI
Status: To do

## Problem
Main dashboard has inconsistent UI and doesn't look the cleanest.

## Requirements
- follow the attached image of a prototyped UI for reference on layout
- dashboard header:
    - more centred than left aligned
    - display current date between left and right chevron arrow
    - on desktop, display CTA: "+ Add Task" instead of a FAB
    - on mobile viewport, keep FAB
- main dashboard
    - remove bottom divider from each section
    - display each @EditableScheduleRow as a card/tile like layout
    - hide AI sparkle icon and 3 dot ellipses on each @EditableScheduleRow by default
        - only show them on hover
        - show AI sparkle animation
- refer to the styling of the following components as reference:

DateHeader.tsx: "import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const DateHeader = () => {
  const today = new Date();
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayName = weekdays[today.getDay()];
  const day = today.getDate();
  const month = months[today.getMonth()];

  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <Calendar className="w-5 h-5 text-muted-foreground" />
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <ChevronLeft size={16} />
          </Button>
          
          <h1 className="text-xl font-semibold text-foreground">
            {dayName}, {day} {month}
          </h1>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
      
      <Button
        size="sm"
        className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 px-4 shadow-soft hover:shadow-card transition-all duration-200 hover:scale-105"
      >
        <Plus size={16} />
        Add Task
      </Button>
    </div>
  );
};"

TaskList.tsx:
"import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Sparkles, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  text: string;
  completed: boolean;
  category: string;
}

interface TaskCategory {
  id: string;
  name: string;
  emoji: string;
  tasks: Task[];
}

const initialCategories: TaskCategory[] = [
  {
    id: "work",
    name: "Work",
    emoji: "🦖",
    tasks: [
      { id: "1", text: "reach out to updoc on technical apm", completed: true, category: "work" },
      { id: "2", text: "create yourdai logo", completed: true, category: "work" },
      { id: "3", text: "add yourdai logo to pages", completed: true, category: "work" },
      { id: "4", text: "dogfood yourdai", completed: false, category: "work" },
      { id: "5", text: "reskin home page", completed: false, category: "work" },
    ]
  },
  {
    id: "exercise",
    name: "Exercise", 
    emoji: "🦖",
    tasks: [
      { id: "6", text: "walkies n talkies", completed: false, category: "exercise" },
    ]
  },
  {
    id: "relationships",
    name: "Relationships",
    emoji: "🦖", 
    tasks: []
  },
  {
    id: "fun",
    name: "Fun",
    emoji: "🦖",
    tasks: []
  }
];

export const TaskList = () => {
  const [categories, setCategories] = useState<TaskCategory[]>(initialCategories);

  const toggleTask = (categoryId: string, taskId: string) => {
    setCategories(prev => 
      prev.map(category => 
        category.id === categoryId 
          ? {
              ...category,
              tasks: category.tasks.map(task =>
                task.id === taskId 
                  ? { ...task, completed: !task.completed }
                  : task
              )
            }
          : category
      )
    );
  };

  const handleAIAction = (taskId: string) => {
    console.log("AI action triggered for task:", taskId);
  };

  return (
    <div className="space-y-8">
      {categories.map((category) => (
        <div key={category.id} className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">{category.emoji}</span>
            <h2 className="text-lg font-semibold text-foreground">{category.name}</h2>
          </div>
          
          <div className="space-y-2">
            {category.tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "group flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-task-hover transition-all duration-200 shadow-soft",
                  task.completed && "opacity-60"
                )}
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => toggleTask(category.id, task.id)}
                  className="h-5 w-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-200"
                />
                
                <span 
                  className={cn(
                    "flex-1 text-foreground transition-all duration-200",
                    task.completed && "line-through text-muted-foreground"
                  )}
                >
                  {task.text}
                </span>
                
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAIAction(task.id)}
                    className="h-8 w-8 p-0 bg-gradient-to-br from-primary to-primary/80 hover:from-primary hover:to-primary text-primary-foreground hover:scale-105 transition-all duration-200"
                  >
                    <Sparkles size={14} className="animate-sparkle" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
                  >
                    <MoreHorizontal size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};"

App.css: "#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}"

index.css: "@tailwind base;
@tailwind components;
@tailwind utilities;

/* Definition of the design system. All colors, gradients, fonts, etc should be defined here. 
All colors MUST be HSL.
*/

@layer base {
  :root {
    --background: 250 100% 99%;
    --foreground: 220 15% 15%;

    --card: 0 0% 100%;
    --card-foreground: 220 15% 15%;

    --popover: 0 0% 100%;
    --popover-foreground: 220 15% 15%;

    --primary: 242 47% 58%;
    --primary-foreground: 250 100% 99%;

    --secondary: 246 20% 95%;
    --secondary-foreground: 220 15% 25%;

    --muted: 246 20% 95%;
    --muted-foreground: 220 10% 46%;

    --accent: 246 20% 95%;
    --accent-foreground: 220 15% 25%;

    --destructive: 0 84% 60%;
    --destructive-foreground: 250 100% 99%;

    --border: 246 20% 90%;
    --input: 246 20% 90%;
    --ring: 242 47% 58%;

    --radius: 0.75rem;

    /* Custom design tokens */
    --ai-gradient: linear-gradient(135deg, 267 84% 73%, 242 47% 58%);
    --task-hover: 246 25% 97%;
    --shadow-soft: 220 15% 15% / 0.05;
    --shadow-card: 220 15% 15% / 0.08;
    --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    --sidebar-background: 0 0% 98%;

    --sidebar-foreground: 240 5.3% 26.1%;

    --sidebar-primary: 240 5.9% 10%;

    --sidebar-primary-foreground: 0 0% 98%;

    --sidebar-accent: 240 4.8% 95.9%;

    --sidebar-accent-foreground: 240 5.9% 10%;

    --sidebar-border: 220 13% 91%;

    --sidebar-ring: 217.2 91.2% 59.8%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;

    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;

    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;

    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;

    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;

    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;

    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;

    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;

    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
    --sidebar-background: 240 5.9% 10%;
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-primary: 224.3 76.3% 48%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
    --sidebar-border: 240 3.7% 15.9%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}"

tailwind.config.ts: "import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				'task-hover': 'hsl(var(--task-hover))',
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'task-complete': {
					'0%': { transform: 'scale(1)', opacity: '1' },
					'50%': { transform: 'scale(1.05)', opacity: '0.8' },
					'100%': { transform: 'scale(1)', opacity: '0.6' }
				},
				'sparkle': {
					'0%, 100%': { transform: 'rotate(0deg) scale(1)', opacity: '0.8' },
					'50%': { transform: 'rotate(180deg) scale(1.1)', opacity: '1' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'task-complete': 'task-complete 0.3s ease-out',
				'sparkle': 'sparkle 2s ease-in-out infinite'
			},
			boxShadow: {
				'soft': '0 2px 8px hsl(var(--shadow-soft))',
				'card': '0 4px 12px hsl(var(--shadow-card))',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
