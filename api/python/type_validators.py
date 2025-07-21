"""
Runtime type validation decorators and utilities
Provides runtime type checking to complement static type hints
"""

import functools
import inspect
from typing import Any, Callable, Dict, get_type_hints, Union, get_origin, get_args
from types import UnionType

def validate_types(func: Callable[..., Any]) -> Callable[..., Any]:
    """
    Decorator that validates function arguments and return values at runtime
    based on type hints. Provides strong runtime type safety.
    """
    
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        # Get type hints for the function
        try:
            hints = get_type_hints(func)
        except (NameError, AttributeError):
            # If we can't get hints, just call the function
            return func(*args, **kwargs)
        
        # Get function signature
        sig = inspect.signature(func)
        bound_args = sig.bind(*args, **kwargs)
        bound_args.apply_defaults()
        
        # Validate arguments
        for param_name, value in bound_args.arguments.items():
            if param_name in hints and param_name != 'return':
                expected_type = hints[param_name]
                if not _is_valid_type(value, expected_type):
                    raise TypeError(
                        f"Argument '{param_name}' expected {expected_type}, "
                        f"got {type(value).__name__}: {value}"
                    )
        
        # Call the function
        result = func(*args, **kwargs)
        
        # Validate return value
        if 'return' in hints:
            expected_return_type = hints['return']
            if not _is_valid_type(result, expected_return_type):
                raise TypeError(
                    f"Return value expected {expected_return_type}, "
                    f"got {type(result).__name__}: {result}"
                )
        
        return result
    
    return wrapper


def _is_valid_type(value: Any, expected_type: Any) -> bool:
    """
    Check if a value matches the expected type, handling complex types
    """
    # Handle None/Optional types
    if value is None:
        return _is_optional_type(expected_type)
    
    # Handle Union types (including Optional)
    origin = get_origin(expected_type)
    if origin is Union or origin is UnionType:
        type_args = get_args(expected_type)
        return any(_is_valid_type(value, arg_type) for arg_type in type_args)
    
    # Handle generic types (List, Dict, etc.)
    if origin is not None:
        if origin is list:
            if not isinstance(value, list):
                return False
            # Check element types if specified
            type_args = get_args(expected_type)
            if type_args:
                element_type = type_args[0]
                return all(_is_valid_type(item, element_type) for item in value)
            return True
            
        elif origin is dict:
            if not isinstance(value, dict):
                return False
            # Check key/value types if specified
            type_args = get_args(expected_type)
            if len(type_args) == 2:
                key_type, value_type = type_args
                return all(
                    _is_valid_type(k, key_type) and _is_valid_type(v, value_type)
                    for k, v in value.items()
                )
            return True
    
    # Handle basic type checking
    try:
        return isinstance(value, expected_type)
    except TypeError:
        # For complex types that can't be used with isinstance
        return True


def _is_optional_type(type_hint: Any) -> bool:
    """Check if a type hint represents an Optional type"""
    origin = get_origin(type_hint)
    if origin is Union or origin is UnionType:
        args = get_args(type_hint)
        return type(None) in args
    return False


def validate_address(address: str) -> bool:
    """Validate Ethereum address format"""
    return (
        isinstance(address, str) and
        len(address) == 42 and
        address.startswith('0x') and
        all(c in '0123456789abcdefABCDEF' for c in address[2:])
    )


def validate_symbol(symbol: str) -> bool:
    """Validate trading symbol format"""
    return (
        isinstance(symbol, str) and
        len(symbol) > 0 and
        symbol.isalnum()
    )


def validate_decimals(decimals: int) -> bool:
    """Validate decimals count (0-18 for Ethereum)"""
    return isinstance(decimals, int) and 0 <= decimals <= 18


def validate_price(price: float) -> bool:
    """Validate price value (non-negative)"""
    return isinstance(price, (int, float)) and price >= 0


def validate_block_number(block_number: int) -> bool:
    """Validate block number (non-negative integer)"""
    return isinstance(block_number, int) and block_number >= 0


class TypeValidator:
    """
    Class-based type validator for more complex validation scenarios
    """
    
    @staticmethod
    def validate_feed_metadata(data: Dict[str, Any]) -> bool:
        """Validate feed metadata structure"""
        required_fields = {
            'name': str,
            'symbol': str,
            'contractAddress': str,
            'proxyAddress': str,
            'decimals': int,
            'deviationThreshold': (int, float),
            'heartbeat': int,
            'assetClass': str,
            'productName': str,
            'baseAsset': str,
            'quoteAsset': str
        }
        
        for field, expected_type in required_fields.items():
            if field not in data:
                return False
            if not isinstance(data[field], expected_type):
                return False
        
        # Additional validations
        if not validate_address(data['contractAddress']):
            return False
        if not validate_address(data['proxyAddress']):
            return False
        if not validate_decimals(data['decimals']):
            return False
        if data['heartbeat'] <= 0:
            return False
        
        return True
    
    @staticmethod
    def validate_price_data(data: Dict[str, Any]) -> bool:
        """Validate price data structure"""
        required_fields = {
            'symbol': str,
            'price': (int, float),
            'decimals': int,
            'roundId': str,
            'updatedAt': str,
            'proxyAddress': str,
            'raw': dict
        }
        
        for field, expected_type in required_fields.items():
            if field not in data:
                return False
            if not isinstance(data[field], expected_type):
                return False
        
        # Additional validations
        if not validate_price(data['price']):
            return False
        if not validate_decimals(data['decimals']):
            return False
        if not validate_address(data['proxyAddress']):
            return False
        
        return True


# Example usage decorator for critical functions
def critical_function(func: Callable[..., Any]) -> Callable[..., Any]:
    """
    Enhanced decorator for critical functions that need comprehensive validation
    """
    return validate_types(func)


# Export decorators and validators
__all__ = [
    'validate_types',
    'critical_function',
    'validate_address',
    'validate_symbol', 
    'validate_decimals',
    'validate_price',
    'validate_block_number',
    'TypeValidator'
]