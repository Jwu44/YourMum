import sys
import langchain
from langchain_text_splitters import RecursiveCharacterTextSplitter
import json

# Load example schedules
with open('path/to/example_schedules.json', 'r') as f:
    example_schedules = json.load(f)

# Process schedules
documents = []
for schedule_key, schedule_data in example_schedules.items():
    # Join the content lines into a single string
    content = '\n'.join(schedule_data['content'])
    chunks = text_splitter.split_text(content)
    for chunk in chunks:
        doc = Document(
            page_content=chunk,
            metadata={"layout_type": schedule_data['layout_type']}
        )
        documents.append(doc)