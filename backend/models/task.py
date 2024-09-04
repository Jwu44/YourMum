import uuid

class Task:
    def __init__(self, text, categories=None, id=None, is_subtask=False, completed=False, 
                 is_section=False, section=None, parent_id=None, level=0, section_index=0, type="task"):
        self.id = id or str(uuid.uuid4())
        self.text = text
        self.categories = set(categories) if categories else set()
        self.is_subtask = is_subtask
        self.completed = completed
        self.is_section = is_section
        self.section = section
        self.parent_id = parent_id
        self.level = level
        self.section_index = section_index
        self.type = type

    def to_dict(self):
        return {
            "id": self.id,
            "text": self.text,
            "categories": list(self.categories),
            "is_subtask": self.is_subtask,
            "completed": self.completed,
            "is_section": self.is_section,
            "section": self.section,
            "parent_id": self.parent_id,
            "level": self.level,
            "section_index": self.section_index,
            "type": self.type
        }

    @classmethod
    def from_dict(cls, data):
        return cls(
            text=data["text"],
            categories=data.get("categories", []),
            id=data.get("id"),
            is_subtask=data.get("is_subtask", False),
            completed=data.get("completed", False),
            is_section=data.get("is_section", False),
            section=data.get("section"),
            parent_id=data.get("parent_id"),
            level=data.get("level", 0),
            section_index=data.get("section_index", 0),
            type=data.get("type", "task")
        )

    def add_category(self, category):
        self.categories.add(category)

    def remove_category(self, category):
        self.categories.discard(category)

    def toggle_completed(self):
        self.completed = not self.completed

    def set_section(self, section):
        self.section = section

    def set_parent(self, parent_id):
        self.parent_id = parent_id
        self.is_subtask = bool(parent_id)

    def set_level(self, level):
        self.level = level

    def set_section_index(self, index):
        self.section_index = index

    def set_type(self, type):
        self.type = type

    def __str__(self):
        return f"Task(id={self.id}, text='{self.text}', categories={self.categories})"

    def __repr__(self):
        return self.__str__()