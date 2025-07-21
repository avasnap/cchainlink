// ABI and interface tests
const fs = require('fs');
const { ethers } = require('ethers');

describe('Chainlink ABI Interface', () => {
  let abi;
  
  beforeAll(() => {
    const abiFile = fs.readFileSync('./chainlink_abi_interface.json', 'utf8');
    abi = JSON.parse(abiFile);
  });

  test('ABI file exists and is valid JSON', () => {
    expect(abi).toBeDefined();
    expect(Array.isArray(abi)).toBe(true);
    expect(abi.length).toBeGreaterThan(0);
  });

  test('contains required Chainlink functions', () => {
    const functionNames = abi
      .filter(item => item.type === 'function')
      .map(item => item.name);
    
    const requiredFunctions = [
      'latestRoundData',
      'decimals',
      'description',
      'version',
      'getRoundData'
    ];
    
    requiredFunctions.forEach(funcName => {
      expect(functionNames).toContain(funcName);
    });
  });

  test('latestRoundData function has correct signature', () => {
    const latestRoundData = abi.find(item => 
      item.name === 'latestRoundData' && item.type === 'function'
    );
    
    expect(latestRoundData).toBeDefined();
    expect(latestRoundData.inputs).toEqual([]);
    expect(latestRoundData.outputs).toHaveLength(5);
    expect(latestRoundData.stateMutability).toBe('view');
    
    // Check output types
    const outputTypes = latestRoundData.outputs.map(o => o.type);
    expect(outputTypes).toEqual(['uint80', 'int256', 'uint256', 'uint256', 'uint80']);
  });

  test('decimals function has correct signature', () => {
    const decimals = abi.find(item => 
      item.name === 'decimals' && item.type === 'function'
    );
    
    expect(decimals).toBeDefined();
    expect(decimals.inputs).toEqual([]);
    expect(decimals.outputs).toHaveLength(1);
    expect(decimals.outputs[0].type).toBe('uint8');
    expect(decimals.stateMutability).toBe('view');
  });

  test('ABI can be used to create ethers interface', () => {
    const iface = new ethers.Interface(abi);
    expect(iface).toBeDefined();
    
    // Test encoding a function call
    const encoded = iface.encodeFunctionData('latestRoundData', []);
    expect(encoded).toBeDefined();
    expect(encoded).toMatch(/^0x[a-fA-F0-9]+$/);
  });

  test('ABI functions are all view functions', () => {
    const functions = abi.filter(item => item.type === 'function');
    
    functions.forEach(func => {
      expect(['view', 'pure']).toContain(func.stateMutability);
    });
  });
});