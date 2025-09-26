# Backend Development Guide

This guide provides structured patterns for implementing backend features in the YourMum Flask application.

## Flask Blueprint Architecture

### Standard Feature Structure
When adding a new feature, organize files following this pattern:

```
backend/
├── apis/
│   └── feature_routes.py          # Flask routes/endpoints
├── services/
│   └── feature_service.py         # Business logic
├── models/
│   └── feature.py                 # Pydantic data models
└── tests/
    ├── test_feature_routes.py     # API endpoint tests
    └── test_feature_service.py    # Service logic tests
```

### Layer Responsibilities

#### Routes Layer (`backend/apis/`)
**Purpose**: Handle HTTP request-response orchestration only
**Responsibilities**:
- Request validation and parsing
- Response formatting
- Delegate business logic to services
- Error handling and status codes

```python
from flask import Blueprint, request, jsonify
from backend.services.feature_service import FeatureService

feature_bp = Blueprint('feature', __name__)

@feature_bp.route('/feature', methods=['POST'])
def create_feature():
    try:
        data = request.get_json()
        service = FeatureService()
        result = service.create_feature(data)
        return jsonify(result), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500
```

#### Services Layer (`backend/services/`)
**Purpose**: Implement business logic and coordinate between layers
**Responsibilities**:
- Business rule enforcement
- Data transformation and validation
- Coordinate multiple data sources
- Handle complex workflows

```python
from typing import Dict, List
from backend.models.feature import FeatureModel
from backend.database import get_database

class FeatureService:
    def __init__(self):
        self.db = get_database()

    def create_feature(self, data: Dict) -> Dict:
        # Validate business rules
        if not self._validate_feature_data(data):
            raise ValueError("Invalid feature data")

        # Transform data
        feature = FeatureModel(**data)

        # Save to database
        result = self.db.features.insert_one(feature.dict())

        return {'id': str(result.inserted_id), **feature.dict()}

    def _validate_feature_data(self, data: Dict) -> bool:
        # Business logic validation
        return True
```

#### Models Layer (`backend/models/`)
**Purpose**: Define data structures with validation
**Responsibilities**:
- Data model definitions with Pydantic
- Field validation rules
- Type annotations
- Serialization/deserialization

```python
from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime

class FeatureModel(BaseModel):
    name: str
    description: Optional[str] = None
    categories: List[str] = []
    created_at: datetime = datetime.utcnow()
    is_active: bool = True

    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()

    class Config:
        # Enable ORM mode for MongoDB compatibility
        arbitrary_types_allowed = True
```

## Implementation Workflow

### Adding New Backend Features

1. **Define the Model First** (`backend/models/`)
   - Create Pydantic model with validation
   - Define all fields with proper types
   - Add validators for business rules

2. **Implement Service Logic** (`backend/services/`)
   - Create service class with business methods
   - Handle data transformation and validation
   - Coordinate database operations

3. **Create API Routes** (`backend/apis/`)
   - Define Flask Blueprint with endpoints
   - Handle request parsing and validation
   - Delegate to service layer
   - Format responses consistently

4. **Write Tests First** (`backend/tests/`)
   - Test service logic with unit tests
   - Test API endpoints with integration tests
   - Mock external dependencies

5. **Register Blueprint** (in `application.py`)
   - Import and register the new Blueprint
   - Ensure proper URL prefixes

### API Endpoint Patterns

#### Standard Response Format
```python
# Success response
{
    "success": true,
    "data": { /* actual data */ },
    "message": "Operation completed successfully"
}

# Error response
{
    "success": false,
    "error": "Error description",
    "code": "ERROR_CODE"
}
```

#### Common Endpoint Patterns
```python
# GET collection
@feature_bp.route('/features', methods=['GET'])
def get_features():
    service = FeatureService()
    features = service.get_all_features()
    return jsonify({'success': True, 'data': features})

# GET single item
@feature_bp.route('/features/<feature_id>', methods=['GET'])
def get_feature(feature_id: str):
    service = FeatureService()
    feature = service.get_feature_by_id(feature_id)
    if not feature:
        return jsonify({'success': False, 'error': 'Feature not found'}), 404
    return jsonify({'success': True, 'data': feature})

# POST create
@feature_bp.route('/features', methods=['POST'])
def create_feature():
    data = request.get_json()
    service = FeatureService()
    feature = service.create_feature(data)
    return jsonify({'success': True, 'data': feature}), 201

# PUT update
@feature_bp.route('/features/<feature_id>', methods=['PUT'])
def update_feature(feature_id: str):
    data = request.get_json()
    service = FeatureService()
    feature = service.update_feature(feature_id, data)
    return jsonify({'success': True, 'data': feature})

# DELETE
@feature_bp.route('/features/<feature_id>', methods=['DELETE'])
def delete_feature(feature_id: str):
    service = FeatureService()
    service.delete_feature(feature_id)
    return jsonify({'success': True, 'message': 'Feature deleted'})
```

