#!/usr/bin/env python3
"""
E2E Test Runner for TRAE Remote Desktop System
Comprehensive test execution with environment setup and reporting

Author: TRAE Development Team
Version: 1.0.0
"""

import os
import sys
import subprocess
import time
import asyncio
import argparse
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import psutil
import requests
from playwright_config import get_test_config, TEST_CONFIG

# Add project root to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))


class TRAETestRunner:
    """Test runner for TRAE E2E tests"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.test_dir = Path(__file__).parent
        self.project_root = self.test_dir.parent.parent
        # Use project root as the frontend app location (root Vite app)
        self.frontend_dir = self.project_root
        self.backend_dir = self.project_root
        
        # Process tracking
        self.frontend_process = None
        self.backend_process = None
        
        # Test results
        self.test_results = {
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "errors": [],
            "duration": 0,
            "timestamp": time.time()
        }
    
    def check_dependencies(self) -> bool:
        """Check if all required dependencies are installed"""
        print("🔍 Checking dependencies...")
        
        required_packages = [
            "playwright",
            "pytest",
            "pytest-playwright",
            "pytest-asyncio",
            "pytest-html",
            "pytest-cov",
            "requests",
            "psutil"
        ]
        
        missing_packages = []
        
        for package in required_packages:
            try:
                __import__(package.replace("-", "_"))
            except ImportError:
                missing_packages.append(package)
        
        if missing_packages:
            print(f"❌ Missing packages: {', '.join(missing_packages)}")
            print("Install with: pip install " + " ".join(missing_packages))
            return False
        
        print("✅ All dependencies are installed")
        return True
    
    def install_playwright_browsers(self) -> bool:
        """Install Playwright browsers if needed"""
        print("🌐 Installing Playwright browsers...")
        
        try:
            result = subprocess.run(
                [sys.executable, "-m", "playwright", "install"],
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode == 0:
                print("✅ Playwright browsers installed successfully")
                return True
            else:
                print(f"❌ Failed to install Playwright browsers: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            print("❌ Playwright browser installation timed out")
            return False
        except Exception as e:
            print(f"❌ Error installing Playwright browsers: {e}")
            return False
    
    def is_port_in_use(self, port: int) -> bool:
        """Check if a port is in use"""
        for conn in psutil.net_connections():
            if conn.laddr.port == port:
                return True
        return False
    
    def wait_for_service(self, url: str, timeout: int = 60) -> bool:
        """Wait for a service to be available"""
        print(f"⏳ Waiting for service at {url}...")
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    print(f"✅ Service at {url} is ready")
                    return True
            except requests.exceptions.RequestException:
                pass
            
            time.sleep(2)
        
        print(f"❌ Service at {url} not ready after {timeout}s")
        return False
    
    def start_backend(self) -> bool:
        """Start the backend service"""
        backend_port = int(self.config["backend_url"].split(":")[-1])
        
        if self.is_port_in_use(backend_port):
            print(f"✅ Backend already running on port {backend_port}")
            return self.wait_for_service(f"{self.config['backend_url']}/api/health")
        
        print("🚀 Starting backend service...")
        
        try:
            # Change to backend directory
            os.chdir(self.backend_dir)
            
            # Start backend with uvicorn
            self.backend_process = subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", str(backend_port)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait for backend to be ready
            return self.wait_for_service(f"{self.config['backend_url']}/api/health")
            
        except Exception as e:
            print(f"❌ Failed to start backend: {e}")
            return False
    
    def start_frontend(self) -> bool:
        """Start the frontend service"""
        frontend_port = int(self.config["frontend_url"].split(":")[-1])
        
        if self.is_port_in_use(frontend_port):
            print(f"✅ Frontend already running on port {frontend_port}")
            return self.wait_for_service(self.config["frontend_url"])
        
        print("🚀 Starting frontend service...")
        
        try:
            # Validate root Vite app exists by checking package.json
            package_json = self.frontend_dir / "package.json"
            if not package_json.exists():
                print(f"❌ Frontend (Vite app) package.json not found at: {package_json}")
                return False
            
            # Change to project root (Vite app)
            os.chdir(self.frontend_dir)
            
            # Install dependencies if needed
            if not (self.frontend_dir / "node_modules").exists():
                print("📦 Installing frontend dependencies...")
                subprocess.run(["npm", "install"], check=True)
            
            # Start frontend development server (Vite)
            self.frontend_process = subprocess.Popen(
                ["npm", "run", "dev", "--", "--port", str(frontend_port)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait for frontend to be ready
            return self.wait_for_service(self.config["frontend_url"])
            
        except Exception as e:
            print(f"❌ Failed to start frontend: {e}")
            return False
    
    def stop_services(self):
        """Stop all started services"""
        print("🛑 Stopping services...")
        
        if self.frontend_process:
            try:
                self.frontend_process.terminate()
                self.frontend_process.wait(timeout=10)
                print("✅ Frontend service stopped")
            except:
                self.frontend_process.kill()
                print("⚠️ Frontend service force killed")
        
        if self.backend_process:
            try:
                self.backend_process.terminate()
                self.backend_process.wait(timeout=10)
                print("✅ Backend service stopped")
            except:
                self.backend_process.kill()
                print("⚠️ Backend service force killed")
    
    def run_tests(self, test_markers: List[str] = None, test_files: List[str] = None) -> bool:
        """Run the E2E tests"""
        print("🧪 Running E2E tests...")
        
        # Change to test directory
        os.chdir(self.test_dir)
        
        # Build pytest command
        cmd = [sys.executable, "-m", "pytest"]
        
        # Add test files or default to all
        if test_files:
            cmd.extend(test_files)
        else:
            cmd.append("test_localhost_integration.py")
        
        # Add markers
        if test_markers:
            for marker in test_markers:
                cmd.extend(["-m", marker])
        
        # Add configuration
        cmd.extend([
            "-v",
            "--tb=short",
            "--maxfail=5",
            f"--html={TEST_CONFIG['test_output_dir']}/e2e_report.html",
            "--self-contained-html",
            f"--junitxml={TEST_CONFIG['test_output_dir']}/e2e_junit.xml"
        ])
        
        # Set environment variables
        env = os.environ.copy()
        env.update({
            "TRAE_FRONTEND_URL": self.config["frontend_url"],
            "TRAE_BACKEND_URL": self.config["backend_url"],
            "TRAE_HEADLESS": str(self.config["headless"]),
        })
        
        try:
            start_time = time.time()
            
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=False,
                text=True
            )
            
            self.test_results["duration"] = time.time() - start_time
            
            if result.returncode == 0:
                print("✅ All tests passed!")
                return True
            else:
                print(f"❌ Tests failed with exit code {result.returncode}")
                return False
                
        except Exception as e:
            print(f"❌ Error running tests: {e}")
            return False
    
    def generate_report(self):
        """Generate test execution report"""
        print("📊 Generating test report...")
        
        report_data = {
            "config": self.config,
            "results": self.test_results,
            "environment": {
                "python_version": sys.version,
                "platform": sys.platform,
                "working_directory": str(Path.cwd()),
            }
        }
        
        report_file = Path(TEST_CONFIG["test_output_dir"]) / "test_execution_report.json"
        
        try:
            with open(report_file, "w") as f:
                json.dump(report_data, f, indent=2, default=str)
            
            print(f"✅ Test report saved to {report_file}")
            
        except Exception as e:
            print(f"❌ Failed to generate report: {e}")
    
    def run_full_test_suite(self, test_markers: List[str] = None, test_files: List[str] = None) -> bool:
        """Run the complete test suite with setup and teardown"""
        print("🎯 Starting TRAE E2E Test Suite")
        print("=" * 50)
        
        success = False
        
        try:
            # Check dependencies
            if not self.check_dependencies():
                return False
            
            # Install Playwright browsers
            if not self.install_playwright_browsers():
                return False
            
            # Start services
            if not self.start_backend():
                print("❌ Failed to start backend service")
                return False
            
            if not self.start_frontend():
                print("❌ Failed to start frontend service")
                return False
            
            # Run tests
            success = self.run_tests(test_markers, test_files)
            
        except KeyboardInterrupt:
            print("\n⚠️ Test execution interrupted by user")
            
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            
        finally:
            # Always stop services and generate report
            self.stop_services()
            self.generate_report()
        
        print("=" * 50)
        if success:
            print("🎉 Test suite completed successfully!")
        else:
            print("💥 Test suite failed!")
        
        return success


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="TRAE E2E Test Runner")
    parser.add_argument(
        "--environment", "-e",
        choices=["development", "ci", "production"],
        default="development",
        help="Test environment"
    )
    parser.add_argument(
        "--markers", "-m",
        nargs="*",
        help="Test markers to run (e.g., smoke, critical)"
    )
    parser.add_argument(
        "--files", "-f",
        nargs="*",
        help="Specific test files to run"
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run tests in headless mode"
    )
    parser.add_argument(
        "--quick",
        action="store_true",
        help="Run only smoke tests"
    )
    
    args = parser.parse_args()
    
    # Get configuration
    config = get_test_config(args.environment)
    
    # Override headless mode if specified
    if args.headless:
        config["headless"] = True
    
    # Set quick test markers
    if args.quick:
        args.markers = ["smoke"]
    
    # Create and run test suite
    runner = TRAETestRunner(config)
    success = runner.run_full_test_suite(args.markers, args.files)
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()