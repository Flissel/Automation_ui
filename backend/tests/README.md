# TRAE Backend Test Suite

This directory contains comprehensive tests for the TRAE (Trae Remote Automation Engine) backend system. The test suite covers all major components including API endpoints, service modules, and core functionality.

## 📋 Test Structure

```
tests/
├── README.md                           # This file
├── conftest.py                          # Pytest configuration and shared fixtures
├── test_backend_server.py              # Main server and API endpoint tests
├── test_graph_execution_service.py     # Graph execution and node processing tests
├── test_ocr_service.py                 # OCR text recognition tests
├── test_file_watcher_service.py        # File system monitoring tests
├── test_click_automation_service.py    # Mouse automation tests
├── test_live_desktop_service.py        # Desktop streaming tests
└── test_websocket_service.py           # WebSocket communication tests
```

## 🚀 Quick Start

### 1. Install Dependencies

First, install the testing dependencies:

```bash
# Using the test runner
python run_tests.py --install-deps

# Or manually
pip install pytest>=7.0.0 pytest-asyncio>=0.21.0 pytest-cov>=4.0.0
```

### 2. Validate Environment

Check that your test environment is properly configured:

```bash
python run_tests.py --validate
```

### 3. Run Tests

```bash
# Quick development tests (fast, unit tests only)
python run_tests.py --quick

# All tests
python run_tests.py --all

# Unit tests only
python run_tests.py --unit

# Integration tests only
python run_tests.py --integration

# Specific service tests
python run_tests.py --service ocr
python run_tests.py --service graph_execution

# Specific test by name
python run_tests.py --test test_health_check

# With coverage
python run_tests.py --all --coverage

# Verbose output
python run_tests.py --all --verbose
```

## 📊 Test Categories

### Unit Tests (`-m unit`)
- Test individual functions and methods in isolation
- Use mocking to avoid external dependencies
- Fast execution (< 1 second per test)
- No actual system resources used

### Integration Tests (`-m integration`)
- Test API endpoints and request/response cycles
- Test component interactions
- May use real system resources in controlled manner
- Slower execution but still reasonable

### Service Tests (`-m service`)
- Test individual service modules
- Focus on service-specific functionality
- Test both success and error conditions
- Include performance and concurrency testing

## 🧪 Test Files Overview

### `test_backend_server.py`
Tests the main FastAPI server and all API endpoints:
- Health check endpoints
- Node system API (templates, execution, status)
- OCR extraction endpoints
- Live desktop configuration
- Click automation endpoints
- File system monitoring endpoints
- Error handling and validation

### `test_graph_execution_service.py`
Tests the graph execution engine:
- Topological sorting algorithms
- Node execution logic
- Sequential and parallel execution
- Context management
- Error handling and recovery
- Performance monitoring

### `test_ocr_service.py`
Tests OCR text recognition capabilities:
- Image processing and preprocessing
- Text extraction from regions
- Multi-language support
- Confidence filtering
- Base64 image handling
- Error handling for invalid inputs

### `test_file_watcher_service.py`
Tests file system monitoring:
- File watcher creation and management
- Event filtering and pattern matching
- Real-time event broadcasting
- Watcher lifecycle management
- Performance with multiple watchers

### `test_click_automation_service.py`
Tests mouse click automation:
- Coordinate validation
- Different click types (single, double, triple)
- Screen bounds checking
- Error handling for invalid coordinates
- Performance timing
- Click history tracking

### `test_live_desktop_service.py`
Tests real-time desktop streaming:
- Screenshot capture and processing
- Image compression and scaling
- Client management
- WebSocket broadcasting
- Configuration updates
- Performance optimization

### `test_websocket_service.py`
Tests WebSocket communication:
- Client connection management
- Message broadcasting
- Connection limits and cleanup
- Message history tracking
- Error handling and recovery
- Concurrent connections

## 🔧 Configuration

### Pytest Configuration (`pytest.ini`)
- Test discovery patterns
- Output formatting
- Async test support
- Timeout settings
- Coverage configuration
- Warning filters

### Shared Fixtures (`conftest.py`)
- Mock external dependencies (PyAutoGUI, Tesseract, etc.)
- Sample test data
- Common utilities
- Test environment setup

## 📈 Coverage and Reporting

### Generate Coverage Reports

```bash
# Terminal coverage report
python run_tests.py --all --coverage

# HTML coverage report (creates htmlcov/ directory)
pytest --cov=services --cov=trae_backend_server --cov-report=html

# XML coverage report (for CI/CD)
pytest --cov=services --cov=trae_backend_server --cov-report=xml
```

### Performance Testing

```bash
# Show test durations
pytest --durations=10

# Run with timing information
pytest -v --tb=short --durations=0
```

## 🎯 Test Writing Guidelines

