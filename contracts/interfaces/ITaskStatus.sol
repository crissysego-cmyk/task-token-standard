// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.24;

/// @title  Token-Bound Task Tenders — task status interface
/// @notice Optional status tracking for task lifecycle management:
///         Todo → InProgress → Finished. The status is a project-management
///         overlay on top of the binding/tender layers; it does not affect
///         settlement, refunds, or any on-chain enforcement. The token owner
///         may set it freely at any time.
interface ITaskStatus {
    enum TaskStatus { Todo, InProgress, Finished }

    event TaskStatusChanged(uint256 indexed tokenId,
                            TaskStatus previousStatus, TaskStatus newStatus);

    function taskStatusOf(uint256 tokenId) external view returns (TaskStatus);
    function setTaskStatus(uint256 tokenId, TaskStatus status) external;
}
