#!/usr/bin/env python3
"""
WebSocket Streaming Test for TRAE Backend
Tests real-time streaming functionality with unified node system integration
"""

import asyncio
import json
import logging
import time
from datetime import datetime
from typing import Dict, Any, List
import websockets
import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class WebSocketStreamingTester:
    """Comprehensive WebSocket streaming functionality tester"""
    
    def __init__(self, host: str = "localhost", port: int = 8007):
        self.host = host
        self.port = port
        self.base_url = f"ws://{host}:{port}"
        self.connections = {}
        self.test_results = {}
        
    async def test_websocket_endpoint(self, endpoint: str, test_name: str, test_messages: List[Dict]) -> Dict[str, Any]:
        """Test a specific WebSocket endpoint with streaming functionality"""
        url = f"{self.base_url}{endpoint}"
        logger.info(f"🧪 Testing WebSocket endpoint: {endpoint} ({test_name})")
        
        result = {
            "endpoint": endpoint,
            "test_name": test_name,
            "success": False,
            "connection_established": False,
            "messages_sent": 0,
            "messages_received": 0,
            "streaming_events": [],
            "errors": [],
            "response_times": [],
            "start_time": time.time(),
            "end_time": None
        }
        
        try:
            # Connect to WebSocket
            async with websockets.connect(url) as websocket:
                connection_time = time.time()
                result["connection_established"] = True
                result["connection_time"] = connection_time - result["start_time"]
                
                logger.info(f"✅ Connected to {endpoint} in {result['connection_time']:.3f}s")
                
                # Wait for welcome message
                try:
                    welcome_msg = await asyncio.wait_for(websocket.recv(), timeout=5)
                    welcome_data = json.loads(welcome_msg)
                    result["welcome_message"] = welcome_data
                    logger.info(f"📨 Welcome message: {welcome_data.get('type', 'unknown')}")
                except asyncio.TimeoutError:
                    result["errors"].append("No welcome message received")
                except Exception as e:
                    result["errors"].append(f"Welcome message error: {e}")
                
                # Send test messages and collect streaming responses
                for i, message in enumerate(test_messages):
                    send_time = time.time()
                    
                    try:
                        logger.info(f"📤 Sending message {i+1}: {message.get('type', 'unknown')}")
                        await websocket.send(json.dumps(message))
                        result["messages_sent"] += 1
                        
                        # Wait for response(s) - streaming endpoints may send multiple messages
                        response_timeout = message.get("response_timeout", 10)
                        responses_collected = 0
                        max_responses = message.get("max_responses", 1)
                        
                        while responses_collected < max_responses:
                            try:
                                response = await asyncio.wait_for(websocket.recv(), timeout=response_timeout)
                                receive_time = time.time()
                                result["messages_received"] += 1
                                responses_collected += 1
                                
                                response_data = json.loads(response)
                                response_time = receive_time - send_time
                                result["response_times"].append(response_time)
                                
                                # Track streaming events
                                if response_data.get("type") in ["node_update", "execution_update", "system_notification", "desktop_stream", "file_event"]:
                                    result["streaming_events"].append({
                                        "type": response_data.get("type"),
                                        "timestamp": response_data.get("timestamp"),
                                        "data": response_data,
                                        "response_time": response_time
                                    })
                                    logger.info(f"🌊 Streaming event: {response_data.get('type')}")
                                
                                logger.info(f"📨 Response {responses_collected}: {response_data.get('type', 'unknown')} ({response_time:.3f}s)")
                                
                                # Break early if we get an error response
                                if response_data.get("type") == "error":
                                    result["errors"].append(response_data.get("message", "Unknown error"))
                                    break
                                    
                            except asyncio.TimeoutError:
                                if responses_collected == 0:
                                    result["errors"].append(f"No response to message {i+1}")
                                break
                            except Exception as e:
                                result["errors"].append(f"Response error for message {i+1}: {e}")
                                break
                        
                        # Small delay between messages
                        await asyncio.sleep(0.1)
                        
                    except Exception as e:
                        result["errors"].append(f"Send error for message {i+1}: {e}")
                
                # Test continuous streaming for endpoints that support it
                if "streaming" in test_name.lower():
                    logger.info(f"🔄 Testing continuous streaming for {endpoint}")
                    
                    # Listen for additional streaming messages
                    streaming_timeout = 5
                    try:
                        while time.time() - connection_time < streaming_timeout:
                            try:
                                stream_msg = await asyncio.wait_for(websocket.recv(), timeout=1)
                                stream_data = json.loads(stream_msg)
                                
                                if stream_data.get("type") in ["node_update", "execution_update", "desktop_stream"]:
                                    result["streaming_events"].append({
                                        "type": stream_data.get("type"),
                                        "timestamp": stream_data.get("timestamp"),
                                        "data": stream_data,
                                        "continuous": True
                                    })
                                    logger.info(f"🌊 Continuous stream: {stream_data.get('type')}")
                                    
                            except asyncio.TimeoutError:
                                continue
                            except Exception as e:
                                logger.debug(f"Continuous streaming error: {e}")
                                break
                                
                    except Exception as e:
                        logger.debug(f"Streaming test error: {e}")
                
                result["success"] = len(result["errors"]) == 0
                
        except websockets.exceptions.ConnectionClosed as e:
            result["errors"].append(f"Connection closed: {e}")
            logger.error(f"❌ Connection closed for {endpoint}: {e}")
        except websockets.exceptions.WebSocketException as e:
            result["errors"].append(f"WebSocket error: {e}")
            logger.error(f"❌ WebSocket error for {endpoint}: {e}")
        except Exception as e:
            result["errors"].append(f"General error: {e}")
            logger.error(f"❌ Error for {endpoint}: {e}")
        
        result["end_time"] = time.time()
        result["total_duration"] = result["end_time"] - result["start_time"]
        
        return result
    
    async def test_node_execution_streaming(self) -> Dict[str, Any]:
        """Test WebSocket streaming during node execution"""
        logger.info("🚀 Testing Node Execution Streaming")
        
        # Create a test graph with nodes that will generate streaming updates
        test_graph = {
            "nodes": [
                {
                    "id": "test_input",
                    "type": "text_input", 
                    "data": {"text": "WebSocket streaming test"}
                },
                {
                    "id": "test_output",
                    "type": "display_output",
                    "data": {}
                }
            ],
            "edges": [
                {
                    "source": "test_input",
                    "target": "test_output",
                    "sourceHandle": "text_output",
                    "targetHandle": "display_input"
                }
            ]
        }
        
        test_messages = [
            {
                "type": "subscribe",
                "subscriptions": ["node_update", "execution_update", "system_notification"]
            },
            {
                "type": "execute_graph",
                "graph_data": test_graph,
                "max_responses": 5,
                "response_timeout": 15
            },
            {
                "type": "get_status"
            }
        ]
        
        return await self.test_websocket_endpoint("/ws", "Node Execution Streaming", test_messages)
    
    async def test_live_desktop_streaming(self) -> Dict[str, Any]:
        """Test live desktop streaming WebSocket functionality"""
        logger.info("🖥️ Testing Live Desktop Streaming")
        
        test_messages = [
            {
                "type": "start_streaming",
                "config": {"fps": 2, "quality": 50}
            },
            {
                "type": "get_status"
            },
            {
                "type": "ping"
            }
        ]
        
        return await self.test_websocket_endpoint("/ws/live-desktop", "Live Desktop Streaming", test_messages)
    
    async def test_file_events_streaming(self) -> Dict[str, Any]:
        """Test file events streaming WebSocket functionality"""
        logger.info("📁 Testing File Events Streaming")
        
        test_messages = [
            {
                "type": "get_watchers"
            },
            {
                "type": "ping"
            }
        ]
        
        return await self.test_websocket_endpoint("/ws/file-events", "File Events Streaming", test_messages)
    
    async def test_root_websocket_functionality(self) -> Dict[str, Any]:
        """Test root WebSocket endpoint functionality"""
        logger.info("🔌 Testing Root WebSocket")
        
        test_messages = [
            {
                "type": "ping"
            },
            {
                "type": "stats_request"
            },
            {
                "type": "desktop_request"
            },
            {
                "type": "custom_test",
                "data": "echo test"
            }
        ]
        
        return await self.test_websocket_endpoint("/", "Root WebSocket", test_messages)
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all WebSocket streaming tests"""
        logger.info("🎯 Starting Comprehensive WebSocket Streaming Tests")
        logger.info("=" * 60)
        
        test_suite = [
            ("Root WebSocket", self.test_root_websocket_functionality),
            ("Node Execution Streaming", self.test_node_execution_streaming),
            ("Live Desktop Streaming", self.test_live_desktop_streaming),
            ("File Events Streaming", self.test_file_events_streaming)
        ]
        
        results = {}
        successful_tests = 0
        total_tests = len(test_suite)
        
        for test_name, test_func in test_suite:
            try:
                logger.info(f"\n🧪 Running {test_name}...")
                result = await test_func()
                results[test_name] = result
                
                if result["success"]:
                    successful_tests += 1
                    status = "✅ PASS"
                else:
                    status = "❌ FAIL"
                
                logger.info(f"{status} {test_name}")
                logger.info(f"   📊 Sent: {result['messages_sent']}, Received: {result['messages_received']}")
                logger.info(f"   🌊 Streaming Events: {len(result['streaming_events'])}")
                logger.info(f"   ⏱️  Duration: {result['total_duration']:.2f}s")
                
                if result["errors"]:
                    logger.info(f"   ❌ Errors: {len(result['errors'])}")
                    for error in result["errors"][:3]:  # Show first 3 errors
                        logger.info(f"      - {error}")
                
            except Exception as e:
                logger.error(f"❌ Test {test_name} failed with exception: {e}")
                results[test_name] = {
                    "success": False,
                    "errors": [str(e)],
                    "exception": True
                }
        
        # Generate summary
        summary = {
            "total_tests": total_tests,
            "successful_tests": successful_tests,
            "failed_tests": total_tests - successful_tests,
            "success_rate": (successful_tests / total_tests) * 100,
            "detailed_results": results
        }
        
        logger.info(f"\n{'='*60}")
        logger.info(f"🎯 WEBSOCKET STREAMING TEST SUMMARY")
        logger.info(f"{'='*60}")
        logger.info(f"📈 Success Rate: {summary['success_rate']:.1f}% ({successful_tests}/{total_tests})")
        
        if successful_tests == total_tests:
            logger.info("🎉 All WebSocket streaming tests passed!")
            logger.info("🌊 Real-time streaming functionality is working correctly")
            logger.info("🔗 Node system WebSocket integration verified")
        else:
            logger.warning(f"⚠️ {summary['failed_tests']} test(s) failed")
            logger.info("🔧 Check the detailed results for specific issues")
        
        return summary

async def main():
    """Main test execution function"""
    print("🌊 TRAE Backend WebSocket Streaming Tests")
    print("=========================================")
    print("Testing real-time WebSocket functionality with node system integration")
    print()
    
    tester = WebSocketStreamingTester()
    
    try:
        # Run all streaming tests
        results = await tester.run_all_tests()
        
        # Print final status
        if results["success_rate"] == 100.0:
            print("\n✨ All WebSocket streaming tests passed successfully!")
            print("🔗 Node system WebSocket integration is fully functional")
            print("🌊 Real-time streaming capabilities verified")
            return 0
        else:
            print(f"\n⚠️ {results['failed_tests']} test(s) failed")
            print("🔧 WebSocket streaming functionality needs attention")
            return 1
            
    except Exception as e:
        logger.error(f"💥 Test execution failed: {e}")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)