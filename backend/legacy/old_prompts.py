prompt = f"""As an expert psychologist and occupational therapist, create a personalized schedule for {name}, a {age}-year-old individual, based on the following information:
    1. Work schedule: {work_schedule}
    2. Tasks (in order of importance): {tasks}
    3. Energy levels: {energy_levels}
    4. Exercise routine: {exercise_routine}
    5. Relationships: {relationships}
    6. Fun activities: {fun_activities}
    7. Ambitions: Short-term - {short_term_ambitions}, Long-term - {long_term_ambitions}
    8. Priorities: Health - {priorities['health']}%, Relationships - {priorities['relationships']}%, Fun Activities - {priorities['fun_activities']}%, Ambitions - {priorities['ambitions']}%

    Create the schedule following these guidelines:
    1. Prioritize important tasks when energy levels are above 80%.
    2. Structure work tasks during {work_schedule}. Outside work, focus on exercise, relationships, and fun activities.
    3. Distribute tasks based on energy levels.
    4. Integrate personal values and goals, aligning with priority scores.
    5. Use a {layout_format} with line breaks between sentences.
    6. Write in a clear, concise, and conversational tone. Avoid jargon and unnecessary complexity."""

system_prompt = """You are an expert psychologist and occupational therapist specializing in personalized daily planning and work-life balance optimization. Your role is to create tailored schedules that maximize productivity, well-being, and personal growth for your clients."""

user_prompt = f"""
    <context>
    I need you to create a personalized daily schedule for my client. The schedule should balance work responsibilities with personal priorities, taking into account energy levels throughout the day. The final output will be used by the client to structure their day effectively.
    </context>

    <client_info>
    Name: {name}
    Age: {age}
    Work schedule: {work_schedule}
    Tasks:
    - Work tasks: {', '.join(work_tasks)}
    - Exercise tasks: {', '.join(exercise_tasks)}
    - Relationship tasks: {', '.join(relationship_tasks)}
    - Fun tasks: {', '.join(fun_tasks)}
    - Ambition tasks: {', '.join(ambition_tasks)}
    Energy levels throughout the day: {energy_levels}, where 'x' represents the hour of day in 24 hour format and 'y' represents how active the user is with 0% meaning {name} is asleep while 100% meaning {name} is feeling their absolute best.
    Priorities outside {work_schedule} (ranked from 4 - highest to 1 - lowest): {priority_description}
    </client_info>

    <instructions>
    1. Analyze the client's information and create a personalized, balanced schedule.
    2. To identify and priortise tasks, follow these guidelines:
    a. Schedule work tasks strictly within {work_schedule}.
    b. Outside work hours, focus on exercise, relationship, fun, and ambition tasks based on the client's priorities.
    c. Prioritize important tasks (both work and personal) when energy levels are above 70%.
    d. Distribute remaining tasks according to priorities and energy levels.
    3. To format the schedule, follow these guidelines:
    a. Display the planner in a {layout_subcategory} {layout_preference} format following {example_schedules[layout_subcategory]} as an example of the expected layout, ensuring each task generated belongs to {name}.
    b. Double check the format given the following definitions for each subcategory. Time-boxed means the user would like to see each task with a starting and end time. Un-time-boxed means there should be no start or end time with any tasks. Structured means the user would like to see 'Morning, 'Afternoon' and 'Evening sections in their schedule. Unstructured means there should be no 'Morning, 'Afternoon' and 'Evening sections in the schedule.
    4. Edit the language of the schedule by following these guidelines:
    a. Write in a clear, concise, and conversational tone. Avoid jargon and unnecessary complexity.
    b. Do not include explanations or notes sections.
    c. Do not show categories for each task.
    </instructions>

    <output_format>
    Please structure your response as follows:
    <thinking>
    [Your step-by-step thought process for creating the schedule]
    </thinking>

    <schedule>
    [The final personalized schedule]
    </schedule>
    </output_format>
"""