from typing import List
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum
from bson import ObjectId

class SuggestionType(str, Enum):
    """Enumeration of possible AI suggestion types"""
    ENERGY_OPTIMIZATION = "Energy Optimization"
    PROCRASTINATION_PREVENTION = "Procrastination Prevention"
    PRIORITY_REBALANCING = "Priority Rebalancing"
    TASK_STRUCTURE = "Task Structure"
    TIME_MANAGEMENT = "Time Management"

class AISuggestion(BaseModel):
    """Simplified model representing an AI-generated schedule suggestion"""
    model_config = ConfigDict(
        populate_by_name=True,  # Updated from allow_population_by_field_name
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: str = Field(default_factory=lambda: str(ObjectId()))
    text: str
    type: SuggestionType
    rationale: str
    confidence: float
    categories: List[str]
    user_id: str
    date: str

# MongoDB Collection Index
AI_SUGGESTION_INDEXES = [
    [("user_id", 1), ("date", 1)],
    [("confidence", -1)]
]