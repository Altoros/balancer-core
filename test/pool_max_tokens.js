const truffleAssert = require('truffle-assertions');

const BPool = artifacts.require('BPool');
const BFactory = artifacts.require('BFactory');
const TToken = artifacts.require('TToken');
const ExchangeProxyMock = artifacts.require('ExchangeProxyMock');
const OperationsRegistryMock = artifacts.require('OperationsRegistryMock');
const AuthorizationMock = artifacts.require('AuthorizationMock');
const PermissionManagerMock = artifacts.require('PermissionManagerMock');

contract('BPool', async (accounts) => {
    const admin = accounts[0];

    const { toWei } = web3.utils;
    const { fromWei } = web3.utils;

    const MAX = web3.utils.toTwosComplement(-1);

    let AAA; let BBB; let CCC; let DDD; let EEE; let FFF; let GGG; let HHH; let
        ZZZ; // addresses
    let aaa; let bbb; let ccc; let ddd; let eee; let fff; let ggg; let hhh; let
        zzz; // TTokens
    let factory; // BPool factory
    let exchangeProxy;
    let operationsRegistry;
    let authorization;
    let permissionManager;
    let FACTORY; // factory address
    let pool; // first pool w/ defaults
    let POOL; //   pool address

    before(async () => {
        factory = await BFactory.deployed();
        exchangeProxy = await ExchangeProxyMock.deployed()
        operationsRegistry = await OperationsRegistryMock.deployed()
        authorization = await AuthorizationMock.deployed()
        permissionManager = await PermissionManagerMock.deployed()

        await factory.setExchProxy(exchangeProxy.address)
        await factory.setAuthorization(authorization.address)
        await factory.setPermissionManager(permissionManager.address)

        FACTORY = factory.address;

        aaa = await TToken.new('AAA', 'AAA', 18);
        bbb = await TToken.new('BBB', 'BBB', 18);
        ccc = await TToken.new('CCC', 'CCC', 18);
        ddd = await TToken.new('DDD', 'EEE', 18);
        eee = await TToken.new('EEE', 'EEE', 18);
        fff = await TToken.new('FFF', 'FFF', 18);
        ggg = await TToken.new('GGG', 'GGG', 18);
        hhh = await TToken.new('HHH', 'HHH', 18);
        zzz = await TToken.new('ZZZ', 'ZZZ', 18);

        AAA = aaa.address;
        BBB = bbb.address;
        CCC = ccc.address;
        DDD = ddd.address;
        EEE = eee.address;
        FFF = fff.address;
        GGG = ggg.address;
        HHH = hhh.address;
        ZZZ = zzz.address;

        await operationsRegistry.allowAsset(AAA)
        await operationsRegistry.allowAsset(BBB)
        await operationsRegistry.allowAsset(CCC)
        await operationsRegistry.allowAsset(DDD)
        await operationsRegistry.allowAsset(EEE)
        await operationsRegistry.allowAsset(FFF)
        await operationsRegistry.allowAsset(GGG)
        await operationsRegistry.allowAsset(HHH)
        await operationsRegistry.allowAsset(ZZZ)

        await factory.setOperationsRegistry(operationsRegistry.address)

        POOL = await factory.newBPool.call();
        await factory.newBPool();
        pool = await BPool.at(POOL);

        // Admin balances
        await aaa.mint(admin, toWei('100'));
        await bbb.mint(admin, toWei('100'));
        await ccc.mint(admin, toWei('100'));
        await ddd.mint(admin, toWei('100'));
        await eee.mint(admin, toWei('100'));
        await fff.mint(admin, toWei('100'));
        await ggg.mint(admin, toWei('100'));
        await hhh.mint(admin, toWei('100'));
        await zzz.mint(admin, toWei('100'));
    });

    describe('Binding Tokens', () => {
        it('Admin approves tokens', async () => {
            await aaa.approve(POOL, MAX);
            await aaa.approve(exchangeProxy.address, MAX);
            await bbb.approve(POOL, MAX);
            await bbb.approve(exchangeProxy.address, MAX);
            await ccc.approve(POOL, MAX);
            await ccc.approve(exchangeProxy.address, MAX);
            await ddd.approve(POOL, MAX);
            await ddd.approve(exchangeProxy.address, MAX);
            await eee.approve(POOL, MAX);
            await eee.approve(exchangeProxy.address, MAX);
            await fff.approve(POOL, MAX);
            await fff.approve(exchangeProxy.address, MAX);
            await ggg.approve(POOL, MAX);
            await ggg.approve(exchangeProxy.address, MAX);
            await hhh.approve(POOL, MAX);
            await hhh.approve(exchangeProxy.address, MAX);
            await zzz.approve(POOL, MAX);
            await zzz.approve(exchangeProxy.address, MAX);
        });

        it('Admin binds tokens', async () => {
            await pool.bind(AAA, toWei('50'), toWei('1'));
            await pool.bind(BBB, toWei('50'), toWei('3'));
            await pool.bind(CCC, toWei('50'), toWei('2.5'));
            await pool.bind(DDD, toWei('50'), toWei('7'));
            await pool.bind(EEE, toWei('50'), toWei('10'));
            await pool.bind(FFF, toWei('50'), toWei('1.99'));
            await pool.bind(GGG, toWei('40'), toWei('6'));
            await pool.bind(HHH, toWei('70'), toWei('2.3'));

            const totalDernomWeight = await pool.getTotalDenormalizedWeight();
            assert.equal(33.79, fromWei(totalDernomWeight));
        });

        it('Fails binding more than 8 tokens', async () => {
            await truffleAssert.reverts(pool.bind(ZZZ, toWei('50'), toWei('2')), 'ERR_MAX_TOKENS');
        });

        it('Rebind token at a smaller balance', async () => {
            await pool.rebind(HHH, toWei('50'), toWei('2.1'));
            const balance = await pool.getBalance(HHH);
            assert.equal(fromWei(balance), 50);

            const adminBalance = await hhh.balanceOf(admin);
            assert.equal(fromWei(adminBalance), 50);

            const factoryBalance = await hhh.balanceOf(FACTORY);
            assert.equal(fromWei(factoryBalance), 0);

            const totalDernomWeight = await pool.getTotalDenormalizedWeight();
            assert.equal(33.59, fromWei(totalDernomWeight));
        });

        it('Fails gulp on unbound token', async () => {
            await truffleAssert.reverts(pool.gulp(ZZZ), 'ERR_NOT_BOUND');
        });

        it('Pool can gulp tokens', async () => {
            await ggg.transferFrom(admin, POOL, toWei('10'));

            await pool.gulp(GGG);
            const balance = await pool.getBalance(GGG);
            assert.equal(fromWei(balance), 50);
        });

        it('Fails swapExactAmountIn with limits', async () => {
            await pool.setPublicSwap(true);
            await truffleAssert.reverts(
                // pool.swapExactAmountIn(
                //     AAA,
                //     toWei('1'),
                //     BBB,
                //     toWei('0'),
                //     toWei('0.9'),
                // ),
                exchangeProxy.swapExactAmountIn(
                    pool.address,
                    AAA,
                    toWei('1'),
                    BBB,
                    toWei('0'),
                    toWei('0.9'),
                ),
                'ERR_BAD_LIMIT_PRICE',
            );
            await truffleAssert.reverts(
                exchangeProxy.swapExactAmountIn(
                    pool.address,
                    AAA,
                    toWei('1'),
                    BBB,
                    toWei('2'),
                    toWei('3.5'),
                ),
                // pool.swapExactAmountIn(
                //     AAA,
                //     toWei('1'),
                //     BBB,
                //     toWei('2'),
                //     toWei('3.5'),
                // ),
                'ERR_LIMIT_OUT',
            );
            await truffleAssert.reverts(
                exchangeProxy.swapExactAmountIn(
                    pool.address,
                    AAA,
                    toWei('1'),
                    BBB,
                    toWei('0'),
                    toWei('3.00001'),
                ),
                // pool.swapExactAmountIn(
                //     AAA,
                //     toWei('1'),
                //     BBB,
                //     toWei('0'),
                //     toWei('3.00001'),
                // ),
                'ERR_LIMIT_PRICE',
            );
        });

        it('Fails swapExactAmountOut with limits', async () => {
            await truffleAssert.reverts(
                exchangeProxy.swapExactAmountOut(
                    pool.address,
                    AAA,
                    toWei('50'),
                    BBB,
                    toWei('40'),
                    toWei('5'),
                ),
                // pool.swapExactAmountOut(
                //     AAA,
                //     toWei('51'),
                //     BBB,
                //     toWei('40'),
                //     toWei('5'),
                // ),
                'ERR_MAX_OUT_RATIO',
            );
            await truffleAssert.reverts(
                exchangeProxy.swapExactAmountOut(
                    pool.address,
                    AAA,
                    toWei('5'),
                    BBB,
                    toWei('1'),
                    toWei('1'),
                ),
                // pool.swapExactAmountOut(
                //     AAA,
                //     toWei('5'),
                //     BBB,
                //     toWei('1'),
                //     toWei('1'),
                // ),
                'ERR_BAD_LIMIT_PRICE',
            );
            await truffleAssert.reverts(
                exchangeProxy.swapExactAmountOut(
                    pool.address,
                    AAA,
                    toWei('1'),
                    BBB,
                    toWei('1'),
                    toWei('5'),
                ),
                // pool.swapExactAmountOut(
                //     AAA,
                //     toWei('1'),
                //     BBB,
                //     toWei('1'),
                //     toWei('5'),
                // ),
                'ERR_LIMIT_IN',
            );
            await truffleAssert.reverts(
                exchangeProxy.swapExactAmountOut(
                    pool.address,
                    AAA,
                    toWei('5'),
                    BBB,
                    toWei('1'),
                    toWei('3.00001'),
                ),
                // pool.swapExactAmountOut(
                //     AAA,
                //     toWei('5'),
                //     BBB,
                //     toWei('1'),
                //     toWei('3.00001'),
                // ),
                'ERR_LIMIT_PRICE',
            );
        });
    });
});
