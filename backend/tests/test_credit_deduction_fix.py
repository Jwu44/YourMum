"""
Test credit deduction behavior for failed operations.

This test verifies that credits are properly refunded when operations fail
to return valid JSON responses or meaningful results.
"""

import pytest
from unittest.mock import patch, MagicMock
from backend.apis.routes import api_decompose_task, submit_data
from backend.services.ai_service import decompose_task
from backend.services.schedule_gen import generate_schedule


class TestCreditDeductionFix:
    """Test that credits are properly handled for failed operations."""

    def test_task_decomposition_empty_result_returns_400(self):
        """Test that empty decomposition results return 400 status."""
        # Mock the decompose_task function to return empty list
        with patch('backend.apis.routes.decompose_task') as mock_decompose:
            mock_decompose.return_value = []
            
            # Mock request data
            with patch('backend.apis.routes.request') as mock_request:
                mock_request.json = {
                    'task': {'text': 'Test task'},
                    'user_id': 'test_user',
                    'energy_patterns': [],
                    'priorities': {}
                }
                
                # Mock get_user_from_token to return valid user
                with patch('backend.apis.routes.get_user_from_token') as mock_get_user:
                    mock_get_user.return_value = {'googleId': 'test_user'}
                    
                    # Call the function
                    result = api_decompose_task()
                    
                    # Verify it returns 400 status (which triggers credit refund)
                    assert result[1] == 400  # status code
                    assert 'error' in result[0].get_json()

    def test_task_decomposition_invalid_format_returns_400(self):
        """Test that invalid microstep format returns 400 status."""
        # Mock the decompose_task function to return invalid format
        with patch('backend.apis.routes.decompose_task') as mock_decompose:
            mock_decompose.return_value = [
                {'invalid': 'format'},  # Missing 'text' field
                {'text': ''},  # Empty text
                {'text': '   '}  # Whitespace only
            ]
            
            # Mock request data
            with patch('backend.apis.routes.request') as mock_request:
                mock_request.json = {
                    'task': {'text': 'Test task'},
                    'user_id': 'test_user',
                    'energy_patterns': [],
                    'priorities': {}
                }
                
                # Mock get_user_from_token to return valid user
                with patch('backend.apis.routes.get_user_from_token') as mock_get_user:
                    mock_get_user.return_value = {'googleId': 'test_user'}
                    
                    # Call the function
                    result = api_decompose_task()
                    
                    # Verify it returns 400 status (which triggers credit refund)
                    assert result[1] == 400  # status code
                    assert 'error' in result[0].get_json()

    def test_schedule_generation_empty_result_returns_400(self):
        """Test that empty schedule generation returns 400 status."""
        # Mock the generate_schedule function to return empty result
        with patch('backend.apis.routes.generate_schedule') as mock_generate:
            mock_generate.return_value = {'tasks': []}
            
            # Mock request data
            with patch('backend.apis.routes.request') as mock_request:
                mock_request.json = {
                    'date': '2025-01-01',
                    'work_start_time': '9:00 AM',
                    'work_end_time': '5:00 PM',
                    'tasks': [{'text': 'Test task'}]
                }
                
                # Mock extract_user_id_from_request to return valid user
                with patch('backend.apis.routes.extract_user_id_from_request') as mock_extract:
                    mock_extract.return_value = ('test_user', None)
                    
                    # Mock schedule service
                    with patch('backend.apis.routes.schedule_service') as mock_service:
                        mock_service.get_schedule_by_date.return_value = (False, {'error': 'not found'})
                        
                        # Call the function
                        result = submit_data()
                        
                        # Verify it returns 400 status (which triggers credit refund)
                        assert result[1] == 400  # status code
                        assert 'error' in result[0].get_json()

    def test_schedule_generation_invalid_response_returns_400(self):
        """Test that invalid schedule generation response returns 400 status."""
        # Mock the generate_schedule function to return invalid response
        with patch('backend.apis.routes.generate_schedule') as mock_generate:
            mock_generate.return_value = None  # Invalid response
            
            # Mock request data
            with patch('backend.apis.routes.request') as mock_request:
                mock_request.json = {
                    'date': '2025-01-01',
                    'work_start_time': '9:00 AM',
                    'work_end_time': '5:00 PM'
                }
                
                # Mock extract_user_id_from_request to return valid user
                with patch('backend.apis.routes.extract_user_id_from_request') as mock_extract:
                    mock_extract.return_value = ('test_user', None)
                    
                    # Mock schedule service
                    with patch('backend.apis.routes.schedule_service') as mock_service:
                        mock_service.get_schedule_by_date.return_value = (False, {'error': 'not found'})
                        
                        # Call the function
                        result = submit_data()
                        
                        # Verify it returns 400 status (which triggers credit refund)
                        assert result[1] == 400  # status code
                        assert 'error' in result[0].get_json()


if __name__ == '__main__':
    pytest.main([__file__])
