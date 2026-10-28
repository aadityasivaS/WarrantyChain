// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract WarrantyNFT is ERC721Enumerable, AccessControl {
    // --- Roles ---
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant SERVICE_ROLE = keccak256("SERVICE_ROLE");

    // --- Enums & Structs ---
    enum ClaimStatus {
        Pending,
        Approved,
        Rejected,
        Resolved
    }

    struct Product {
        string name;
        string model;
        string serialNumber;
        string metadataURI;
        address manufacturer;
        uint64 warrantyStart;
        uint64 warrantyExpiry;
    }

    struct Claim {
        uint256 tokenId;
        string description;
        uint64 submittedAt;
        uint64 updatedAt;
        ClaimStatus status;
    }

    struct ServiceRecord {
        uint256 recordId;
        uint256 tokenId;
        uint64 serviceDate;
        address serviceCenter;
        string repairCategory;
        string reportReference;
    }

    // --- Custom Errors ---
    error InvalidRecipient();
    error RequiredFieldMissing();
    error InvalidWarrantyDuration();
    error DuplicateSerialNumber();
    error ProductNotFound(uint256 tokenId);
    error WarrantyExpired(uint256 tokenId);
    error NotCurrentOwner(uint256 tokenId, address caller);
    error ClaimNotFound(uint256 claimId);
    error InvalidClaimTransition(ClaimStatus from, ClaimStatus to);

    // --- State Variables ---
    uint256 private _nextTokenId = 1;
    uint256 private _nextClaimId = 1;
    uint256 private _nextServiceRecordId = 1;

    mapping(uint256 => Product) private _products;
    mapping(bytes32 => bool) private _serialRegistered;
    mapping(uint256 => Claim) private _claims;
    mapping(uint256 => uint256[]) private _claimIdsByToken;
    mapping(uint256 => ServiceRecord[]) private _serviceRecordsByToken;
    mapping(address => uint256[]) private _registeredTokenIds;

    // --- Events ---
    event ProductRegistered(
        uint256 indexed tokenId,
        address indexed manufacturer,
        address indexed owner,
        string serialNumber,
        uint64 warrantyExpiry
    );
    event ClaimSubmitted(
        uint256 indexed claimId,
        uint256 indexed tokenId,
        address indexed owner,
        string description
    );
    event ClaimStatusUpdated(
        uint256 indexed claimId,
        uint256 indexed tokenId,
        ClaimStatus previousStatus,
        ClaimStatus newStatus,
        address updatedBy
    );
    event ServiceAccountUpdated(address indexed account, bool enabled);
    event ServiceCompleted(
        uint256 indexed recordId,
        uint256 indexed tokenId,
        address indexed serviceCenter,
        uint64 serviceDate,
        string repairCategory,
        string reportReference
    );

    constructor() ERC721("WarrantyChain Warranty", "WARRANTY") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANUFACTURER_ROLE, msg.sender);
    }

    // --- External / Public Functions ---

    function registerProduct(
        address initialOwner,
        string calldata name,
        string calldata model,
        string calldata serialNumber,
        uint64 warrantyDuration,
        string calldata metadataURI
    ) external onlyRole(MANUFACTURER_ROLE) returns (uint256 tokenId) {
        if (initialOwner == address(0)) revert InvalidRecipient();
        if (
            bytes(name).length == 0 ||
            bytes(model).length == 0 ||
            bytes(serialNumber).length == 0
        ) {
            revert RequiredFieldMissing();
        }
        if (warrantyDuration == 0) revert InvalidWarrantyDuration();

        bytes32 serialHash = keccak256(bytes(serialNumber));
        if (_serialRegistered[serialHash]) revert DuplicateSerialNumber();

        tokenId = _nextTokenId++;
        uint64 start = uint64(block.timestamp);
        uint64 expiry = start + warrantyDuration;

        _serialRegistered[serialHash] = true;
        _products[tokenId] = Product(
            name,
            model,
            serialNumber,
            metadataURI,
            msg.sender,
            start,
            expiry
        );
        _registeredTokenIds[msg.sender].push(tokenId);
        _safeMint(initialOwner, tokenId);

        emit ProductRegistered(tokenId, msg.sender, initialOwner, serialNumber, expiry);
    }

    function setServiceAccount(address account, bool enabled) external onlyRole(MANUFACTURER_ROLE) {
        if (account == address(0)) revert InvalidRecipient();

        if (enabled) {
            _grantRole(SERVICE_ROLE, account);
        } else {
            _revokeRole(SERVICE_ROLE, account);
        }

        emit ServiceAccountUpdated(account, enabled);
    }

    function submitClaim(uint256 tokenId, string calldata description) external returns (uint256 claimId) {
        _requireProduct(tokenId);
        if (ownerOf(tokenId) != msg.sender) revert NotCurrentOwner(tokenId, msg.sender);
        if (!isWarrantyActive(tokenId)) revert WarrantyExpired(tokenId);
        if (bytes(description).length == 0) revert RequiredFieldMissing();

        claimId = _nextClaimId++;
        uint64 timestamp = uint64(block.timestamp);

        _claims[claimId] = Claim(
            tokenId,
            description,
            timestamp,
            timestamp,
            ClaimStatus.Pending
        );
        _claimIdsByToken[tokenId].push(claimId);

        emit ClaimSubmitted(claimId, tokenId, msg.sender, description);
    }

    function updateClaimStatus(uint256 claimId, ClaimStatus newStatus) external {
        if (!hasRole(MANUFACTURER_ROLE, msg.sender) && !hasRole(SERVICE_ROLE, msg.sender)) {
            _checkRole(MANUFACTURER_ROLE, msg.sender);
        }
        if (claimId == 0 || claimId >= _nextClaimId) revert ClaimNotFound(claimId);

        Claim storage claim = _claims[claimId];
        ClaimStatus previousStatus = claim.status;

        bool valid = (previousStatus == ClaimStatus.Pending &&
            (newStatus == ClaimStatus.Approved || newStatus == ClaimStatus.Rejected)) ||
            (previousStatus == ClaimStatus.Approved && newStatus == ClaimStatus.Resolved);

        if (!valid) revert InvalidClaimTransition(previousStatus, newStatus);

        claim.status = newStatus;
        claim.updatedAt = uint64(block.timestamp);

        emit ClaimStatusUpdated(claimId, claim.tokenId, previousStatus, newStatus, msg.sender);
    }

    function completeRepair(
        uint256 tokenId,
        string calldata repairCategory,
        string calldata reportReference
    ) external onlyRole(SERVICE_ROLE) returns (uint256 recordId) {
        _requireProduct(tokenId);
        if (bytes(repairCategory).length == 0) revert RequiredFieldMissing();

        recordId = _nextServiceRecordId++;
        uint64 serviceDate = uint64(block.timestamp);
        _serviceRecordsByToken[tokenId].push(
            ServiceRecord(recordId, tokenId, serviceDate, msg.sender, repairCategory, reportReference)
        );
        emit ServiceCompleted(recordId, tokenId, msg.sender, serviceDate, repairCategory, reportReference);
    }

    // --- View Functions ---

    function getProduct(uint256 tokenId) external view returns (Product memory) {
        _requireProduct(tokenId);
        return _products[tokenId];
    }

    function getClaim(uint256 claimId) external view returns (Claim memory) {
        if (claimId == 0 || claimId >= _nextClaimId) revert ClaimNotFound(claimId);
        return _claims[claimId];
    }

    function getClaimsForToken(uint256 tokenId) external view returns (Claim[] memory claims) {
        _requireProduct(tokenId);
        uint256[] storage ids = _claimIdsByToken[tokenId];
        claims = new Claim[](ids.length);

        for (uint256 i; i < ids.length; ++i) {
            claims[i] = _claims[ids[i]];
        }
    }

    function getClaimIdsForToken(uint256 tokenId) external view returns (uint256[] memory) {
        _requireProduct(tokenId);
        return _claimIdsByToken[tokenId];
    }

    function getRegisteredTokenIds(address manufacturer) external view returns (uint256[] memory) {
        return _registeredTokenIds[manufacturer];
    }

    function isWarrantyActive(uint256 tokenId) public view returns (bool) {
        _requireProduct(tokenId);
        return block.timestamp <= _products[tokenId].warrantyExpiry;
    }

    function totalClaims() external view returns (uint256) {
        return _nextClaimId - 1;
    }

    function serviceRecordCount(uint256 tokenId) external view returns (uint256) {
        _requireProduct(tokenId);
        return _serviceRecordsByToken[tokenId].length;
    }

    function getServiceRecord(uint256 tokenId, uint256 index)
        external
        view
        returns (ServiceRecord memory)
    {
        _requireProduct(tokenId);
        return _serviceRecordsByToken[tokenId][index];
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        _requireProduct(tokenId);
        return _products[tokenId].metadataURI;
    }

    // --- Internal Helpers & Overrides ---

    function _requireProduct(uint256 tokenId) private view {
        if (tokenId == 0 || tokenId >= _nextTokenId) revert ProductNotFound(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }
}