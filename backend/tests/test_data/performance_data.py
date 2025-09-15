#!/usr/bin/env python3
"""
Performance Test Data for OCR Testing
Provides utilities for performance testing and benchmarking
"""

import time
import asyncio
import statistics
import random
from typing import Dict, List, Any, Optional, Callable, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor, as_completed
import json

@dataclass
class PerformanceMetric:
    """Individual performance metric"""
    name: str
    value: float
    unit: str
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class PerformanceTestResult:
    """Result of a performance test"""
    test_name: str
    duration: float
    success_rate: float
    total_operations: int
    successful_operations: int
    failed_operations: int
    metrics: List[PerformanceMetric] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)
    
    def add_metric(self, name: str, value: float, unit: str, **metadata):
        """Add a performance metric"""
        metric = PerformanceMetric(name, value, unit, metadata=metadata)
        self.metrics.append(metric)
    
    def get_metric(self, name: str) -> Optional[PerformanceMetric]:
        """Get a specific metric by name"""
        for metric in self.metrics:
            if metric.name == name:
                return metric
        return None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "test_name": self.test_name,
            "duration": self.duration,
            "success_rate": self.success_rate,
            "total_operations": self.total_operations,
            "successful_operations": self.successful_operations,
            "failed_operations": self.failed_operations,
            "metrics": [
                {
                    "name": m.name,
                    "value": m.value,
                    "unit": m.unit,
                    "timestamp": m.timestamp.isoformat(),
                    "metadata": m.metadata
                }
                for m in self.metrics
            ],
            "errors": self.errors,
            "timestamp": self.timestamp.isoformat()
        }

