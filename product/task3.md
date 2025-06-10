# TASK-03: Update UI styling
Status: To do

## Requirements
- Update the colour scheme for yourdai to integrate these settings:

### example tailwind
import type { Config } from "tailwindcss";

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
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				purple: {
					DEFAULT: '#9b87f5',
					50: '#f3f0ff',
					100: '#e9d5ff',
					200: '#d6bbfb',
					300: '#ba8ff7',
					400: '#9b87f5',
					500: '#7c3aed',
					600: '#6d28d9',
					700: '#5b21b6',
					800: '#4c1d95',
					900: '#3730a3',
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
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

### example css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Definition of the design system. All colors, gradients, fonts, etc should be defined here. */

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 215 25% 27%;

    --card: 0 0% 100%;
    --card-foreground: 215 25% 27%;

    --popover: 0 0% 100%;
    --popover-foreground: 215 25% 27%;

    --primary: 251 91% 95%;
    --primary-foreground: 251 91% 95%;

    --secondary: 220 13% 97%;
    --secondary-foreground: 215 25% 27%;

    --muted: 220 13% 97%;
    --muted-foreground: 215 16% 47%;

    --accent: 251 91% 95%;
    --accent-foreground: 215 25% 27%;

    --destructive: 0 84% 60%;
    --destructive-foreground: 210 40% 98%;

    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 251 91% 95%;

    --radius: 0.75rem;

    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 215 25% 27%;
    --sidebar-primary: 251 91% 95%;
    --sidebar-primary-foreground: 215 25% 27%;
    --sidebar-accent: 220 13% 95%;
    --sidebar-accent-foreground: 215 25% 27%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 251 91% 95%;
  }

  .dark {
    --background: 215 28% 17%;
    --foreground: 213 31% 91%;

    --card: 215 28% 17%;
    --card-foreground: 213 31% 91%;

    --popover: 215 28% 17%;
    --popover-foreground: 213 31% 91%;

    --primary: 251 91% 95%;
    --primary-foreground: 215 28% 17%;

    --secondary: 215 25% 27%;
    --secondary-foreground: 213 31% 91%;

    --muted: 215 25% 27%;
    --muted-foreground: 217 10% 65%;

    --accent: 215 25% 27%;
    --accent-foreground: 213 31% 91%;

    --destructive: 0 63% 31%;
    --destructive-foreground: 213 31% 91%;

    --border: 215 25% 27%;
    --input: 215 25% 27%;
    --ring: 251 91% 95%;

    --sidebar-background: 215 28% 17%;
    --sidebar-foreground: 213 31% 91%;
    --sidebar-primary: 251 91% 95%;
    --sidebar-primary-foreground: 215 28% 17%;
    --sidebar-accent: 215 25% 27%;
    --sidebar-accent-foreground: 213 31% 91%;
    --sidebar-border: 215 25% 27%;
    --sidebar-ring: 251 91% 95%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground font-medium;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
}

/* Custom gradients and effects */
@layer utilities {
  .gradient-purple {
    background: linear-gradient(135deg, #9b87f5 0%, #7c3aed 100%);
  }
  
  .gradient-purple-soft {
    background: linear-gradient(135deg, #f3f0ff 0%, #e9d5ff 100%);
  }
  
  .shadow-purple {
    box-shadow: 0 4px 14px 0 rgba(155, 135, 245, 0.15);
  }
  
  .border-purple {
    border-color: #9b87f5;
  }
}