## Testing Patterns

### Service Tests (`backend/tests/test_feature_service.py`)
```python
import pytest
from unittest.mock import Mock, patch
from backend.services.feature_service import FeatureService

class TestFeatureService:
    def setup_method(self):
        self.service = FeatureService()

    @patch('backend.services.feature_service.get_database')
    def test_create_feature_success(self, mock_db):
        # Arrange
        mock_db.return_value.features.insert_one.return_value.inserted_id = "123"
        data = {"name": "Test Feature", "description": "Test"}

        # Act
        result = self.service.create_feature(data)

        # Assert
        assert result['id'] == "123"
        assert result['name'] == "Test Feature"

    def test_create_feature_invalid_data(self):
        # Arrange
        data = {"name": ""}  # Empty name should fail

        # Act & Assert
        with pytest.raises(ValueError):
            self.service.create_feature(data)
```

### Route Tests (`backend/tests/test_feature_routes.py`)
```python
import pytest
import json
from application import app

class TestFeatureRoutes:
    def setup_method(self):
        self.client = app.test_client()
        app.config['TESTING'] = True

    def test_create_feature_success(self):
        # Arrange
        data = {"name": "Test Feature", "description": "Test"}

        # Act
        response = self.client.post('/features',
                                  data=json.dumps(data),
                                  content_type='application/json')

        # Assert
        assert response.status_code == 201
        result = json.loads(response.data)
        assert result['success'] is True
        assert 'id' in result['data']

    def test_create_feature_invalid_data(self):
        # Arrange
        data = {"name": ""}  # Invalid data

        # Act
        response = self.client.post('/features',
                                  data=json.dumps(data),
                                  content_type='application/json')

        # Assert
        assert response.status_code == 400
        result = json.loads(response.data)
        assert result['success'] is False
```

## Database Patterns

### MongoDB Operations
```python
class FeatureService:
    def get_all_features(self) -> List[Dict]:
        features = list(self.db.features.find({}, {'_id': 0}))
        return features

    def get_feature_by_id(self, feature_id: str) -> Optional[Dict]:
        feature = self.db.features.find_one({'id': feature_id}, {'_id': 0})
        return feature

    def create_feature(self, data: Dict) -> Dict:
        feature = FeatureModel(**data)
        feature_dict = feature.dict()
        feature_dict['id'] = str(uuid.uuid4())

        self.db.features.insert_one(feature_dict)
        return feature_dict

    def update_feature(self, feature_id: str, data: Dict) -> Dict:
        # Validate update data
        update_data = {k: v for k, v in data.items() if v is not None}

        self.db.features.update_one(
            {'id': feature_id},
            {'$set': update_data}
        )

        return self.get_feature_by_id(feature_id)
```

## Error Handling Patterns

### Service Layer Error Handling
```python
class FeatureService:
    def create_feature(self, data: Dict) -> Dict:
        try:
            # Validate data
            feature = FeatureModel(**data)
        except ValidationError as e:
            raise ValueError(f"Invalid data: {e}")

        try:
            # Database operation
            result = self.db.features.insert_one(feature.dict())
        except Exception as e:
            raise RuntimeError(f"Database error: {e}")

        return {'id': str(result.inserted_id), **feature.dict()}
```

### Route Layer Error Handling
```python
@feature_bp.route('/features', methods=['POST'])
def create_feature():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        service = FeatureService()
        result = service.create_feature(data)
        return jsonify({'success': True, 'data': result}), 201

    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except RuntimeError as e:
        return jsonify({'success': False, 'error': 'Database error'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': 'Internal server error'}), 500
```

## Development Checklist

When implementing a new backend feature:

- [ ] **Model defined** with proper Pydantic validation
- [ ] **Service class** implements business logic
- [ ] **Routes defined** with proper error handling
- [ ] **Tests written** for both service and routes
- [ ] **Blueprint registered** in application.py
- [ ] **Error handling** covers edge cases
- [ ] **Type annotations** used throughout
- [ ] **Docstrings** added for complex functions
- [ ] **Database operations** use proper error handling
- [ ] **Response format** follows standard pattern