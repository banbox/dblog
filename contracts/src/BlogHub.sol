// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {ERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC2771ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/metatx/ERC2771ContextUpgradeable.sol";
import {MulticallUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/MulticallUpgradeable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title BlogHub V2
 * @dev 集成了 UUPS 可升级、EIP-712 签名、ERC-2771 元交易、提款模式和权限管理的博客合约。
 */
contract BlogHub is
    Initializable,
    ERC1155Upgradeable,
    ERC2981Upgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    ERC2771ContextUpgradeable,
    MulticallUpgradeable,
    EIP712Upgradeable
{
    using ECDSA for bytes32;

    // --- Custom Errors (Gas Saving) ---
    error InvalidLength();
    error InvalidScore();
    error ContentRequiredForScore();
    error ArticleNotFound();
    error RoyaltyTooHigh();
    error FeeTooHigh();
    error InvalidAddress();
    error SignatureExpired();
    error InvalidSignature();
    error NoFundsToWithdraw();
    error TransferFailed();
    error SpamProtection();
    error InvalidCommenter();

    // 定义常量：最大评论长度（字节）
    // 140单词英文大约 700-1000 字节，中文约 400 汉字 = 1200 字节
    uint256 public constant MAX_COMMENT_LENGTH = 1024;
    // 设置最低评论/评价金额（防 Spam），例如 0.0001 ETH (以 wei 为单位)
    // 如果希望完全免费评论但要防 spam，需结合白名单或链下 PoW，此处采用金额门槛最简单
    uint256 public constant MIN_ACTION_VALUE = 0;
    // 评价分数常量：0:中立, 1:喜欢, 2:不喜欢
    uint8 public constant SCORE_NEUTRAL = 0;
    uint8 public constant SCORE_LIKE = 1;
    uint8 public constant SCORE_DISLIKE = 2;
    // --- 角色定义 ---
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // EIP-712 TypeHash
    bytes32 private constant FOLLOW_TYPEHASH =
        keccak256(
            "Follow(address follower,address target,bool status,uint256 nonce,uint256 deadline)"
        );

    // --- 结构体 ---
    struct Article {
        string arweaveHash;
        address author;
        uint64 categoryId;
        uint64 timestamp;
    }

    // --- 状态变量 ---
    uint256 public nextArticleId;

    // 平台手续费 (Basis Points, 100 = 1%)
    uint96 public platformFeeBps;
    address public platformTreasury;

    // Pull Payment (提款模式): 记录每个地址可提取的余额
    mapping(address => uint256) public pendingWithdrawals;

    // 文章存储
    mapping(uint256 => Article) public articles;

    mapping(address => uint256) public nonces; // EIP-712 防重放 Nonce

    // --- 事件定义 ---
    event ArticlePublished(
        uint256 indexed articleId,
        address indexed author,
        uint256 indexed categoryId,
        string arweaveId,
        uint256 timestamp
    );

    // 核心评价事件：SubSquid 可通过 score 区分喜欢(1)还是不喜欢(2)
    event ArticleEvaluated(
        uint256 indexed articleId,
        address indexed user,
        uint8 score, // 1: Like, 0: Neutral, 2: Dislike
        uint256 amountPaid,
        uint256 timestamp
    );

    // 评论事件：只在 content 不为空时触发
    event CommentAdded(
        uint256 indexed articleId,
        address indexed commenter,
        string content,
        uint256 parentCommentId, // 如果是顶级评论/评价，此处为 0
        uint8 score // 关联该评论的态度
    );

    event FollowStatusChanged(
        address indexed follower,
        address indexed target,
        bool isFollowing
    );

    event ReferralPaid(address indexed referrer, uint256 amount);

    // 评论点赞事件
    event CommentLiked(
        uint256 indexed articleId,
        uint256 indexed commentId,
        address indexed liker,
        address commenter,
        uint256 amountPaid,
        uint256 timestamp
    );

    event Withdrawal(address indexed user, uint256 amount);
    event PlatformFeeUpdated(uint96 newFeeBps);
    event TreasuryUpdated(address newTreasury);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数，替代构造函数
     * @param _trustedForwarder ERC-2771 的可信转发器地址 (如 Gelato Relay 或 Biconomy)
     * @param _initialOwner 合约初始管理员
     * @param _treasury 平台国库地址
     */
    function initialize(
        address _trustedForwarder,
        address _initialOwner,
        address _treasury
    ) public initializer {
        __ERC1155_init(""); // 实际 URI 建议由前端根据 ID 拼接，或者实现 uri() 函数
        __ERC2981_init();
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPS_init();
        __ERC2771Context_init(_trustedForwarder); // 设置 ERC-2771 Forwarder
        __Multicall_init();
        __EIP712_init("BlogHub", "1"); // EIP-712 域名和版本

        // 权限设置
        _grantRole(DEFAULT_ADMIN_ROLE, _initialOwner);
        _grantRole(UPGRADER_ROLE, _initialOwner);
        _grantRole(PAUSER_ROLE, _initialOwner);

        // 默认参数
        platformTreasury = _treasury;
        platformFeeBps = 250; // 默认 2.5% 平台抽成
        _setDefaultRoyalty(_initialOwner, 500); // 默认 5% 版税
        nextArticleId = 1; // 从 1 开始 ID（避免 id=0 的歧义）
    }

    // =============================================================
    //                      内部工具函数
    // =============================================================

    /**
     * @dev 校验推荐人地址有效性
     */
    function _validateReferrer(
        address _referrer,
        address _sender,
        address[] memory _invalidAddresses
    ) internal pure returns (address) {
        if (_referrer == _sender) return address(0);
        for (uint256 i = 0; i < _invalidAddresses.length; i++) {
            if (_referrer == _invalidAddresses[i]) return address(0);
        }
        return _referrer;
    }

    /**
     * @dev 分配平台费和推荐费，返回剩余金额
     */
    function _distributePlatformAndReferralFees(
        uint256 _amount,
        address _referrer
    ) internal returns (uint256 remaining) {
        uint256 platformShare = (_amount * platformFeeBps) / 10000;
        // 固定推荐费率 10%
        uint256 referralShare = (_referrer != address(0))
            ? (_amount * 1000) / 10000
            : 0;

        if (platformShare > 0) {
            pendingWithdrawals[platformTreasury] += platformShare;
        }
        if (referralShare > 0) {
            pendingWithdrawals[_referrer] += referralShare;
            emit ReferralPaid(_referrer, referralShare);
        }

        return _amount - platformShare - referralShare;
    }

    // =============================================================
    //                      核心业务逻辑
    // =============================================================

    /**
     * @dev 发布文章 (铸造 NFT)
     * 支持 meta-transactions (使用 _msgSender())
     */
    function publish(
        string calldata _arweaveId,
        uint64 _categoryId,
        uint96 _royaltyBps
    ) external whenNotPaused returns (uint256) {
        if (_royaltyBps > 10000) revert RoyaltyTooHigh();
        address author = _msgSender();
        uint256 newId = nextArticleId++;

        // 存储文章元数据 (修复点：之前缺少存储导致 uri() 函数会报错)
        articles[newId] = Article({
            arweaveHash: _arweaveId,
            author: author,
            categoryId: _categoryId,
            timestamp: uint64(block.timestamp)
        });

        // 1. 铸造 NFT (初始归作者所有)
        _mint(author, newId, 1, "");

        // 2. 设置独立的 ERC2981 版税 (归作者所有)
        _setTokenRoyalty(newId, author, _royaltyBps);

        emit ArticlePublished(
            newId,
            author,
            _categoryId,
            _arweaveId,
            block.timestamp
        );
        return newId;
    }

    /**
     * @dev 评价文章 (合并了原有的 collect 和 comment)
     * @param _articleId 文章ID
     * @param _score 评价分数: 1 (支持), 0 (中立), 2 (反对)
     * @param _content 评论内容。如果为空，则视为纯评分。
     * @param _referrer 推荐人地址
     * @param _parentCommentId 父评论ID (如果是对文章的直接评价，传0)
     */
    function evaluate(
        uint256 _articleId,
        uint8 _score,
        string calldata _content,
        address _referrer,
        uint256 _parentCommentId
    ) external payable nonReentrant whenNotPaused {
        if (_articleId >= nextArticleId) revert ArticleNotFound();
        if (_score > 2) revert InvalidScore();

        uint256 contentLength = bytes(_content).length;
        if (contentLength > MAX_COMMENT_LENGTH) revert InvalidLength();

        // 逻辑修正：如果只评分不说话，允许 content 为空。
        // 但如果 content 为空且 score 为 neutral (0)，这通常是无意义操作，除非纯为了 mint 凭证
        if (contentLength == 0 && _score == SCORE_NEUTRAL && msg.value == 0) {
            revert ContentRequiredForScore();
        }

        // --- 防 Spam 检查 ---
        if (contentLength > 0 && msg.value < MIN_ACTION_VALUE)
            revert SpamProtection();

        address sender = _msgSender();
        Article memory article = articles[_articleId];
        uint256 amountPaid = msg.value;

        // --- 资金处理 ---
        if (amountPaid > 0) {
            // 1. 铸造凭证给打赏者
            _mint(sender, _articleId, 1, "");

            // 2. 资金分配
            if (_score == SCORE_DISLIKE) {
                // 不喜欢的评价，资金归国库
                pendingWithdrawals[platformTreasury] += amountPaid;
            } else {
                // 校验推荐人
                address[] memory invalidAddrs = new address[](1);
                invalidAddrs[0] = article.author;
                address validReferrer = _validateReferrer(_referrer, sender, invalidAddrs);

                // 分配平台费和推荐费，获取剩余金额
                uint256 authorShare = _distributePlatformAndReferralFees(amountPaid, validReferrer);

                if (authorShare > 0) {
                    pendingWithdrawals[article.author] += authorShare;
                }
            }

            emit ArticleEvaluated(
                _articleId,
                sender,
                _score,
                amountPaid,
                block.timestamp
            );
        }

        // 如果有文本内容，触发评论事件 (用于显示评论详情)
        if (contentLength > 0) {
            emit CommentAdded(
                _articleId,
                sender,
                _content,
                _parentCommentId,
                _score
            );
        }
    }

    /**
     * @dev 对评论点赞
     * @param _articleId 文章ID
     * @param _commentId 被点赞的评论ID (链下生成的唯一标识)
     * @param _commenter 原始评论人地址
     * @param _referrer 推荐人地址
     * 
     * 资金分配逻辑：
     * 1. 扣除平台费 (platformFeeBps)
     * 2. 扣除推荐费 (10%, 如有推荐人)
     * 3. 剩余金额：文章作者和评论人各得一半
     */
    function likeComment(
        uint256 _articleId,
        uint256 _commentId,
        address _commenter,
        address _referrer
    ) external payable nonReentrant whenNotPaused {
        if (_articleId >= nextArticleId) revert ArticleNotFound();
        if (_commenter == address(0)) revert InvalidCommenter();
        if (msg.value == 0) revert SpamProtection();

        address sender = _msgSender();
        Article memory article = articles[_articleId];
        uint256 amountPaid = msg.value;

        // 铸造凭证给点赞者
        _mint(sender, _articleId, 1, "");

        // --- 资金分配 ---
        // 校验推荐人 (不能是自己、作者或评论人)
        address[] memory invalidAddrs = new address[](2);
        invalidAddrs[0] = article.author;
        invalidAddrs[1] = _commenter;
        address validReferrer = _validateReferrer(_referrer, sender, invalidAddrs);

        // 分配平台费和推荐费，获取剩余金额
        uint256 remaining = _distributePlatformAndReferralFees(amountPaid, validReferrer);

        // 剩余金额由作者和评论人平分
        uint256 halfShare = remaining / 2;
        // 处理奇数情况：多余的 1 wei 给评论人
        uint256 commenterShare = remaining - halfShare;

        if (halfShare > 0) {
            pendingWithdrawals[article.author] += halfShare;
        }
        if (commenterShare > 0) {
            pendingWithdrawals[_commenter] += commenterShare;
        }

        emit CommentLiked(
            _articleId,
            _commentId,
            sender,
            _commenter,
            amountPaid,
            block.timestamp
        );
    }

    /**
     * @dev 关注用户
     */
    function follow(address _target, bool _status) external whenNotPaused {
        emit FollowStatusChanged(_msgSender(), _target, _status);
    }

    // =============================================================
    //                          元数据
    // =============================================================

    /**
     * @dev 重写 uri 函数，使其返回真实可用的 Metadata URL
     * 格式: https://arweave.net/{hash}
     */
    function uri(uint256 _id) public view override returns (string memory) {
        if (_id >= nextArticleId) revert ArticleNotFound();
        return
            string(
                abi.encodePacked(
                    "https://arweave.net/",
                    articles[_id].arweaveHash
                )
            );
    }

    // =============================================================
    //                  EIP-712 签名业务 (Meta-Features)
    // =============================================================

    /**
     * @dev 允许通过签名进行关注 (Gasless Follow)
     * 场景：用户 A 签了一个名，由 Relayer 调用此函数帮 A 关注 B
     */
    function permitFollow(
        address _follower,
        address _target,
        bool _status,
        uint256 _deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external whenNotPaused {
        if (block.timestamp > _deadline) revert SignatureExpired();

        uint256 currentNonce = nonces[_follower]++;
        bytes32 structHash = keccak256(
            abi.encode(
                FOLLOW_TYPEHASH,
                _follower,
                _target,
                _status,
                currentNonce,
                _deadline
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, v, r, s);

        if (signer != _follower) revert InvalidSignature();

        // 触发关注事件
        emit FollowStatusChanged(_follower, _target, _status);
    }

    // =============================================================
    //                      资金管理 (Pull Payment)
    // =============================================================

    /**
     * @dev 用户提取自己的收益
     */
    function withdraw() external nonReentrant {
        address payee = _msgSender();
        uint256 payment = pendingWithdrawals[payee];

        if (payment == 0) revert NoFundsToWithdraw();

        pendingWithdrawals[payee] = 0;

        (bool success, ) = payable(payee).call{value: payment}("");
        if (!success) revert TransferFailed();

        emit Withdrawal(payee, payment);
    }

    // allow contract to receive plain ETH (optional but convenient)
    receive() external payable {}

    // =============================================================
    //                      管理功能
    // =============================================================

    function setPlatformFee(
        uint96 _feeBps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // 这里限制平台费最高 30%
        if (_feeBps > 3000) revert FeeTooHigh();
        platformFeeBps = _feeBps;
        emit PlatformFeeUpdated(_feeBps);
    }

    function setPlatformTreasury(
        address _treasury
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_treasury == address(0)) revert InvalidAddress();
        platformTreasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // =============================================================
    //                      底层 Override (必须实现)
    // =============================================================

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

    // ERC-2771: 上下文覆盖，确保在元交易中获取正确的 msg.sender
    function _msgSender()
        internal
        view
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (address sender)
    {
        return ERC2771ContextUpgradeable._msgSender();
    }

    function _msgData()
        internal
        view
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (bytes calldata)
    {
        return ERC2771ContextUpgradeable._msgData();
    }

    // ERC2771ContextUpgradeable 需要 contextSuffixLength
    function _contextSuffixLength()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (uint256)
    {
        return ERC2771ContextUpgradeable._contextSuffixLength();
    }

    // 解决多重继承导致的 supportsInterface 冲突
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(
            ERC1155Upgradeable,
            ERC2981Upgradeable,
            AccessControlUpgradeable
        )
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev 这个 gap 是为了将来升级合约添加新状态变量时，不破坏存储布局。
     * 这是一个最佳实践。
     */
    uint256[44] private __gap;
}
