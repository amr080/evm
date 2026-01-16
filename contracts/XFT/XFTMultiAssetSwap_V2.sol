// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract XFTMultiAssetSwap is ReentrancyGuard {
    
    struct TokenEntry {
        IERC20 token;
        uint256 amount;
    }
    
    struct Swap {
        address initiator;
        address participant;
        TokenEntry[] initiatorTokens;
        uint256 basketPriceUSD;
        IERC20 participantToken;
        uint256 participantAmount;
        bytes32 hashlock;
        uint256 timelock;
        bool initiatorDeposited;
        bool participantDeposited;
        bool completed;
        bool refunded;
    }
    
    mapping(bytes32 => Swap) public swaps;
    mapping(address => bool) public whitelistedTokens;
    bytes32[] public allSwapIds;
    
    address public constant USDXT = 0xC1BF9854E43b84f3abec5f5d1C72F0a6f602034b;
    
    event SwapInitiated(
        bytes32 indexed swapId,
        address indexed initiator,
        address indexed participant,
        uint256 totalTokenCount,
        uint256 basketPriceUSD,
        address participantToken,
        uint256 participantAmount,
        bytes32 hashlock,
        uint256 timelock
    );
    
    event SwapParticipated(
        bytes32 indexed swapId,
        address indexed participant,
        address participantToken,
        uint256 amount
    );
    
    event SwapCompleted(
        bytes32 indexed swapId,
        bytes32 preimage
    );
    
    event SwapRefunded(
        bytes32 indexed swapId,
        address indexed refunder
    );
    
    event TokenWhitelisted(address indexed token, bool whitelisted);
    
    modifier swapExists(bytes32 _swapId) {
        require(swaps[_swapId].initiator != address(0), "Swap does not exist");
        _;
    }
    
    modifier onlyInitiator(bytes32 _swapId) {
        require(msg.sender == swaps[_swapId].initiator, "Only initiator allowed");
        _;
    }
    
    modifier onlyParticipant(bytes32 _swapId) {
        require(msg.sender == swaps[_swapId].participant, "Only participant allowed");
        _;
    }
    
    constructor() {
        whitelistedTokens[USDXT] = true;
        emit TokenWhitelisted(USDXT, true);
    }
    
    function addWhitelistedToken(address token) external {
        whitelistedTokens[token] = true;
        emit TokenWhitelisted(token, true);
    }
    
    // Step 1: Alice initiates swap with basket + asking price
    function initiateSwap(
        bytes32 _swapId,
        address _participant,
        address[] calldata _initiatorTokens,
        uint256[] calldata _initiatorAmounts,
        uint256 _basketPriceUSD,
        address _participantToken,
        bytes32 _hashlock,
        uint256 _timelock
    ) external nonReentrant {
        require(swaps[_swapId].initiator == address(0), "Swap exists");
        require(_participant != address(0), "Invalid participant");
        require(_participant != msg.sender, "Self swap not allowed");
        require(_initiatorTokens.length == _initiatorAmounts.length, "Array length mismatch");
        require(_initiatorTokens.length > 0, "No initiator tokens");
        require(_basketPriceUSD > 0, "Invalid basket price");
        require(whitelistedTokens[_participantToken], "Participant token not whitelisted");
        require(_timelock > block.timestamp + 1 hours, "Timelock too short");
        require(_hashlock != bytes32(0), "Invalid hashlock");
        
        uint256 totalTokenCount = 0;
        for (uint256 i = 0; i < _initiatorAmounts.length; i++) {
            require(_initiatorAmounts[i] > 0, "Invalid initiator amount");
            totalTokenCount += _initiatorAmounts[i];
        }
        require(totalTokenCount > 0, "Zero total tokens");
        
        Swap storage swap = swaps[_swapId];
        swap.initiator = msg.sender;
        swap.participant = _participant;
        swap.basketPriceUSD = _basketPriceUSD;
        swap.participantToken = IERC20(_participantToken);
        swap.participantAmount = _basketPriceUSD;
        swap.hashlock = _hashlock;
        swap.timelock = _timelock;
        swap.initiatorDeposited = false;
        swap.participantDeposited = false;
        swap.completed = false;
        swap.refunded = false;
        
        // Store basket tokens
        for (uint256 i = 0; i < _initiatorTokens.length; i++) {
            swap.initiatorTokens.push(TokenEntry({
                token: IERC20(_initiatorTokens[i]),
                amount: _initiatorAmounts[i]
            }));
        }
        
        // Alice deposits her basket tokens
        for (uint256 i = 0; i < swap.initiatorTokens.length; i++) {
            require(
                swap.initiatorTokens[i].token.transferFrom(
                    msg.sender, 
                    address(this), 
                    swap.initiatorTokens[i].amount
                ),
                "Initiator transfer failed"
            );
        }
        
        swap.initiatorDeposited = true;
        allSwapIds.push(_swapId);
        
        emit SwapInitiated(
            _swapId,
            msg.sender,
            _participant,
            totalTokenCount,
            _basketPriceUSD,
            _participantToken,
            _basketPriceUSD,
            _hashlock,
            _timelock
        );
    }
    
    // Step 2: Bob accepts by depositing USDXT
    function participateSwap(bytes32 _swapId)
        external
        nonReentrant
        swapExists(_swapId)
        onlyParticipant(_swapId)
    {
        Swap storage swap = swaps[_swapId];
        require(!swap.participantDeposited, "Already participated");
        require(!swap.completed, "Swap completed");
        require(!swap.refunded, "Swap refunded");
        require(block.timestamp < swap.timelock, "Swap expired");
        require(swap.initiatorDeposited, "Initiator not deposited");
        
        // Bob deposits USDXT equal to Alice's asking price
        require(
            swap.participantToken.transferFrom(
                msg.sender,
                address(this),
                swap.participantAmount
            ),
            "Participant transfer failed"
        );
        
        swap.participantDeposited = true;
        
        emit SwapParticipated(
            _swapId, 
            msg.sender, 
            address(swap.participantToken), 
            swap.participantAmount
        );
    }
    
    // Step 3: ATOMIC SWAP - Anyone can claim with correct preimage
    function claimSwap(bytes32 _swapId, bytes32 _preimage)
        external
        nonReentrant
        swapExists(_swapId)
    {
        Swap storage swap = swaps[_swapId];
        require(!swap.completed, "Swap completed");
        require(!swap.refunded, "Swap refunded");
        require(swap.initiatorDeposited && swap.participantDeposited, "Both deposits required");
        require(block.timestamp < swap.timelock, "Swap expired");
        require(sha256(abi.encodePacked(_preimage)) == swap.hashlock, "Bad preimage");
        
        swap.completed = true;
        
        // ATOMIC TRANSFER: Alice gets USDXT, Bob gets basket
        require(
            swap.participantToken.transfer(
                swap.initiator,
                swap.participantAmount
            ),
            "USDXT to Alice failed"
        );
        
        for (uint256 i = 0; i < swap.initiatorTokens.length; i++) {
            require(
                swap.initiatorTokens[i].token.transfer(
                    swap.participant,
                    swap.initiatorTokens[i].amount
                ),
                "Basket to Bob failed"
            );
        }
        
        emit SwapCompleted(_swapId, _preimage);
    }
    
    // Refund after timelock expires
    function refundSwap(bytes32 _swapId)
        external
        nonReentrant
        swapExists(_swapId)
    {
        Swap storage swap = swaps[_swapId];
        require(!swap.completed, "Swap completed");
        require(!swap.refunded, "Swap refunded");
        require(block.timestamp >= swap.timelock, "Too early");
        require(
            msg.sender == swap.initiator || msg.sender == swap.participant,
            "Not swap party"
        );
        
        swap.refunded = true;
        
        // Refund Alice's basket
        if (swap.initiatorDeposited) {
            for (uint256 i = 0; i < swap.initiatorTokens.length; i++) {
                require(
                    swap.initiatorTokens[i].token.transfer(
                        swap.initiator,
                        swap.initiatorTokens[i].amount
                    ),
                    "Refund Alice failed"
                );
            }
        }
        
        // Refund Bob's USDXT
        if (swap.participantDeposited) {
            require(
                swap.participantToken.transfer(
                    swap.participant,
                    swap.participantAmount
                ),
                "Refund Bob failed"
            );
        }
        
        emit SwapRefunded(_swapId, msg.sender);
    }
    
    // SIMPLE VIEW FUNCTIONS
    
    function getSwap(bytes32 _swapId)
        external
        view
        returns (
            address initiator,
            address participant,
            uint256 basketPriceUSD,
            uint256 participantAmount,
            bytes32 hashlock,
            uint256 timelock,
            bool initiatorDeposited,
            bool participantDeposited,
            bool completed,
            bool refunded
        )
    {
        Swap storage swap = swaps[_swapId];
        return (
            swap.initiator,
            swap.participant,
            swap.basketPriceUSD,
            swap.participantAmount,
            swap.hashlock,
            swap.timelock,
            swap.initiatorDeposited,
            swap.participantDeposited,
            swap.completed,
            swap.refunded
        );
    }
    
    function getBasketTokens(bytes32 _swapId)
        external
        view
        returns (address[] memory tokens, uint256[] memory amounts)
    {
        Swap storage swap = swaps[_swapId];
        uint256 length = swap.initiatorTokens.length;
        
        tokens = new address[](length);
        amounts = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            tokens[i] = address(swap.initiatorTokens[i].token);
            amounts[i] = swap.initiatorTokens[i].amount;
        }
    }
    
    function getAllSwaps() external view returns (bytes32[] memory) {
        return allSwapIds;
    }
    
    function getActiveSwaps() external view returns (bytes32[] memory activeSwapIds) {
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < allSwapIds.length; i++) {
            Swap storage swap = swaps[allSwapIds[i]];
            if (!swap.completed && !swap.refunded && swap.initiatorDeposited && !swap.participantDeposited && block.timestamp < swap.timelock) {
                activeCount++;
            }
        }
        
        activeSwapIds = new bytes32[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allSwapIds.length; i++) {
            Swap storage swap = swaps[allSwapIds[i]];
            if (!swap.completed && !swap.refunded && swap.initiatorDeposited && !swap.participantDeposited && block.timestamp < swap.timelock) {
                activeSwapIds[index] = allSwapIds[i];
                index++;
            }
        }
    }
    
    function getSwapStatus(bytes32 _swapId) external view returns (string memory) {
        Swap storage swap = swaps[_swapId];
        
        if (swap.initiator == address(0)) {
            return "DOES_NOT_EXIST";
        } else if (swap.completed) {
            return "COMPLETED";
        } else if (swap.refunded) {
            return "REFUNDED";
        } else if (block.timestamp >= swap.timelock) {
            return "EXPIRED";
        } else if (!swap.initiatorDeposited) {
            return "PENDING_ALICE_DEPOSIT";
        } else if (!swap.participantDeposited) {
            return "PENDING_BOB_ACCEPTANCE";
        } else {
            return "READY_FOR_CLAIM";
        }
    }
}