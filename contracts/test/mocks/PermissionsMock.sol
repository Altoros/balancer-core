//SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract PermissionsMock is ERC1155 {
    // solhint-disable-next-line
    constructor(string memory uri_) public ERC1155(uri_) {}

    function assingItem(address _account) public {
        _mint(_account, 1, 1, "");
    }
}
