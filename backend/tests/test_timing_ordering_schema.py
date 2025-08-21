"""
Test module for timing and ordering pattern schema conversion.

Following TDD principles: These tests define the expected behavior
for schema conversion before implementing the actual feature.
"""

import unittest
from unittest.mock import patch, MagicMock
from backend.services.schedule_gen import (
    generate_schedule,
    create_ordering_prompt,
    generate_local_sections
)
from backend.services.schedule_rag import (
    retrieve_schedule_examples,
    get_pattern_definitions
)


class TestTimingOrderingSchemaConversion(unittest.TestCase):
    """Test schema conversion from new format to combined pattern matching format."""

    def setUp(self):
        """Set up test data for schema conversion tests."""
        self.base_user_data = {
            'work_start_time': '09:00',
            'work_end_time': '17:00',
            'energy_patterns': ['peak_morning'],
            'priorities': {'health': '1', 'relationships': '2', 'fun_activities': '3', 'ambitions': '4'},
            'tasks': [
                {'id': '1', 'text': 'Test task 1', 'categories': ['Work']},
                {'id': '2', 'text': 'Test task 2', 'categories': ['Exercise']}
            ]
        }

    def test_schema_conversion_timing_only(self):
        """Test conversion when only timing is specified (no ordering pattern)."""
        test_cases = [
            {
                'input': {'timing': 'timebox', 'orderingPattern': None},
                'expected_pattern': 'timebox'
            },
            {
                'input': {'timing': 'untimebox', 'orderingPattern': None},
                'expected_pattern': 'untimebox'
            },
            {
                'input': {'timing': 'timebox', 'orderingPattern': 'null'},
                'expected_pattern': 'timebox'
            }
        ]

        for case in test_cases:
            with self.subTest(case=case):
                user_data = {
                    **self.base_user_data,
                    'layout_preference': {
                        'layout': 'todolist-structured',
                        'subcategory': 'day-sections',
                        **case['input']
                    }
                }

                # Mock the create_ordering_prompt to capture the pattern_for_matching
                with patch('backend.services.schedule_gen.create_enhanced_ordering_prompt_content') as mock_prompt:
                    mock_prompt.return_value = "test prompt"
                    
                    # This should extract timing and convert to pattern_for_matching
                    sections = generate_local_sections(user_data['layout_preference'])
                    task_registry = {'1': MagicMock(), '2': MagicMock()}
                    
                    create_ordering_prompt(task_registry, sections, user_data)
                    
                    # Verify the prompt was called with correct pattern
                    mock_prompt.assert_called_once()
                    args = mock_prompt.call_args[1]
                    self.assertEqual(args['ordering_pattern'], case['expected_pattern'])

    def test_schema_conversion_combined_patterns(self):
        """Test conversion when both timing and ordering pattern are specified."""
        test_cases = [
            {
                'input': {'timing': 'timebox', 'orderingPattern': 'batching'},
                'expected_pattern': ['batching', 'timebox']
            },
            {
                'input': {'timing': 'untimebox', 'orderingPattern': 'alternating'},
                'expected_pattern': ['alternating', 'untimebox']
            },
            {
                'input': {'timing': 'timebox', 'orderingPattern': '3-3-3'},
                'expected_pattern': ['3-3-3', 'timebox']
            },
            {
                'input': {'timing': 'untimebox', 'orderingPattern': 'batching'},
                'expected_pattern': ['batching', 'untimebox']
            }
        ]

        for case in test_cases:
            with self.subTest(case=case):
                user_data = {
                    **self.base_user_data,
                    'layout_preference': {
                        'layout': 'todolist-structured',
                        'subcategory': 'day-sections',
                        **case['input']
                    }
                }

                # Mock the create_ordering_prompt to capture the pattern_for_matching
                with patch('backend.services.schedule_gen.create_enhanced_ordering_prompt_content') as mock_prompt:
                    mock_prompt.return_value = "test prompt"
                    
                    sections = generate_local_sections(user_data['layout_preference'])
                    task_registry = {'1': MagicMock(), '2': MagicMock()}
                    
                    create_ordering_prompt(task_registry, sections, user_data)
                    
                    # Verify the prompt was called with correct combined pattern
                    mock_prompt.assert_called_once()
                    args = mock_prompt.call_args[1]
                    self.assertEqual(args['ordering_pattern'], case['expected_pattern'])

    def test_backward_compatibility_old_schema(self):
        """Test that old schema (orderingPattern only) still works."""
        test_cases = [
            {
                'input': {'orderingPattern': 'timebox'},
                'expected_pattern': 'timebox'  # Should pass through unchanged
            },
            {
                'input': {'orderingPattern': 'batching'},
                'expected_pattern': 'batching'
            },
            {
                'input': {'orderingPattern': 'three-three-three'},
                'expected_pattern': '3-3-3'  # Should be normalized to 3-3-3
            }
        ]

        for case in test_cases:
            with self.subTest(case=case):
                user_data = {
                    **self.base_user_data,
                    'layout_preference': {
                        'layout': 'todolist-structured',
                        'subcategory': 'day-sections',
                        **case['input']
                    }
                }

                # Mock the create_ordering_prompt to capture the pattern_for_matching
                with patch('backend.services.schedule_gen.create_enhanced_ordering_prompt_content') as mock_prompt:
                    mock_prompt.return_value = "test prompt"
                    
                    sections = generate_local_sections(user_data['layout_preference'])
                    task_registry = {'1': MagicMock(), '2': MagicMock()}
                    
                    create_ordering_prompt(task_registry, sections, user_data)
                    
                    # Verify backward compatibility
                    mock_prompt.assert_called_once()
                    args = mock_prompt.call_args[1]
                    self.assertEqual(args['ordering_pattern'], case['expected_pattern'])


