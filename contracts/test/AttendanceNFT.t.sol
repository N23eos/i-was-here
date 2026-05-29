// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {AttendanceNFT} from "../src/AttendanceNFT.sol";

contract AttendanceNFTTest is Test {
    AttendanceNFT nft;

    address owner = makeAddr("owner");
    address relayer = makeAddr("relayer"); // вызывает claim (msg.sender != recipient)
    address guest = makeAddr("guest"); // получатель NFT

    // signer: ключ известен тесту, чтобы подписывать как бэкенд
    uint256 signerPk = 0xA11CE;
    address signer;

    uint256 constant EVENT_ID = 1;
    uint64 startTime;
    uint64 endTime;
    uint32 constant MAX_SUPPLY = 100;
    string constant EVENT_URI = "ipfs://badge-meta";

    function setUp() public {
        signer = vm.addr(signerPk);
        vm.prank(owner);
        nft = new AttendanceNFT(owner);

        startTime = uint64(block.timestamp);
        endTime = uint64(block.timestamp + 1 days);

        vm.prank(owner);
        nft.createEvent(EVENT_ID, signer, startTime, endTime, MAX_SUPPLY, EVENT_URI);
    }

    // -------- helpers --------

    /// Воспроизводит формат бэкенда (viem): keccak256(abi.encodePacked(claimUUID, eventId))
    /// → toEthSignedMessageHash (EIP-191) → подпись приватным ключом.
    function _sign(uint256 pk, bytes32 claimUUID, uint256 eventId) internal pure returns (bytes memory) {
        bytes32 h = keccak256(abi.encodePacked(claimUUID, eventId));
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(h);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, ethHash);
        return abi.encodePacked(r, s, v);
    }

    // -------- happy path --------

    function test_Claim_MintsToRecipient() public {
        bytes32 claimUUID = keccak256("claim-1");
        bytes memory sig = _sign(signerPk, claimUUID, EVENT_ID);

        vm.prank(relayer);
        nft.claim(EVENT_ID, claimUUID, guest, sig);

        assertEq(nft.balanceOf(guest, EVENT_ID), 1, "guest must own badge");
        assertTrue(nft.usedClaims(claimUUID), "claim must be marked used");
    }

    /// Acceptance: при msg.sender != recipient NFT получает recipient, а не вызывающий.
    function test_Claim_RecipientNotSender() public {
        bytes32 claimUUID = keccak256("claim-2");
        bytes memory sig = _sign(signerPk, claimUUID, EVENT_ID);

        vm.prank(relayer);
        nft.claim(EVENT_ID, claimUUID, guest, sig);

        assertEq(nft.balanceOf(guest, EVENT_ID), 1, "recipient gets NFT");
        assertEq(nft.balanceOf(relayer, EVENT_ID), 0, "sender gets nothing");
    }

    function test_Uri_ReturnsEventUri() public view {
        assertEq(nft.uri(EVENT_ID), EVENT_URI);
    }

    // -------- revert paths --------

    function test_RevertWhen_BadSignature() public {
        bytes32 claimUUID = keccak256("claim-3");
        // подпись валидна, но над ДРУГИМ eventId → recover даёт не того, кто нужен здесь
        bytes memory sig = _sign(signerPk, claimUUID, EVENT_ID + 999);

        vm.prank(relayer);
        vm.expectRevert(AttendanceNFT.BadSignature.selector);
        nft.claim(EVENT_ID, claimUUID, guest, sig);
    }

    function test_RevertWhen_WrongSigner() public {
        uint256 attackerPk = 0xBAD;
        bytes32 claimUUID = keccak256("claim-4");
        bytes memory sig = _sign(attackerPk, claimUUID, EVENT_ID);

        vm.prank(relayer);
        vm.expectRevert(AttendanceNFT.BadSignature.selector);
        nft.claim(EVENT_ID, claimUUID, guest, sig);
    }

    function test_RevertWhen_ClaimReused() public {
        bytes32 claimUUID = keccak256("claim-5");
        bytes memory sig = _sign(signerPk, claimUUID, EVENT_ID);

        vm.prank(relayer);
        nft.claim(EVENT_ID, claimUUID, guest, sig);

        // второй клейм тем же claimUUID
        vm.prank(relayer);
        vm.expectRevert(AttendanceNFT.ClaimUsed.selector);
        nft.claim(EVENT_ID, claimUUID, guest, sig);
    }

    function test_RevertWhen_BeforeStart() public {
        uint256 futureEventId = 2;
        uint64 fStart = uint64(block.timestamp + 1 hours);
        uint64 fEnd = uint64(block.timestamp + 2 hours);
        vm.prank(owner);
        nft.createEvent(futureEventId, signer, fStart, fEnd, MAX_SUPPLY, EVENT_URI);

        bytes32 claimUUID = keccak256("claim-6");
        bytes memory sig = _sign(signerPk, claimUUID, futureEventId);

        vm.prank(relayer);
        vm.expectRevert(AttendanceNFT.NotStarted.selector);
        nft.claim(futureEventId, claimUUID, guest, sig);
    }

    function test_RevertWhen_AfterEnd() public {
        bytes32 claimUUID = keccak256("claim-7");
        bytes memory sig = _sign(signerPk, claimUUID, EVENT_ID);

        vm.warp(endTime + 1);
        vm.prank(relayer);
        vm.expectRevert(AttendanceNFT.Ended.selector);
        nft.claim(EVENT_ID, claimUUID, guest, sig);
    }

    function test_RevertWhen_SoldOut() public {
        uint256 scarceId = 3;
        vm.prank(owner);
        nft.createEvent(scarceId, signer, startTime, endTime, 1, EVENT_URI);

        bytes32 c1 = keccak256("claim-8a");
        bytes32 c2 = keccak256("claim-8b");

        vm.prank(relayer);
        nft.claim(scarceId, c1, guest, _sign(signerPk, c1, scarceId));

        vm.prank(relayer);
        vm.expectRevert(AttendanceNFT.SoldOut.selector);
        nft.claim(scarceId, c2, guest, _sign(signerPk, c2, scarceId));
    }

    function test_RevertWhen_EventNotFound() public {
        uint256 missingId = 999;
        bytes32 claimUUID = keccak256("claim-9");
        bytes memory sig = _sign(signerPk, claimUUID, missingId);

        vm.prank(relayer);
        vm.expectRevert(AttendanceNFT.EventNotFound.selector);
        nft.claim(missingId, claimUUID, guest, sig);
    }

    // -------- createEvent guards --------

    function test_RevertWhen_CreateEvent_NotOwner() public {
        vm.prank(relayer);
        vm.expectRevert(); // OwnableUnauthorizedAccount
        nft.createEvent(42, signer, startTime, endTime, MAX_SUPPLY, EVENT_URI);
    }

    function test_RevertWhen_CreateEvent_Duplicate() public {
        vm.prank(owner);
        vm.expectRevert(AttendanceNFT.EventExists.selector);
        nft.createEvent(EVENT_ID, signer, startTime, endTime, MAX_SUPPLY, EVENT_URI);
    }

    function test_RevertWhen_CreateEvent_ZeroSigner() public {
        vm.prank(owner);
        vm.expectRevert(AttendanceNFT.ZeroSigner.selector);
        nft.createEvent(7, address(0), startTime, endTime, MAX_SUPPLY, EVENT_URI);
    }

    function test_RevertWhen_CreateEvent_InvalidWindow() public {
        vm.prank(owner);
        vm.expectRevert(AttendanceNFT.InvalidWindow.selector);
        nft.createEvent(8, signer, endTime, startTime, MAX_SUPPLY, EVENT_URI);
    }

    // -------- fuzz --------

    /// Любой валидно подписанный claim в окне минтит ровно 1 бейдж в recipient.
    function testFuzz_Claim(bytes32 claimUUID, uint256 rawEventId, address recipient) public {
        // recipient должен принимать ERC-1155 (EOA-моки ок, контракт без onERC1155Received — нет)
        vm.assume(recipient != address(0));
        vm.assume(recipient.code.length == 0);

        uint256 eventId = bound(rawEventId, 1000, type(uint256).max);
        vm.prank(owner);
        nft.createEvent(eventId, signer, startTime, endTime, MAX_SUPPLY, EVENT_URI);

        bytes memory sig = _sign(signerPk, claimUUID, eventId);

        vm.prank(relayer);
        nft.claim(eventId, claimUUID, recipient, sig);

        assertEq(nft.balanceOf(recipient, eventId), 1);
        assertTrue(nft.usedClaims(claimUUID));
    }
}
