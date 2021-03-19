pragma solidity ^0.7.0;

contract OperationsRegistryMock {
    mapping(address => bool) public allowedAssets;

    function allowAsset(address _asset) public returns (bool) {
        allowedAssets[_asset] = true;
        return true;
    }
}
