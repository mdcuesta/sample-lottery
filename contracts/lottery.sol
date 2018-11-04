pragma solidity ^0.4.25;

contract Lottery {
  address public manager;
  address[] public players;

  constructor() public {
    manager = msg.sender;
  }

  modifier restricted() {
    require(manager == msg.sender, "Only the manager can execute this method.");
    _;
  }

  function enter() public payable {
    require(manager != msg.sender, "The manager is not allowed to enter the lottery.");
    require(msg.value >= .01 ether, "At least .01 ether is required to enter the lottery.");
    players.push(msg.sender);
  }

  function random() private view returns (uint) {
    return uint(keccak256(block.difficulty, now, players.length));
  }

  function pickWinner() public restricted {
    uint index = random() % players.length;
    players[index].transfer(address(this).balance);
    players = new address[](0);
  }

  function getPlayers() public view returns (address[]) {
    return players;
  }
}
