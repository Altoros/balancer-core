pragma solidity ^0.7.0;

contract PermissionManagerMock {
    mapping(address => bool) public assigned;

    function assignItem(uint256, address[] memory _accounts) external {
      for (uint256 i = 0; i < _accounts.length; i++) {
        assigned[_accounts[i]] = true;

      }
    }
}