class PerformanceTestData:
    """Generates and manages performance test data"""
    
    def __init__(self):
        self.test_results: List[PerformanceTestResult] = []
        self.baseline_metrics: Dict[str, float] = {}
    
    def create_load_test_scenario(
        self,
        concurrent_users: int = 10,
        requests_per_user: int = 50,
        ramp_up_time: float = 5.0,
        test_duration: float = 60.0
    ) -> Dict[str, Any]:
        """Create a load test scenario
        
        Args:
            concurrent_users: Number of concurrent users
            requests_per_user: Requests per user
            ramp_up_time: Time to ramp up all users (seconds)
            test_duration: Total test duration (seconds)
            
        Returns:
            Load test scenario configuration
        """
        return {
            "scenario_type": "load_test",
            "concurrent_users": concurrent_users,
            "requests_per_user": requests_per_user,
            "total_requests": concurrent_users * requests_per_user,
            "ramp_up_time": ramp_up_time,
            "test_duration": test_duration,
            "user_spawn_rate": concurrent_users / ramp_up_time if ramp_up_time > 0 else concurrent_users,
            "expected_rps": (concurrent_users * requests_per_user) / test_duration,
            "test_data": self._generate_request_data(concurrent_users * requests_per_user)
        }
    
    def create_stress_test_scenario(
        self,
        max_users: int = 100,
        step_size: int = 10,
        step_duration: float = 30.0,
        breaking_point_threshold: float = 0.95
    ) -> Dict[str, Any]:
        """Create a stress test scenario
        
        Args:
            max_users: Maximum number of users to test
            step_size: Number of users to add per step
            step_duration: Duration of each step (seconds)
            breaking_point_threshold: Success rate threshold for breaking point
            
        Returns:
            Stress test scenario configuration
        """
        steps = []
        current_users = step_size
        
        while current_users <= max_users:
            steps.append({
                "users": current_users,
                "duration": step_duration,
                "expected_rps": current_users * 2,  # Assume 2 RPS per user
                "test_data": self._generate_request_data(current_users * int(step_duration * 2))
            })
            current_users += step_size
        
        return {
            "scenario_type": "stress_test",
            "max_users": max_users,
            "step_size": step_size,
            "step_duration": step_duration,
            "total_steps": len(steps),
            "breaking_point_threshold": breaking_point_threshold,
            "steps": steps
        }
    
    def create_spike_test_scenario(
        self,
        baseline_users: int = 10,
        spike_users: int = 100,
        spike_duration: float = 30.0,
        recovery_time: float = 60.0
    ) -> Dict[str, Any]:
        """Create a spike test scenario
        
        Args:
            baseline_users: Baseline number of users
            spike_users: Number of users during spike
            spike_duration: Duration of spike (seconds)
            recovery_time: Time to recover after spike (seconds)
            
        Returns:
            Spike test scenario configuration
        """
        phases = [
            {
                "phase": "baseline",
                "users": baseline_users,
                "duration": 60.0,
                "test_data": self._generate_request_data(baseline_users * 60)
            },
            {
                "phase": "spike",
                "users": spike_users,
                "duration": spike_duration,
                "test_data": self._generate_request_data(spike_users * int(spike_duration))
            },
            {
                "phase": "recovery",
                "users": baseline_users,
                "duration": recovery_time,
                "test_data": self._generate_request_data(baseline_users * int(recovery_time))
            }
        ]
        
        return {
            "scenario_type": "spike_test",
            "baseline_users": baseline_users,
            "spike_users": spike_users,
            "spike_duration": spike_duration,
            "recovery_time": recovery_time,
            "phases": phases
        }
    
    def create_endurance_test_scenario(
        self,
        users: int = 20,
        duration_hours: float = 2.0,
        requests_per_minute: int = 60
    ) -> Dict[str, Any]:
        """Create an endurance test scenario
        
        Args:
            users: Number of concurrent users
            duration_hours: Test duration in hours
            requests_per_minute: Requests per minute per user
            
        Returns:
            Endurance test scenario configuration
        """
        total_duration = duration_hours * 3600  # Convert to seconds
        total_requests = int(users * requests_per_minute * duration_hours * 60)
        
        return {
            "scenario_type": "endurance_test",
            "users": users,
            "duration_hours": duration_hours,
            "duration_seconds": total_duration,
            "requests_per_minute": requests_per_minute,
            "total_requests": total_requests,
            "expected_rps": (users * requests_per_minute) / 60,
            "test_data": self._generate_request_data(total_requests),
            "monitoring_intervals": self._generate_monitoring_schedule(duration_hours)
        }
    
    def create_benchmark_suite(self) -> Dict[str, Any]:
        """Create a comprehensive benchmark suite
        
        Returns:
            Benchmark suite configuration
        """
        return {
            "suite_name": "OCR Performance Benchmark",
            "version": "1.0",
            "timestamp": datetime.now().isoformat(),
            "tests": {
                "baseline": self._create_baseline_test(),
                "throughput": self._create_throughput_test(),
                "latency": self._create_latency_test(),
                "memory": self._create_memory_test(),
                "cache_performance": self._create_cache_test(),
                "concurrent_processing": self._create_concurrency_test(),
                "image_size_scaling": self._create_scaling_test(),
                "language_performance": self._create_language_test()
            }
        }
    
    def generate_performance_baseline(
        self,
        service,
        sample_size: int = 100
    ) -> Dict[str, float]:
        """Generate performance baseline metrics
        
        Args:
            service: OCR service to benchmark
            sample_size: Number of samples for baseline
            
        Returns:
            Baseline metrics dictionary
        """
        from .image_generator import ImageGenerator
        
        generator = ImageGenerator()
        processing_times = []
        confidence_scores = []
        
        for i in range(sample_size):
            # Create test image
            text = f"Baseline test {i}"
            img = generator.create_text_image(text)
            base64_data = generator.image_to_base64(img)
            
            # Measure processing time
            start_time = time.time()
            try:
                result = asyncio.run(service.process_region(
                    base64_data,
                    {"x": 0, "y": 0, "width": 200, "height": 100}
                ))
                processing_time = time.time() - start_time
                
                processing_times.append(processing_time)
                confidence_scores.append(result.get("confidence", 0.0))
                
            except Exception as e:
                print(f"Baseline test {i} failed: {e}")
        
        if processing_times:
            baseline = {
                "avg_processing_time": statistics.mean(processing_times),
                "median_processing_time": statistics.median(processing_times),
                "p95_processing_time": self._percentile(processing_times, 95),
                "p99_processing_time": self._percentile(processing_times, 99),
                "min_processing_time": min(processing_times),
                "max_processing_time": max(processing_times),
                "avg_confidence": statistics.mean(confidence_scores) if confidence_scores else 0.0,
                "sample_size": len(processing_times)
            }
            
            self.baseline_metrics = baseline
            return baseline
        
        return {}
    
    async def run_performance_test(
        self,
        test_name: str,
        test_function: Callable,
        test_data: List[Any],
        concurrent_limit: int = 10
    ) -> PerformanceTestResult:
        """Run a performance test
        
        Args:
            test_name: Name of the test
            test_function: Async function to test
            test_data: List of test data items
            concurrent_limit: Maximum concurrent operations
            
        Returns:
            Performance test result
        """
        start_time = time.time()
        successful = 0
        failed = 0
        errors = []
        processing_times = []
        
        # Create semaphore for concurrency control
        semaphore = asyncio.Semaphore(concurrent_limit)
        
        async def run_single_test(data):
            async with semaphore:
                try:
                    test_start = time.time()
                    await test_function(data)
                    test_time = time.time() - test_start
                    processing_times.append(test_time)
                    return True
                except Exception as e:
                    errors.append(str(e))
                    return False
        
        # Run all tests concurrently
        tasks = [run_single_test(data) for data in test_data]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Count results
        for result in results:
            if result is True:
                successful += 1
            else:
                failed += 1
        
        total_time = time.time() - start_time
        success_rate = successful / len(test_data) if test_data else 0
        
        # Create result object
        result = PerformanceTestResult(
            test_name=test_name,
            duration=total_time,
            success_rate=success_rate,
            total_operations=len(test_data),
            successful_operations=successful,
            failed_operations=failed,
            errors=errors[:10]  # Limit error list
        )
        
        # Add metrics
        if processing_times:
            result.add_metric("avg_processing_time", statistics.mean(processing_times), "seconds")
            result.add_metric("median_processing_time", statistics.median(processing_times), "seconds")
            result.add_metric("p95_processing_time", self._percentile(processing_times, 95), "seconds")
            result.add_metric("p99_processing_time", self._percentile(processing_times, 99), "seconds")
            result.add_metric("min_processing_time", min(processing_times), "seconds")
            result.add_metric("max_processing_time", max(processing_times), "seconds")
        
        result.add_metric("throughput", successful / total_time if total_time > 0 else 0, "ops/sec")
        result.add_metric("error_rate", failed / len(test_data) if test_data else 0, "percentage")
        
        self.test_results.append(result)
        return result
    
    def analyze_performance_trends(
        self,
        results: List[PerformanceTestResult]
    ) -> Dict[str, Any]:
        """Analyze performance trends across multiple test results
        
        Args:
            results: List of performance test results
            
        Returns:
            Performance trend analysis
        """
        if not results:
            return {}
        
        # Group results by test name
        grouped_results = {}
        for result in results:
            if result.test_name not in grouped_results:
                grouped_results[result.test_name] = []
            grouped_results[result.test_name].append(result)
        
        trends = {}
        
        for test_name, test_results in grouped_results.items():
            if len(test_results) < 2:
                continue
            
            # Sort by timestamp
            test_results.sort(key=lambda x: x.timestamp)
            
            # Calculate trends
            success_rates = [r.success_rate for r in test_results]
            durations = [r.duration for r in test_results]
            throughputs = [r.get_metric("throughput").value if r.get_metric("throughput") else 0 for r in test_results]
            
            trends[test_name] = {
                "success_rate_trend": self._calculate_trend(success_rates),
                "duration_trend": self._calculate_trend(durations),
                "throughput_trend": self._calculate_trend(throughputs),
                "latest_success_rate": success_rates[-1],
                "avg_success_rate": statistics.mean(success_rates),
                "performance_degradation": self._detect_degradation(throughputs),
                "stability_score": self._calculate_stability(success_rates)
            }
        
        return trends
    
    def generate_performance_report(
        self,
        results: List[PerformanceTestResult] = None
    ) -> Dict[str, Any]:
        """Generate comprehensive performance report
        
        Args:
            results: List of results to include (defaults to all stored results)
            
        Returns:
            Performance report
        """
        if results is None:
            results = self.test_results
        
        if not results:
            return {"error": "No test results available"}
        
        # Calculate summary statistics
        total_operations = sum(r.total_operations for r in results)
        total_successful = sum(r.successful_operations for r in results)
        total_failed = sum(r.failed_operations for r in results)
        
        # Get all processing times
        all_processing_times = []
        for result in results:
            metric = result.get_metric("avg_processing_time")
            if metric:
                all_processing_times.append(metric.value)
        
        # Get all throughputs
        all_throughputs = []
        for result in results:
            metric = result.get_metric("throughput")
            if metric:
                all_throughputs.append(metric.value)
        
        report = {
            "report_timestamp": datetime.now().isoformat(),
            "summary": {
                "total_tests": len(results),
                "total_operations": total_operations,
                "total_successful": total_successful,
                "total_failed": total_failed,
                "overall_success_rate": total_successful / total_operations if total_operations > 0 else 0
            },
            "performance_metrics": {},
            "test_results": [r.to_dict() for r in results],
            "trends": self.analyze_performance_trends(results),
            "baseline_comparison": self._compare_to_baseline(results)
        }
        
        # Add performance metrics if available
        if all_processing_times:
            report["performance_metrics"]["processing_time"] = {
                "avg": statistics.mean(all_processing_times),
                "median": statistics.median(all_processing_times),
                "p95": self._percentile(all_processing_times, 95),
                "p99": self._percentile(all_processing_times, 99),
                "min": min(all_processing_times),
                "max": max(all_processing_times)
            }
        
        if all_throughputs:
            report["performance_metrics"]["throughput"] = {
                "avg": statistics.mean(all_throughputs),
                "median": statistics.median(all_throughputs),
                "max": max(all_throughputs),
                "min": min(all_throughputs)
            }
        
        return report
    
    def _generate_request_data(self, count: int) -> List[Dict[str, Any]]:
        """Generate request data for performance testing"""
        requests = []
        
        for i in range(count):
            # Vary request complexity
            complexity = random.choice(["simple", "medium", "complex"])
            
            if complexity == "simple":
                text_length = random.randint(5, 20)
                image_size = (200, 100)
            elif complexity == "medium":
                text_length = random.randint(20, 50)
                image_size = (400, 200)
            else:  # complex
                text_length = random.randint(50, 100)
                image_size = (800, 400)
            
            request = {
                "request_id": f"perf_req_{i}",
                "text": " ".join([f"word{j}" for j in range(text_length)]),
                "complexity": complexity,
                "image_size": image_size,
                "language": random.choice(["eng", "deu", "fra", "spa"]),
                "region": {
                    "x": random.randint(0, 50),
                    "y": random.randint(0, 50),
                    "width": image_size[0] - 50,
                    "height": image_size[1] - 50
                }
            }
            
            requests.append(request)
        
        return requests
    
    def _generate_monitoring_schedule(self, duration_hours: float) -> List[Dict[str, Any]]:
        """Generate monitoring schedule for endurance tests"""
        intervals = []
        current_time = 0
        interval_minutes = 15  # Monitor every 15 minutes
        
        while current_time < duration_hours * 60:
            intervals.append({
                "time_minutes": current_time,
                "metrics_to_collect": [
                    "memory_usage", "cpu_usage", "response_time",
                    "error_rate", "cache_hit_rate", "active_connections"
                ]
            })
            current_time += interval_minutes
        
        return intervals
    
    def _create_baseline_test(self) -> Dict[str, Any]:
        """Create baseline performance test configuration"""
        return {
            "name": "baseline_performance",
            "description": "Baseline single-user performance test",
            "users": 1,
            "requests": 100,
            "duration": 60,
            "test_data": self._generate_request_data(100)
        }
    
    def _create_throughput_test(self) -> Dict[str, Any]:
        """Create throughput test configuration"""
        return {
            "name": "throughput_test",
            "description": "Maximum throughput test",
            "users": 50,
            "requests": 1000,
            "duration": 120,
            "test_data": self._generate_request_data(1000)
        }
    
    def _create_latency_test(self) -> Dict[str, Any]:
        """Create latency test configuration"""
        return {
            "name": "latency_test",
            "description": "Response latency measurement",
            "users": 5,
            "requests": 200,
            "duration": 60,
            "test_data": self._generate_request_data(200)
        }
    
    def _create_memory_test(self) -> Dict[str, Any]:
        """Create memory usage test configuration"""
        return {
            "name": "memory_test",
            "description": "Memory usage under load",
            "users": 20,
            "requests": 500,
            "duration": 180,
            "test_data": self._generate_request_data(500)
        }
    
    def _create_cache_test(self) -> Dict[str, Any]:
        """Create cache performance test configuration"""
        # Generate repeated requests to test cache effectiveness
        base_requests = self._generate_request_data(50)
        repeated_requests = base_requests * 4  # Repeat 4 times
        
        return {
            "name": "cache_performance",
            "description": "Cache hit rate and performance",
            "users": 10,
            "requests": len(repeated_requests),
            "duration": 120,
            "test_data": repeated_requests
        }
    
    def _create_concurrency_test(self) -> Dict[str, Any]:
        """Create concurrency test configuration"""
        return {
            "name": "concurrency_test",
            "description": "High concurrency processing",
            "users": 100,
            "requests": 500,
            "duration": 60,
            "test_data": self._generate_request_data(500)
        }
    
    def _create_scaling_test(self) -> Dict[str, Any]:
        """Create image size scaling test configuration"""
        # Generate requests with varying image sizes
        requests = []
        sizes = [(100, 50), (200, 100), (400, 200), (800, 400), (1600, 800)]
        
        for size in sizes:
            for i in range(20):
                request = {
                    "request_id": f"scale_{size[0]}x{size[1]}_{i}",
                    "text": f"Scaling test {size[0]}x{size[1]}",
                    "image_size": size,
                    "complexity": "medium",
                    "language": "eng",
                    "region": {"x": 0, "y": 0, "width": size[0], "height": size[1]}
                }
                requests.append(request)
        
        return {
            "name": "scaling_test",
            "description": "Performance scaling with image size",
            "users": 5,
            "requests": len(requests),
            "duration": 180,
            "test_data": requests
        }
    
    def _create_language_test(self) -> Dict[str, Any]:
        """Create multi-language performance test configuration"""
        languages = ["eng", "deu", "fra", "spa", "ita"]
        requests = []
        
        for lang in languages:
            for i in range(20):
                request = {
                    "request_id": f"lang_{lang}_{i}",
                    "text": f"Language test {lang}",
                    "language": lang,
                    "complexity": "medium",
                    "image_size": (300, 150),
                    "region": {"x": 0, "y": 0, "width": 300, "height": 150}
                }
                requests.append(request)
        
        return {
            "name": "language_performance",
            "description": "Performance across different languages",
            "users": 10,
            "requests": len(requests),
            "duration": 120,
            "test_data": requests
        }
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile of data"""
        if not data:
            return 0.0
        sorted_data = sorted(data)
        index = int((percentile / 100) * len(sorted_data))
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend direction"""
        if len(values) < 2:
            return "insufficient_data"
        
        first_half = values[:len(values)//2]
        second_half = values[len(values)//2:]
        
        first_avg = statistics.mean(first_half)
        second_avg = statistics.mean(second_half)
        
        if second_avg > first_avg * 1.05:
            return "improving"
        elif second_avg < first_avg * 0.95:
            return "degrading"
        else:
            return "stable"
    
    def _detect_degradation(self, values: List[float]) -> bool:
        """Detect performance degradation"""
        if len(values) < 3:
            return False
        
        recent = values[-3:]
        earlier = values[:-3] if len(values) > 3 else values[:1]
        
        if not earlier:
            return False
        
        recent_avg = statistics.mean(recent)
        earlier_avg = statistics.mean(earlier)
        
        return recent_avg < earlier_avg * 0.9  # 10% degradation threshold
    
    def _calculate_stability(self, values: List[float]) -> float:
        """Calculate stability score (0-1, higher is more stable)"""
        if len(values) < 2:
            return 1.0
        
        mean_val = statistics.mean(values)
        if mean_val == 0:
            return 0.0
        
        variance = statistics.variance(values)
        coefficient_of_variation = (variance ** 0.5) / mean_val
        
        # Convert to stability score (inverse of coefficient of variation)
        stability = 1 / (1 + coefficient_of_variation)
        return min(stability, 1.0)
    
    def _compare_to_baseline(self, results: List[PerformanceTestResult]) -> Dict[str, Any]:
        """Compare results to baseline metrics"""
        if not self.baseline_metrics or not results:
            return {}
        
        comparison = {}
        
        # Get average metrics from results
        processing_times = []
        throughputs = []
        
        for result in results:
            pt_metric = result.get_metric("avg_processing_time")
            if pt_metric:
                processing_times.append(pt_metric.value)
            
            tp_metric = result.get_metric("throughput")
            if tp_metric:
                throughputs.append(tp_metric.value)
        
        if processing_times and "avg_processing_time" in self.baseline_metrics:
            current_avg = statistics.mean(processing_times)
            baseline_avg = self.baseline_metrics["avg_processing_time"]
            
            comparison["processing_time"] = {
                "current": current_avg,
                "baseline": baseline_avg,
                "change_percent": ((current_avg - baseline_avg) / baseline_avg) * 100 if baseline_avg > 0 else 0,
                "performance_ratio": baseline_avg / current_avg if current_avg > 0 else 0
            }
        
        if throughputs:
            current_throughput = statistics.mean(throughputs)
            # Estimate baseline throughput (inverse of processing time)
            baseline_throughput = 1 / self.baseline_metrics.get("avg_processing_time", 1)
            
            comparison["throughput"] = {
                "current": current_throughput,
                "estimated_baseline": baseline_throughput,
                "improvement_factor": current_throughput / baseline_throughput if baseline_throughput > 0 else 0
            }
        
        return comparison

# Convenience functions
def create_load_test(users: int = 10, requests: int = 100) -> Dict[str, Any]:
    """Create a simple load test scenario"""
    data = PerformanceTestData()
    return data.create_load_test_scenario(users, requests)

def create_benchmark_suite() -> Dict[str, Any]:
    """Create a comprehensive benchmark suite"""
    data = PerformanceTestData()
    return data.create_benchmark_suite()