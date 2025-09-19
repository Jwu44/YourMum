#!/usr/bin/env python3
"""
Simple test runner for single OAuth backend integration tests.
Run with: python3 run_single_oauth_tests.py
"""

import sys
import os
import unittest
from unittest.mock import patch, MagicMock

# Ensure project root on sys.path for backend imports
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Import the test class
from backend.tests.test_single_oauth_backend_integration import TestSingleOAuthBackendIntegration

if __name__ == '__main__':
    # Create test suite
    suite = unittest.TestSuite()

    # Add all test methods from our test class
    test_methods = [
        'test_store_user_with_single_oauth_tokens',
        'test_update_existing_user_with_new_oauth_tokens',
        'test_calendar_api_uses_stored_refresh_tokens',
        'test_calendar_api_handles_invalid_refresh_token',
        'test_calendar_credentials_structure_validation'
    ]

    for method in test_methods:
        suite.addTest(TestSingleOAuthBackendIntegration(method))

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Exit with error code if tests failed
    sys.exit(0 if result.wasSuccessful() else 1)