//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

contract AuthorizationMock  {
    bool public authorized = true;

    constructor(bool _authorized) public {
        authorized = _authorized;
    }

    function setAuthorized(bool _authorized) public {
        authorized = _authorized;
    }

    function isAuthorized(
        address,
        address,
        bytes4,
        bytes calldata
    ) public view returns (bool) {
        return authorized;
    }
}
