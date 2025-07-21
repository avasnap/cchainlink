#!/usr/bin/env python3
"""
Type checking script for Avalanche Chainlink API
Runs comprehensive static type analysis and validation
"""

import subprocess
import sys
from typing import List, Dict, Any, Optional
from pathlib import Path


def run_mypy() -> Dict[str, Any]:
    """Run mypy static type checking"""
    print("🔍 Running mypy static type checking...")
    
    try:
        result = subprocess.run(
            ["mypy", ".", "--config-file", "mypy.ini"],
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent
        )
        
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
    except FileNotFoundError:
        return {
            "success": False,
            "stdout": "",
            "stderr": "mypy not found. Install with: pip install mypy",
            "returncode": 1
        }


def validate_pydantic_models() -> Dict[str, Any]:
    """Validate Pydantic models for type safety"""
    print("🔍 Validating Pydantic models...")
    
    try:
        from models import (
            FeedMetadata, PriceData, RawPriceData, RoundData,
            FeedDescription, FeedVersion, FeedDecimals,
            ProofOfReserveData, ReservesSnapshot, ApiResponse,
            ErrorResponse, HealthCheck, PriceRefreshResponse
        )
        
        # Test model instantiation with type validation
        test_cases = []
        
        # Valid test case
        try:
            feed = FeedMetadata(
                name="BTC / USD",
                symbol="BTCUSD",
                contractAddress="0xa9Afa74dDAC812B86Eeaa60A035c6592470F4A48",
                proxyAddress="0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743",
                decimals=8,
                deviationThreshold=0.1,
                heartbeat=86400,
                assetClass="Crypto",
                productName="BTC/USD-RefPrice-DF-Avalanche-001",
                baseAsset="BTC",
                quoteAsset="USD"
            )
            test_cases.append(("FeedMetadata valid", True, None))
        except Exception as e:
            test_cases.append(("FeedMetadata valid", False, str(e)))
        
        # Invalid test case (should fail)
        try:
            invalid_feed = FeedMetadata(
                name="BTC / USD",
                symbol="BTCUSD",
                contractAddress="invalid_address",  # Invalid address
                proxyAddress="0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743",
                decimals=8,
                deviationThreshold=0.1,
                heartbeat=86400,
                assetClass="Crypto",
                productName="BTC/USD-RefPrice-DF-Avalanche-001",
                baseAsset="BTC",
                quoteAsset="USD"
            )
            test_cases.append(("FeedMetadata invalid should fail", False, "Should have failed validation"))
        except Exception as e:
            test_cases.append(("FeedMetadata invalid should fail", True, f"Correctly failed: {e}"))
        
        return {
            "success": all(case[1] for case in test_cases),
            "test_cases": test_cases
        }
        
    except ImportError as e:
        return {
            "success": False,
            "test_cases": [("Import models", False, str(e))]
        }


def check_type_annotations() -> Dict[str, Any]:
    """Check that all functions have proper type annotations"""
    print("🔍 Checking type annotations...")
    
    import ast
    import inspect
    from pathlib import Path
    
    files_to_check = ["main.py", "price_service.py", "models.py"]
    issues = []
    
    for file_path in files_to_check:
        if not Path(file_path).exists():
            continue
            
        try:
            with open(file_path, 'r') as f:
                source = f.read()
            
            tree = ast.parse(source, filename=file_path)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    # Check if function has return annotation
                    if node.returns is None and node.name != "__init__":
                        issues.append(f"{file_path}:{node.lineno} - Function '{node.name}' missing return annotation")
                    
                    # Check if arguments have annotations
                    for arg in node.args.args:
                        if arg.annotation is None and arg.arg != "self":
                            issues.append(f"{file_path}:{node.lineno} - Argument '{arg.arg}' in '{node.name}' missing type annotation")
                            
        except Exception as e:
            issues.append(f"Error parsing {file_path}: {e}")
    
    return {
        "success": len(issues) == 0,
        "issues": issues
    }


def main() -> int:
    """Run all type checking validations"""
    print("🚀 Starting comprehensive type checking for Avalanche Chainlink API...")
    print("=" * 70)
    
    all_passed = True
    
    # Run mypy
    mypy_result = run_mypy()
    if mypy_result["success"]:
        print("✅ MyPy static type checking passed")
    else:
        print("❌ MyPy static type checking failed:")
        print(mypy_result["stderr"])
        print(mypy_result["stdout"])
        all_passed = False
    
    print("-" * 70)
    
    # Validate Pydantic models
    model_result = validate_pydantic_models()
    if model_result["success"]:
        print("✅ Pydantic model validation passed")
        for test_name, passed, details in model_result["test_cases"]:
            status = "✅" if passed else "❌"
            print(f"  {status} {test_name}")
            if details and not passed:
                print(f"    Details: {details}")
    else:
        print("❌ Pydantic model validation failed:")
        for test_name, passed, details in model_result["test_cases"]:
            status = "✅" if passed else "❌"
            print(f"  {status} {test_name}")
            if details:
                print(f"    Details: {details}")
        all_passed = False
    
    print("-" * 70)
    
    # Check type annotations
    annotation_result = check_type_annotations()
    if annotation_result["success"]:
        print("✅ Type annotation checking passed")
    else:
        print("❌ Type annotation checking found issues:")
        for issue in annotation_result["issues"]:
            print(f"  • {issue}")
        all_passed = False
    
    print("=" * 70)
    
    if all_passed:
        print("🎉 All type checking validations passed!")
        print("📊 Python implementation is strongly typed and validated")
        return 0
    else:
        print("💥 Some type checking validations failed")
        print("🔧 Please fix the issues above to achieve strong typing")
        return 1


if __name__ == "__main__":
    sys.exit(main())