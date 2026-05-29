// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title AttendanceNFT — proof-of-attendance бейджи (ERC-1155) для "I Was Here".
/// @notice Организатор (owner) создаёт событие с адресом-подписантом (signerAddress).
///         Гость предъявляет подпись от signerAddress и получает NFT (1 шт.) в `recipient`.
///         Формат подписи (Locked, см. ARCHITECTURE §8):
///         EIP-191 toEthSignedMessageHash поверх keccak256(abi.encodePacked(claimUUID, eventId)).
/// @dev    Не upgradeable в MVP. Структура/события спроектированы под post-MVP расширения
///         (verified, soulbound, on-chain levels) без миграции usedClaims.
contract AttendanceNFT is ERC1155, Ownable {
    /// @dev claimUUID — bytes32, eventId — uint256: обе величины фикс-длины,
    ///      поэтому abi.encodePacked не даёт коллизий упаковки.
    struct EventInfo {
        address signerAddress; // адрес, чьей подписью валидируется клейм
        uint64 startTime; // окно клейма: начало (unix)
        uint64 endTime; // окно клейма: конец (unix)
        uint32 maxSupply; // максимум бейджей события
        uint32 minted; // уже выдано
        string uri; // метаданные бейджа (надпись/картинка)
    }

    /// @notice eventId => данные события
    mapping(uint256 => EventInfo) public events;
    /// @notice claimUUID => использован ли (защита от повторного клейма)
    mapping(bytes32 => bool) public usedClaims;

    event EventCreated(
        uint256 indexed eventId, address signerAddress, uint64 startTime, uint64 endTime, uint32 maxSupply
    );
    event Claimed(uint256 indexed eventId, bytes32 indexed claimUUID, address indexed recipient);

    error EventExists();
    error EventNotFound();
    error ZeroSigner();
    error InvalidWindow();
    error NotStarted();
    error Ended();
    error SoldOut();
    error ClaimUsed();
    error BadSignature();

    constructor(address initialOwner) ERC1155("") Ownable(initialOwner) {}

    /// @notice Создать событие. Только owner.
    /// @param eventId       уникальный id события (id токена ERC-1155)
    /// @param signerAddress адрес-подписант клеймов (не нулевой)
    /// @param startTime     начало окна клейма (unix)
    /// @param endTime       конец окна клейма (unix), строго больше startTime
    /// @param maxSupply     максимум бейджей (>0)
    /// @param eventUri      метаданные бейджа
    function createEvent(
        uint256 eventId,
        address signerAddress,
        uint64 startTime,
        uint64 endTime,
        uint32 maxSupply,
        string calldata eventUri
    ) external onlyOwner {
        // signerAddress == address(0) служит маркером "события нет",
        // поэтому существующее событие всегда имеет ненулевой signerAddress.
        if (events[eventId].signerAddress != address(0)) revert EventExists();
        if (signerAddress == address(0)) revert ZeroSigner();
        if (startTime >= endTime) revert InvalidWindow();
        if (maxSupply == 0) revert SoldOut();

        events[eventId] = EventInfo({
            signerAddress: signerAddress,
            startTime: startTime,
            endTime: endTime,
            maxSupply: maxSupply,
            minted: 0,
            uri: eventUri
        });

        emit EventCreated(eventId, signerAddress, startTime, endTime, maxSupply);
    }

    /// @notice Заклеймить бейдж. Минт идёт в `recipient`, НЕ в msg.sender
    ///         (нужно для gasless: relayer вызывает claim, гость получает NFT).
    /// @param eventId    id события
    /// @param claimUUID  одноразовый id клейма (входит в подписанный хэш)
    /// @param recipient  получатель NFT
    /// @param signature  подпись signerAddress (EIP-191 personal_sign)
    function claim(uint256 eventId, bytes32 claimUUID, address recipient, bytes calldata signature) external {
        EventInfo storage ev = events[eventId];
        if (ev.signerAddress == address(0)) revert EventNotFound();
        if (block.timestamp < ev.startTime) revert NotStarted();
        if (block.timestamp > ev.endTime) revert Ended();
        if (ev.minted >= ev.maxSupply) revert SoldOut();
        if (usedClaims[claimUUID]) revert ClaimUsed();

        // Проверка подписи: должна совпадать с бэкендом (viem encodePacked + signMessage({raw})).
        bytes32 h = keccak256(abi.encodePacked(claimUUID, eventId));
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(h);
        address rec = ECDSA.recover(ethHash, signature);
        if (rec == address(0) || rec != ev.signerAddress) revert BadSignature();

        // Эффекты до взаимодействия (_mint может дёрнуть receiver hook).
        usedClaims[claimUUID] = true;
        ev.minted++;
        _mint(recipient, eventId, 1, "");

        emit Claimed(eventId, claimUUID, recipient);
    }

    /// @notice Метаданные бейджа конкретного события.
    function uri(uint256 eventId) public view override returns (string memory) {
        return events[eventId].uri;
    }
}