class TestRAGSystemCombinedPatterns(unittest.TestCase):
    """Test RAG system handling of combined timing/ordering patterns."""

    def test_retrieve_examples_single_pattern(self):
        """Test retrieving examples for single patterns (backward compatibility)."""
        test_cases = [
            {'subcategory': 'day-sections', 'pattern': 'timebox'},
            {'subcategory': 'day-sections', 'pattern': 'untimebox'},
            {'subcategory': 'day-sections', 'pattern': 'batching'},
            {'subcategory': 'priority', 'pattern': 'alternating'},
            {'subcategory': 'category', 'pattern': '3-3-3'}
        ]

        for case in test_cases:
            with self.subTest(case=case):
                with patch('backend.services.schedule_rag.get_cached_templates') as mock_templates:
                    # Mock template data
                    mock_templates.return_value = {
                        'templates': [
                            {
                                'id': f"template_{case['pattern']}",
                                'subcategory': case['subcategory'],
                                'ordering_pattern': case['pattern'],
                                'example': ['Example task 1', 'Example task 2']
                            }
                        ]
                    }

                    examples = retrieve_schedule_examples(case['subcategory'], case['pattern'])
                    
                    # Should find matching template
                    self.assertEqual(len(examples), 1)
                    self.assertEqual(examples[0]['ordering_pattern'], case['pattern'])

    def test_retrieve_examples_combined_pattern(self):
        """Test retrieving examples for combined patterns (new feature)."""
        test_cases = [
            {'subcategory': 'day-sections', 'pattern': ['batching', 'timebox']},
            {'subcategory': 'priority', 'pattern': ['alternating', 'untimebox']},
            {'subcategory': 'category', 'pattern': ['3-3-3', 'timebox']}
        ]

        for case in test_cases:
            with self.subTest(case=case):
                with patch('backend.services.schedule_rag.get_cached_templates') as mock_templates:
                    # Mock template data with combined pattern
                    mock_templates.return_value = {
                        'templates': [
                            {
                                'id': f"template_combined",
                                'subcategory': case['subcategory'],
                                'ordering_pattern': case['pattern'],
                                'example': ['Combined task 1', 'Combined task 2']
                            }
                        ]
                    }

                    examples = retrieve_schedule_examples(case['subcategory'], case['pattern'])
                    
                    # Should find matching template with combined pattern
                    self.assertEqual(len(examples), 1)
                    self.assertEqual(examples[0]['ordering_pattern'], case['pattern'])

    def test_pattern_definitions_updated(self):
        """Test that pattern definitions include timing patterns separately."""
        definitions = get_pattern_definitions()
        
        # Should have timing-specific definitions
        self.assertIn('timebox', definitions)
        self.assertIn('untimebox', definitions)
        
        # Should have ordering-specific definitions
        self.assertIn('batching', definitions)
        self.assertIn('alternating', definitions)
        self.assertIn('three-three-three', definitions)
        
        # Check that timebox builds on untimebox
        self.assertIn('untimebox', definitions['timebox'].lower())
        
        # Check that '3-3-3' pattern is properly defined
        if '3-3-3' in definitions:
            self.assertIn('3 hours', definitions['3-3-3'])


