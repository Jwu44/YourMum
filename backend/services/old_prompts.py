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