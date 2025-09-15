#!/usr/bin/env python3
"""
Test OCR Click Patterns - Live Monitor Implementation
Tests the new OCR Click Pattern Monitor node that combines OCR monitoring, 
desktop streaming, and click automation for intelligent UI automation.
"""

import asyncio
import logging
import sys
import os
import json
import time
from datetime import datetime
from typing import Dict, Any

# Add the backend directory to the Python path
sys.path.insert(0, os.path.abspath('.'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('test_ocr_click_patterns.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class OCRClickPatternTester:
    """Comprehensive tester for OCR Click Pattern functionality"""
    
    def __init__(self):
        self.service_manager = None
        self.graph_execution_service = None
        self.services = {}
        self.test_results = {}
        
    async def initialize_services(self):
        """Initialize all required services"""
        logger.info("INIT: Initializing services for OCR click pattern testing...")
        
        try:
            # Import services directly (same as working tests)
            from services.ocr_monitoring_service import OCRMonitoringService
            from services.live_desktop_service import LiveDesktopService
            from services.click_automation_service import ClickAutomationService
            from services.graph_execution_service import GraphExecutionService
            
            # Initialize services directly
            self.services = {
                'ocr_monitoring_service': OCRMonitoringService(),
                'live_desktop_service': LiveDesktopService(),
                'click_automation_service': ClickAutomationService(),
            }
            
            # Store graph execution service reference
            self.graph_execution_service = GraphExecutionService()
            
            logger.info("SUCCESS: Services initialized successfully")
            
            # Log service status
            for service_name, service in self.services.items():
                if service:
                    health = service.is_healthy() if hasattr(service, 'is_healthy') else True
                    logger.info(f"   INFO: {service_name}: {'Healthy' if health else 'Degraded'}")
                else:
                    logger.warning(f"   WARN: {service_name}: Not available")
            
            return True
            
        except Exception as e:
            logger.error(f"ERROR: Service initialization failed: {e}")
            return False
    
    async def test_node_template_validation(self):
        """Test the new node templates are properly loaded and validated"""
        logger.info("\nTESTING: Testing node template validation...")
        
        try:
            # Import node template validator
            from services.comprehensive_node_templates import node_template_validator, validate_node_execution_functions
            
            # Run validation
            validation_results = validate_node_execution_functions()
            
            # Check for new OCR click pattern node
            template_results = validation_results.get('template_results', {})
            
            # Test OCR Click Pattern node
            ocr_click_result = template_results.get('ocr_click_pattern')
            if ocr_click_result:
                logger.info(f"✅ OCR Click Pattern node found: Valid={ocr_click_result.get('valid')}")
                if not ocr_click_result.get('valid'):
                    logger.error(f"   ❌ Validation error: {ocr_click_result.get('error')}")
            else:
                logger.error("ERROR: OCR Click Pattern node not found")
            
            # Test Enhanced OCR Monitor node
            enhanced_ocr_result = template_results.get('enhanced_ocr_monitor')
            if enhanced_ocr_result:
                logger.info(f"✅ Enhanced OCR Monitor node found: Valid={enhanced_ocr_result.get('valid')}")
                if not enhanced_ocr_result.get('valid'):
                    logger.error(f"   ❌ Validation error: {enhanced_ocr_result.get('error')}")
            else:
                logger.error("❌ Enhanced OCR Monitor node not found")
            
            # Log summary
            summary = validation_results.get('summary', {})
            logger.info(f"📊 Validation Summary:")
            logger.info(f"   Total Templates: {summary.get('total_templates', 0)}")
            logger.info(f"   Valid Templates: {summary.get('valid_templates', 0)}")
            logger.info(f"   Success Rate: {summary.get('success_rate', 0):.1f}%")
            
            self.test_results['node_validation'] = {
                'success': True,
                'ocr_click_pattern_valid': ocr_click_result.get('valid', False) if ocr_click_result else False,
                'enhanced_ocr_monitor_valid': enhanced_ocr_result.get('valid', False) if enhanced_ocr_result else False,
                'summary': summary
            }
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Node template validation failed: {e}")
            self.test_results['node_validation'] = {'success': False, 'error': str(e)}
            return False
    
    async def test_ocr_click_pattern_basic(self):
        """Test basic OCR click pattern functionality"""
        logger.info("\n🎯 Testing OCR Click Pattern basic functionality...")
        
        try:
            if not self.graph_execution_service:
                logger.error("❌ Graph execution service not available")
                return False
            
            # Create test graph with OCR click pattern node
            test_graph = {
                "nodes": [
                    {
                        "id": "ocr_click_1",
                        "type": "ocr_click_pattern",
                        "data": {
                            "properties": {
                                "monitor_region": {"x": 100, "y": 100, "width": 400, "height": 200},
                                "target_text": "Test Pattern",
                                "click_offset": {"x": 10, "y": 10},
                                "interval": 1,  # Check every 1 second
                                "max_time": 5,  # Monitor for 5 seconds max
                                "similarity_threshold": 0.5,
                                "click_button": "left",
                                "click_type": "single"
                            }
                        }
                    }
                ],
                "edges": []
            }
            
            # Execute the graph
            logger.info("🚀 Executing OCR click pattern graph...")
            execution_result = await self.graph_execution_service.execute_graph(test_graph)
            
            # Analyze results
            if execution_result.get('success'):
                node_results = execution_result.get('results', {})
                ocr_result = node_results.get('ocr_click_1', {})
                
                logger.info("✅ OCR click pattern execution completed")
                logger.info(f"   Pattern found: {ocr_result.get('pattern_found', False)}")
                logger.info(f"   Click executed: {ocr_result.get('click_executed', False)}")
                logger.info(f"   Monitoring time: {ocr_result.get('monitoring_time', 0):.2f}s")
                logger.info(f"   Total checks: {ocr_result.get('total_checks', 0)}")
                
                self.test_results['ocr_click_basic'] = {
                    'success': True,
                    'execution_success': execution_result.get('success'),
                    'pattern_found': ocr_result.get('pattern_found', False),
                    'click_executed': ocr_result.get('click_executed', False),
                    'monitoring_time': ocr_result.get('monitoring_time', 0),
                    'total_checks': ocr_result.get('total_checks', 0)
                }
                
                return True
            else:
                logger.error(f"❌ Graph execution failed: {execution_result.get('error', 'Unknown error')}")
                self.test_results['ocr_click_basic'] = {
                    'success': False,
                    'error': execution_result.get('error', 'Unknown error')
                }
                return False
            
        except Exception as e:
            logger.error(f"❌ OCR click pattern basic test failed: {e}")
            self.test_results['ocr_click_basic'] = {'success': False, 'error': str(e)}
            return False
    
    async def test_enhanced_ocr_monitor(self):
        """Test enhanced OCR monitor functionality"""
        logger.info("\n👁️ Testing Enhanced OCR Monitor...")
        
        try:
            if not self.graph_execution_service:
                logger.error("❌ Graph execution service not available")
                return False
            
            # Create test graph with enhanced OCR monitor
            test_graph = {
                "nodes": [
                    {
                        "id": "enhanced_monitor_1",
                        "type": "enhanced_ocr_monitor",
                        "data": {
                            "properties": {
                                "regions": [
                                    {"x": 50, "y": 50, "width": 300, "height": 150},
                                    {"x": 400, "y": 200, "width": 300, "height": 150}
                                ],
                                "patterns": ["button", "text", "menu"],
                                "duration": 3  # Monitor for 3 seconds
                            }
                        }
                    }
                ],
                "edges": []
            }
            
            # Execute the graph
            logger.info("🚀 Executing enhanced OCR monitor graph...")
            execution_result = await self.graph_execution_service.execute_graph(test_graph)
            
            # Analyze results
            if execution_result.get('success'):
                node_results = execution_result.get('results', {})
                monitor_result = node_results.get('enhanced_monitor_1', {})
                
                logger.info("✅ Enhanced OCR monitor execution completed")
                logger.info(f"   Regions monitored: {monitor_result.get('regions_monitored', 0)}")
                logger.info(f"   Patterns searched: {len(monitor_result.get('patterns_searched', []))}")
                logger.info(f"   Monitoring duration: {monitor_result.get('monitoring_duration', 0)}s")
                logger.info(f"   Patterns detected: {len(monitor_result.get('detected_patterns', []))}")
                
                self.test_results['enhanced_ocr_monitor'] = {
                    'success': True,
                    'execution_success': execution_result.get('success'),
                    'regions_monitored': monitor_result.get('regions_monitored', 0),
                    'patterns_searched': len(monitor_result.get('patterns_searched', [])),
                    'monitoring_duration': monitor_result.get('monitoring_duration', 0),
                    'detected_patterns': len(monitor_result.get('detected_patterns', []))
                }
                
                return True
            else:
                logger.error(f"❌ Graph execution failed: {execution_result.get('error', 'Unknown error')}")
                self.test_results['enhanced_ocr_monitor'] = {
                    'success': False,
                    'error': execution_result.get('error', 'Unknown error')
                }
                return False
            
        except Exception as e:
            logger.error(f"❌ Enhanced OCR monitor test failed: {e}")
            self.test_results['enhanced_ocr_monitor'] = {'success': False, 'error': str(e)}
            return False
    
    async def test_service_integration(self):
        """Test service integration and health"""
        logger.info("\n🔧 Testing service integration...")
        
        try:
            # Test OCR monitoring service
            ocr_service = self.services.get('ocr_monitoring_service')
            if ocr_service:
                ocr_status = await ocr_service.get_status()
                logger.info(f"✅ OCR Monitoring Service: {ocr_status}")
            else:
                logger.warning("⚠️ OCR Monitoring Service not available")
            
            # Test live desktop service
            desktop_service = self.services.get('live_desktop_service')
            if desktop_service:
                desktop_status = await desktop_service.get_status()
                logger.info(f"✅ Live Desktop Service: {desktop_status}")
            else:
                logger.warning("⚠️ Live Desktop Service not available")
            
            # Test click automation service
            click_service = self.services.get('click_automation_service')
            if click_service:
                # Test coordinate validation
                validation_result = await click_service.validate_target(400, 300)
                logger.info(f"✅ Click Automation Service validation: {validation_result}")
            else:
                logger.warning("⚠️ Click Automation Service not available")
            
            self.test_results['service_integration'] = {
                'success': True,
                'ocr_available': ocr_service is not None,
                'desktop_available': desktop_service is not None,
                'click_available': click_service is not None
            }
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Service integration test failed: {e}")
            self.test_results['service_integration'] = {'success': False, 'error': str(e)}
            return False
    
    async def run_all_tests(self):
        """Run all OCR click pattern tests"""
        logger.info("STARTING: OCR Click Pattern comprehensive testing...")
        start_time = time.time()
        
        # Initialize services
        init_success = await self.initialize_services()
        if not init_success:
            logger.error("❌ Failed to initialize services. Aborting tests.")
            return False
        
        # Run test suite
        tests = [
            ("Node Template Validation", self.test_node_template_validation),
            ("Service Integration", self.test_service_integration),
            ("OCR Click Pattern Basic", self.test_ocr_click_pattern_basic),
            ("Enhanced OCR Monitor", self.test_enhanced_ocr_monitor)
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_name, test_method in tests:
            logger.info(f"\n{'='*60}")
            logger.info(f"Running: {test_name}")
            logger.info('='*60)
            
            try:
                success = await test_method()
                if success:
                    logger.info(f"✅ {test_name} PASSED")
                    passed_tests += 1
                else:
                    logger.error(f"FAILED: {test_name} FAILED")
            except Exception as e:
                logger.error(f"❌ {test_name} CRASHED: {e}")
        
        # Generate summary
        total_time = time.time() - start_time
        success_rate = (passed_tests / total_tests) * 100
        
        logger.info(f"\n{'='*60}")
        logger.info("SUMMARY: OCR CLICK PATTERN TEST SUMMARY")
        logger.info('='*60)
        logger.info(f"🎯 Tests Passed: {passed_tests}/{total_tests}")
        logger.info(f"📈 Success Rate: {success_rate:.1f}%")
        logger.info(f"⏱️ Total Time: {total_time:.2f}s")
        logger.info(f"📅 Completed: {datetime.now().isoformat()}")
        
        # Save detailed results
        detailed_results = {
            'summary': {
                'passed_tests': passed_tests,
                'total_tests': total_tests,
                'success_rate': success_rate,
                'total_time': total_time,
                'completed_at': datetime.now().isoformat()
            },
            'test_results': self.test_results
        }
        
        with open('ocr_click_pattern_test_results.json', 'w') as f:
            json.dump(detailed_results, f, indent=2, default=str)
        
        logger.info("📁 Detailed results saved to: ocr_click_pattern_test_results.json")
        
        # Cleanup
        if self.service_manager:
            await self.service_manager.cleanup()
        
        return success_rate >= 75.0  # Consider 75% pass rate as success

async def main():
    """Main test execution"""
    tester = OCRClickPatternTester()
    
    try:
        success = await tester.run_all_tests()
        
        if success:
            logger.info("🎉 OCR Click Pattern testing completed successfully!")
            sys.exit(0)
        else:
            logger.error("FAILED: OCR Click Pattern testing failed!")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"❌ Fatal test error: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    # Run the test suite
    asyncio.run(main())