### 1. Test Naming
- Use descriptive test names: `test_extract_text_from_region_success`
- Group related tests in classes: `TestOCRService`
- Use consistent prefixes for test types

### 2. Test Structure
```python
def test_feature_scenario():
    """Test description explaining what is being tested"""
    # Arrange - Set up test data and mocks
    service = SomeService()
    mock_data = {"key": "value"}
    
    # Act - Perform the operation being tested
    result = service.some_method(mock_data)
    
    # Assert - Verify the expected outcome
    assert result["success"] is True
    assert result["data"] == expected_data
```

### 3. Async Tests
```python
@pytest.mark.asyncio
async def test_async_operation():
    """Test async operations"""
    service = AsyncService()
    result = await service.async_method()
    assert result is not None
```

### 4. Mocking External Dependencies
```python
@patch('pyautogui.screenshot')
def test_with_mock(mock_screenshot):
    """Test with mocked external dependency"""
    mock_screenshot.return_value = mock_image
    # Test implementation
```

### 5. Parameterized Tests
```python
@pytest.mark.parametrize("input,expected", [
    ("test1", "result1"),
    ("test2", "result2"),
])
def test_parameterized(input, expected):
    """Test multiple input/output combinations"""
    assert process_input(input) == expected
```

## 🐛 Debugging Tests

### Run Specific Test with Debug Info

```bash
# Single test with verbose output
pytest tests/test_ocr_service.py::TestOCRService::test_extract_text_success -v -s

# Debug with pdb
pytest tests/test_ocr_service.py::TestOCRService::test_extract_text_success --pdb

# Show local variables on failure
pytest --tb=long --showlocals
```

### Common Debug Patterns

```python
# Add debug prints (use -s flag to see output)
def test_debug_example():
    result = some_function()
    print(f"Debug: result = {result}")
    assert result is not None

# Use breakpoint for interactive debugging
def test_with_breakpoint():
    result = some_function()
    breakpoint()  # Python 3.7+ built-in debugger
    assert result is not None
```

## 🚀 Performance Tips

### 1. Use Parallel Execution
```bash
# Run tests in parallel (requires pytest-xdist)
python run_tests.py --all --parallel
# or
pytest -n auto
```

### 2. Run Only Fast Tests During Development
```bash
python run_tests.py --quick
# or
pytest -m "unit and not slow"
```

### 3. Focus on Specific Areas
```bash
# Test only what you're working on
python run_tests.py --service ocr
pytest tests/test_ocr_service.py
```

## 🔍 Test Markers

Use pytest markers to categorize and run specific test types:

```python
@pytest.mark.unit
def test_unit_function():
    """Unit test example"""
    pass

@pytest.mark.integration  
def test_api_endpoint():
    """Integration test example"""
    pass

@pytest.mark.slow
def test_long_running_operation():
    """Test that takes a while to run"""
    pass

@pytest.mark.service
def test_service_functionality():
    """Service-specific test"""
    pass
```

Run tests by marker:
```bash
pytest -m unit          # Only unit tests
pytest -m "not slow"    # Skip slow tests
pytest -m service       # Only service tests
```

## 📋 Troubleshooting

### Common Issues

1. **Import Errors**
   ```bash
   # Ensure backend is in Python path
   export PYTHONPATH="${PYTHONPATH}:$(pwd)"
   ```

2. **Missing Dependencies**
   ```bash
   # Install missing test dependencies
   python run_tests.py --install-deps
   ```

3. **Async Test Issues**
   ```bash
   # Ensure pytest-asyncio is installed and configured
   pip install pytest-asyncio
   ```

4. **Mock Issues**
   ```python
   # Use proper async mocking for async functions
   from unittest.mock import AsyncMock
   mock_function = AsyncMock(return_value="result")
   ```

### Environment Validation

If tests are failing, validate your environment:

```bash
python run_tests.py --validate
```

This checks:
- Python version compatibility
- Required modules availability  
- Test file existence
- Backend service files

## 📚 Additional Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing Guide](https://fastapi.tiangolo.com/tutorial/testing/)
- [Async Testing with pytest-asyncio](https://pytest-asyncio.readthedocs.io/)
- [Python Mock Documentation](https://docs.python.org/3/library/unittest.mock.html)

## 🤝 Contributing

When adding new features to the backend:

1. **Write tests first** (TDD approach recommended)
2. **Ensure good coverage** (aim for >80% line coverage)
3. **Test both success and failure cases**
4. **Use appropriate mocking** for external dependencies
5. **Follow existing test patterns** and naming conventions
6. **Update this README** if adding new test categories or patterns

Example workflow:
```bash
# 1. Write your test
# 2. Run it to see it fail
pytest tests/test_new_feature.py::test_new_functionality

# 3. Implement the feature
# 4. Run test to see it pass
pytest tests/test_new_feature.py::test_new_functionality

# 5. Run all tests to ensure no regressions
python run_tests.py --all
``` 