class TestScheduleGenerationWithNewSchema(unittest.TestCase):
    """Test end-to-end schedule generation with new timing/ordering schema."""

    def setUp(self):
        """Set up test data for schedule generation tests."""
        self.base_user_data = {
            'work_start_time': '09:00',
            'work_end_time': '17:00',
            'energy_patterns': ['peak_morning'],
            'priorities': {'health': '1', 'relationships': '2', 'fun_activities': '3', 'ambitions': '4'},
            'tasks': [
                {'id': '1', 'text': 'Morning workout', 'categories': ['Exercise']},
                {'id': '2', 'text': 'Team meeting', 'categories': ['Work']},
                {'id': '3', 'text': 'Grocery shopping', 'categories': ['Fun']}
            ]
        }

    @patch('backend.services.schedule_gen.client')
    def test_schedule_generation_all_eight_combinations(self, mock_client):
        """Test schedule generation for all 8 valid timing/ordering combinations."""
        # Mock LLM response
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        mock_response.content[0].text = """
        {
            "placements": [
                {"task_id": "1", "section": "Morning", "order": 1, "time_allocation": "09:00am - 10:00am"},
                {"task_id": "2", "section": "Morning", "order": 2, "time_allocation": "10:00am - 11:00am"},
                {"task_id": "3", "section": "Afternoon", "order": 1, "time_allocation": "14:00pm - 15:00pm"}
            ]
        }
        """
        mock_client.messages.create.return_value = mock_response

        combinations = [
            {'timing': 'timebox', 'orderingPattern': None},
            {'timing': 'timebox', 'orderingPattern': 'batching'},
            {'timing': 'timebox', 'orderingPattern': 'alternating'},
            {'timing': 'timebox', 'orderingPattern': '3-3-3'},
            {'timing': 'untimebox', 'orderingPattern': None},
            {'timing': 'untimebox', 'orderingPattern': 'batching'},
            {'timing': 'untimebox', 'orderingPattern': 'alternating'},
            {'timing': 'untimebox', 'orderingPattern': '3-3-3'}
        ]

        for combination in combinations:
            with self.subTest(combination=combination):
                user_data = {
                    **self.base_user_data,
                    'layout_preference': {
                        'layout': 'todolist-structured',
                        'subcategory': 'day-sections',
                        **combination
                    }
                }

                result = generate_schedule(user_data)

                # Should successfully generate schedule
                self.assertTrue(result['success'])
                self.assertIn('tasks', result)
                self.assertGreater(len(result['tasks']), 0)
                
                # Should preserve layout and pattern information
                if combination['timing'] == 'timebox' and combination['orderingPattern']:
                    # Combined patterns should work
                    expected_pattern = combination['orderingPattern']
                else:
                    # Single patterns should work
                    expected_pattern = combination['timing']

    def test_error_handling_invalid_schema(self):
        """Test error handling when schema has invalid values."""
        invalid_cases = [
            {'timing': 'invalid_timing', 'orderingPattern': 'batching'},
            {'timing': 'timebox', 'orderingPattern': 'invalid_pattern'},
            {'timing': None, 'orderingPattern': 'batching'}  # Missing required timing
        ]

        for case in invalid_cases:
            with self.subTest(case=case):
                user_data = {
                    **self.base_user_data,
                    'layout_preference': {
                        'layout': 'todolist-structured',
                        'subcategory': 'day-sections',
                        **case
                    }
                }

                # Should handle gracefully and not crash
                result = generate_schedule(user_data)
                self.assertIsInstance(result, dict)
                self.assertIn('success', result)


class TestThreeThreeThreeNormalization(unittest.TestCase):
    """Test normalization of '3-3-3' pattern naming."""

    def test_normalize_three_three_three_to_3_3_3(self):
        """Test that 'three-three-three' gets normalized to '3-3-3'."""
        user_data = {
            'work_start_time': '09:00',
            'work_end_time': '17:00',
            'energy_patterns': ['peak_morning'],
            'priorities': {'health': '1'},
            'tasks': [{'id': '1', 'text': 'Test task', 'categories': ['Work']}],
            'layout_preference': {
                'layout': 'todolist-structured',
                'subcategory': 'day-sections',
                'timing': 'timebox',
                'orderingPattern': 'three-three-three'  # Old format
            }
        }

        with patch('backend.services.schedule_gen.create_enhanced_ordering_prompt_content') as mock_prompt:
            mock_prompt.return_value = "test prompt"
            
            sections = generate_local_sections(user_data['layout_preference'])
            task_registry = {'1': MagicMock()}
            
            create_ordering_prompt(task_registry, sections, user_data)
            
            # Should normalize to '3-3-3'
            mock_prompt.assert_called_once()
            args = mock_prompt.call_args[1]
            self.assertEqual(args['ordering_pattern'], ['3-3-3', 'timebox'])


if __name__ == '__main__':
    unittest.main()