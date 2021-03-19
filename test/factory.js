const BPool = artifacts.require('BPool');
const BFactory = artifacts.require('BFactory');
const TToken = artifacts.require('TToken');
const ExchangeProxyMock = artifacts.require('ExchangeProxyMock');
const OperationsRegistryMock = artifacts.require('OperationsRegistryMock');
const AuthorizationMock = artifacts.require('AuthorizationMock');
const PermissionManagerMock = artifacts.require('PermissionManagerMock');
const truffleAssert = require('truffle-assertions');

const someAddress = '0x2489991C7AdFAA0DD96D2c46d344CCeaA1C0fD89'

contract('BFactory', async (accounts) => {
    const admin = accounts[0];
    const nonAdmin = accounts[1];
    const user2 = accounts[2];
    const { toWei } = web3.utils;
    const { fromWei } = web3.utils;
    const { hexToUtf8 } = web3.utils;

    const MAX = web3.utils.toTwosComplement(-1);

    describe('Factory', () => {
        let factory;
        let pool;
        let exchangeProxy;
        let operationsRegistry;
        let authorization;
        let permissionManager;
        let POOL;
        let WETH;
        let DAI;
        let weth;
        let dai;

        before(async () => {
            factory = await BFactory.deployed();
            exchangeProxy = await ExchangeProxyMock.deployed()
            operationsRegistry = await OperationsRegistryMock.deployed()
            authorization = await AuthorizationMock.deployed()
            permissionManager = await PermissionManagerMock.deployed()

            await factory.setExchProxy(exchangeProxy.address)
            await factory.setAuthorization(authorization.address)
            await factory.setPermissionManager(permissionManager.address)

            weth = await TToken.new('Wrapped Ether', 'WETH', 18);
            dai = await TToken.new('Dai Stablecoin', 'DAI', 18);

            WETH = weth.address;
            DAI = dai.address;

            await operationsRegistry.allowAsset(WETH)
            await operationsRegistry.allowAsset(DAI)

            await factory.setOperationsRegistry(operationsRegistry.address)

            // admin balances
            await weth.mint(admin, toWei('5'));
            await dai.mint(admin, toWei('200'));

            // nonAdmin balances
            await weth.mint(nonAdmin, toWei('1'), { from: admin });
            await dai.mint(nonAdmin, toWei('50'), { from: admin });

            POOL = await factory.newBPool.call(); // this works fine in clean room
            await factory.newBPool();
            pool = await BPool.at(POOL);

            await weth.approve(POOL, MAX);
            await dai.approve(POOL, MAX);

            await weth.approve(exchangeProxy.address, MAX, { from: nonAdmin });
            await dai.approve(exchangeProxy.address, MAX, { from: nonAdmin });

            await pool.approve(exchangeProxy.address, MAX, { from: nonAdmin });
        });

        it('BFactory is bronze release', async () => {
            const color = await factory.getColor();
            assert.equal(hexToUtf8(color), 'BRONZE');
        });

        it('isBPool on non pool returns false', async () => {
            const isBPool = await factory.isBPool(admin);
            assert.isFalse(isBPool);
        });

        it('isBPool on pool returns true', async () => {
            const isBPool = await factory.isBPool(POOL);
            assert.isTrue(isBPool);
        });

        it('should assign permission to new pool', async () => {
            const assigned = await permissionManager.assigned(POOL);
            assert.isTrue(assigned);
        });

        it('fails nonAdmin calls collect', async () => {
            await truffleAssert.reverts(factory.collect(nonAdmin, { from: nonAdmin }), 'ERR_NOT_BLABS');
        });

        it('admin collects fees', async () => {
            await pool.bind(WETH, toWei('5'), toWei('5'));
            await pool.bind(DAI, toWei('200'), toWei('5'));

            await pool.finalize();

            await exchangeProxy.joinPool(pool.address, toWei('10'), [toWei('1'), toWei('50')], { from: nonAdmin });
            // await pool.joinPool(toWei('10'), [MAX, MAX], { from: nonAdmin });

            await exchangeProxy.exitPool(pool.address, toWei('10'), [toWei('0'), toWei('0')], { from: nonAdmin });
            // await pool.exitPool(toWei('10'), [toWei('0'), toWei('0')], { from: nonAdmin });

            // Exit fee = 0 so this wont do anything
            await factory.collect(POOL);

            const adminBalance = await pool.balanceOf(admin);
            assert.equal(fromWei(adminBalance), '100');
        });

        it('nonadmin cant set blabs address', async () => {
            await truffleAssert.reverts(factory.setBLabs(nonAdmin, { from: nonAdmin }), 'ERR_NOT_BLABS');
        });

        it('nonadmin cant set pool impl', async () => {
            await truffleAssert.reverts(factory.setPoolImpl(someAddress, { from: nonAdmin }), 'ERR_NOT_BLABS');
        });

        it('nonadmin cant set exchange proxy', async () => {
            await truffleAssert.reverts(factory.setExchProxy(someAddress, { from: nonAdmin }), 'ERR_NOT_BLABS');
        });

        it('nonadmin cant set operations registry', async () => {
            await truffleAssert.reverts(factory.setOperationsRegistry(someAddress, { from: nonAdmin }), 'ERR_NOT_BLABS');
        });

        it('nonadmin cant set permission manager', async () => {
            await truffleAssert.reverts(factory.setPermissionManager(someAddress, { from: nonAdmin }), 'ERR_NOT_BLABS');
        });

        it('nonadmin cant set authorization address', async () => {
            await truffleAssert.reverts(factory.setAuthorization(someAddress, { from: nonAdmin }), 'ERR_NOT_BLABS');
        });

        it('admin changes blabs address', async () => {
            await factory.setBLabs(user2);
            const blab = await factory.getBLabs();
            assert.equal(blab, user2);
        });

        it('admin changes pool impl address', async () => {
            await factory.setPoolImpl(someAddress, {from: user2});
            const impl = await factory._poolImpl();
            assert.equal(impl, someAddress);
        });

        it('admin changes exchange proxy address', async () => {
            await factory.setExchProxy(someAddress, {from: user2});
            const exchProxy = await factory._exchProxy();
            assert.equal(exchProxy, someAddress);
        });

        it('admin changes operations registry address', async () => {
            await factory.setOperationsRegistry(someAddress, {from: user2});
            const operationsRegistry = await factory._operationsRegistry();
            assert.equal(operationsRegistry, someAddress);
        });

        it('admin changes permission manager address', async () => {
            await factory.setPermissionManager(someAddress, {from: user2});
            const permissionManager = await factory._permissionManager();
            assert.equal(permissionManager, someAddress);
        });

        it('admin changes authorization address', async () => {
            await factory.setAuthorization(someAddress, {from: user2});
            const authorization = await factory.authorization();
            assert.equal(authorization, someAddress);
        });

        describe('un-authorized', () => {
            before(async () => {
                await factory.setAuthorization(authorization.address, {from: user2})
                await authorization.setAuthorized(false)
            })

            it('newBPool should fail', async () => {
                await truffleAssert.reverts(factory.newBPool(), 'Authorizable: not authorized');
            })
        })
    });
});
