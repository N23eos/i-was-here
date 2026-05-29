// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AttendanceNFT} from "../src/AttendanceNFT.sol";

/// @notice Деплой AttendanceNFT на Base Sepolia.
/// @dev    forge script script/Deploy.s.sol:Deploy \
///           --rpc-url base_sepolia --broadcast --verify
///         Требует env DEPLOYER_PRIVATE_KEY (funded). Owner = deployer.
contract Deploy is Script {
    function run() external returns (AttendanceNFT nft) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        nft = new AttendanceNFT(deployer);
        vm.stopBroadcast();

        console.log("AttendanceNFT deployed at:", address(nft));
        console.log("Owner:", deployer);
    }
}
