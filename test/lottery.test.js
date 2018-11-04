const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const { interface, bytecode } = require('../compile');

const provider = ganache.provider();
const web3 = new Web3(provider);

let accounts;
let lottery;

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();

  lottery = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({
      data: bytecode,
    })
    .send({
      from: accounts[0],
      gas: '1000000'
    });
});

describe('Contract: Lottery', () => {

  it('should deploy', () => {
    assert.ok(lottery.options.address);
  });

  it('should set manager as the contract creator', async () => {
    const manager = await lottery.methods.manager().call();
    assert.ok(manager === accounts[0]);
  });

  describe('enter', () => {

    it('should disallow manager to enter the lottery', async () => {
      try {
        await lottery.methods.enter().send({
          from: accounts[0],
          gas: '1000000',
          value: web3.utils.toWei('.02', 'ether'),
        });
        assert.fail();
      } catch (e) {
        assert.ok(e.message.includes('The manager is not allowed to enter the lottery.'));
      }
    });

    it('should allow an account to enter the lottery', async () => {
      try {
        await lottery.methods.enter().send({
          from: accounts[1],
          gas: '1000000',
          value: web3.utils.toWei('.02', 'ether'),
        });

        const players = await lottery.methods.getPlayers().call();

        assert.ok(players.indexOf(accounts[1] >= 0));
      } catch(e) {
        assert.fail();
      }
    });

    it('should allow ather accounts to enter the lottery', async () => {
      await lottery.methods.enter().send({
        from: accounts[1],
        gas: '1000000',
        value: web3.utils.toWei('.02', 'ether'),
      });

      await lottery.methods.enter().send({
        from: accounts[2],
        gas: '1000000',
        value: web3.utils.toWei('.02', 'ether'),
      });

      await lottery.methods.enter().send({
        from: accounts[3],
        gas: '1000000',
        value: web3.utils.toWei('.02', 'ether'),
      });

      const players = await lottery.methods.getPlayers().call();

      assert.ok(players.indexOf(accounts[1] >= 0));
      assert.ok(players.indexOf(accounts[2] >= 0));
      assert.ok(players.indexOf(accounts[3] >= 0));
      assert.ok(players.length === 3);
    });

    it('should require at least .01 ether or 10000000000000000 wei to enter the lottery ', async () => {
      try {
        await lottery.methods.enter().send({
          from: accounts[1],
          gas: '1000000',
          value: web3.utils.toWei('.001', 'ether'),
        });
        assert.fail();
      } catch(e) {
        assert.ok(e.message.includes('At least .01 ether is required to enter the lottery.'));
      }
    });
  })

  describe('pickWinner', () => {
    it('should not allow non manager accounts', async () => {
      try {
        await lottery.methods.pickWinner().send({
          from: accounts[1],
          gas: '1000000',
        });
        assert.fail();
      } catch(e) {
        assert.ok(e.message.includes('Only the manager can execute this method.'));
      }
    });

    it('should allow the manager to pick winner and reset the lottery', async () => {

      await lottery.methods.enter().send({
        from: accounts[1],
        gas: '1000000',
        value: web3.utils.toWei('.02', 'ether'),
      });

      await lottery.methods.enter().send({
        from: accounts[2],
        gas: '1000000',
        value: web3.utils.toWei('.02', 'ether'),
      });

      await lottery.methods.enter().send({
        from: accounts[3],
        gas: '1000000',
        value: web3.utils.toWei('.02', 'ether'),
      });

      await lottery.methods.pickWinner().send({
        from: accounts[0],
        gas: '1000000'
      });

      const players = await lottery.methods.getPlayers().call();

      assert.ok(players.length === 0);

    });
  });

  it('should send the balance to the winner', async () => {

    await lottery.methods.enter().send({
      from: accounts[1],
      gas: '1000000',
      value: web3.utils.toWei('.02', 'ether'),
    });

    const initialBalance = await web3.eth.getBalance(accounts[1]);

    await lottery.methods.pickWinner().send({
      from: accounts[0],
      gas: '1000000'
    });

    const finalBalance = await web3.eth.getBalance(accounts[1]);
    const contractBalance = await web3.eth.getBalance(lottery.options.address);

    assert.ok(finalBalance > initialBalance);
    assert.ok(contractBalance == 0);
  });
});