pragma solidity ^0.6;

import "./bridge/INearBridge.sol";

contract NearBridgeMock is INearBridge {
    mapping(uint64 => bytes32) public override blockHashes;
    mapping(uint64 => bytes32) public override blockMerkleRoots;

    function setBlockMerkleRoot(uint64 blockNumber, bytes32 root) external {
        blockMerkleRoots[blockNumber] = root;
    }

    function setBlockHash(uint64 blockNumber, bytes32 hash) external {
        blockHashes[blockNumber] = hash;
    }

    function balanceOf(address) external view override returns (uint256) {
        return 0;
    }

    function deposit() external payable override {}

    function withdraw() external override {}

    function initWithValidators(bytes calldata) external override {}

    function initWithBlock(bytes calldata) external override {}

    function addLightClientBlock(bytes calldata) external override {}

    function challenge(address payable, uint256) external override {}

    function checkBlockProducerSignatureInHead(uint256) external view override returns (bool) {
        return true;
    }
}
