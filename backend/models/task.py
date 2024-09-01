class Task:
    def __init__(self, id, text, categories=None):
        self.id = id
        self.text = text
        self.categories = set(map(str, categories)) if categories else set()
        self.completed = False
        self.is_subtask = False
        self.is_section = False
        self.section = None
        self.parent_id = None
        self.level = 0
        self.section_index = 0
        self.type = 'task'
        self.additional_attributes = {}

    def add_category(self, category):
        self.categories.add(category)

    def remove_category(self, category):
        self.categories.discard(category)

    def update_categories(self, categories):
        self.categories = set(categories)

    def set_attribute(self, key, value):
        self.additional_attributes[key] = value

    def get_attribute(self, key):
        return self.additional_attributes.get(key)

    def to_dict(self):
        return {
            "id": self.id,
            "text": self.text,
            "categories": list(self.categories),
            "completed": self.completed,
            "is_subtask": self.is_subtask,
            **self.additional_attributes
        }

    @classmethod
    def from_dict(cls, data):
        task = cls(data["id"], data["text"], data.get("categories", []), data.get("is_subtask", False))
        task.completed = data.get("completed", False)
        for key, value in data.items():
            if key not in ["id", "text", "categories", "completed", "is_subtask"]:
                task.set_attribute(key, value)
        return task