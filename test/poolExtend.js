const Decimal = require('decimal.js');
const truffleAssert = require('truffle-assertions');

const BPool = artifacts.require('BPool');
const BFactory = artifacts.require('BFactory');
const TToken = artifacts.require('TToken');
const ExchangeProxyMock = artifacts.require('ExchangeProxyMock');
const OperationsRegistryMock = artifacts.require('OperationsRegistryMock');
const AuthorizationMock = artifacts.require('AuthorizationMock');
const PermissionManagerMock = artifacts.require('PermissionManagerMock');
const PermissionsMock = artifacts.require('PermissionsMock');
const swapFee = 10 ** -3; // 0.001;
const exitFee = 0;


contract('BPoolExtend', async (accounts) => {
    const { toWei } = web3.utils;
    const { fromWei } = web3.utils;
    const admin = accounts[0];

    const MAX = web3.utils.toTwosComplement(-1);

    let WETH; let DAI; // addresses
    let weth; let dai; // TTokens
    let factory; // BPool factory
    let exchangeProxy;
    let operationsRegistry;
    let authorization;
    let permissionManager;
    let permissions;
    let pool; // first pool w/ defaults
    let POOL; //   pool address

    const wethBalance = '4';
    const wethDenorm = '10';

    let currentWethBalance = Decimal(wethBalance);

    const daiBalance = '12';
    const daiDenorm = '10';

    let currentDaiBalance = Decimal(daiBalance);

    let currentPoolBalance = Decimal(0);

    const sumWeights = Decimal(wethDenorm).add(Decimal(daiDenorm));
    const wethNorm = Decimal(wethDenorm).div(Decimal(sumWeights));
    const daiNorm = Decimal(daiDenorm).div(Decimal(sumWeights));

    before(async () => {
        factory = await BFactory.deployed();
        exchangeProxy = await ExchangeProxyMock.deployed()
        operationsRegistry = await OperationsRegistryMock.deployed()
        authorization = await AuthorizationMock.deployed()
        permissionManager = await PermissionManagerMock.deployed()
        permissions = await PermissionsMock.deployed()

        await factory.setExchProxy(exchangeProxy.address)
        await factory.setOperationsRegistry(operationsRegistry.address)
        await factory.setAuthorization(authorization.address)
        await factory.setPermissionManager(permissionManager.address)

        POOL = await factory.newBPool.call(); // this works fine in clean room
        await factory.newBPool();
        pool = await BPool.at(POOL);

        weth = await TToken.new('Wrapped Ether', 'WETH', 18);
        dai = await TToken.new('Dai Stablecoin', 'DAI', 18);

        WETH = weth.address;
        DAI = dai.address;

        await weth.mint(admin, MAX);
        await dai.mint(admin, MAX);

        await weth.approve(POOL, MAX);
        await dai.approve(POOL, MAX);

        await weth.approve(exchangeProxy.address, MAX);
        await dai.approve(exchangeProxy.address, MAX);

        await pool.approve(exchangeProxy.address, MAX);

        // await pool.bind(WETH, toWei(wethBalance), toWei(wethDenorm));
        // await pool.bind(DAI, toWei(daiBalance), toWei(daiDenorm));

        // await pool.setPublicSwap(true);
        // await pool.setSwapFee(toWei(String(swapFee)));

        // await pool.finalize();
    });

    describe('Only allowed tokens', () => {
      it('Fail calling bind with not allowed token', async () => {
        await truffleAssert.reverts(
          pool.bind(WETH, toWei(wethBalance), toWei(wethDenorm)),
            'ERR_NOT_ALLOWED_TOKEN.',
        );
      });

      it('Can call bind with allowed tokens', async () => {
        await operationsRegistry.allowAsset(WETH)
        await operationsRegistry.allowAsset(DAI)

        await pool.bind(WETH, toWei(wethBalance), toWei(wethDenorm));
        await pool.bind(DAI, toWei(daiBalance), toWei(daiDenorm));

        await pool.setPublicSwap(true);
        await pool.setSwapFee(toWei(String(swapFee)));

        await pool.finalize();
      })
    })

    describe('ERC1155 Holder', () => {
      it('Should allow to receive ERC1155 items', async () => {
        await permissions.assingItem(POOL)
        const balance = await permissions.balanceOf(POOL, 1)
        assert.equal(balance.toString(), '1');
      })
    })

    describe('User interactions', () => {
      it('Fail calling joinPool directly', async () => {
        await truffleAssert.reverts(
          pool.joinPool(toWei('1'), [MAX, MAX]),
            'ERR_NOT_EXCHANGE_PROXY',
        );
      });

      it('Fail calling exitPool directly', async () => {
        await exchangeProxy.joinPool(pool.address, toWei('1'), [MAX, MAX]);

        await truffleAssert.reverts(
          pool.exitPool(toWei('1'), [MAX, MAX]),
            'ERR_NOT_EXCHANGE_PROXY',
        );
      });

      it('Fail calling swapExactAmountIn directly', async () => {
        const tokenIn = WETH;
        const tokenAmountIn = '2';
        const tokenOut = DAI;
        const minAmountOut = '0';
        const maxPrice = MAX;

        await truffleAssert.reverts(
          pool.swapExactAmountIn.call(
            tokenIn,
            toWei(tokenAmountIn),
            tokenOut,
            toWei(minAmountOut),
            maxPrice,
          ),
          'ERR_NOT_EXCHANGE_PROXY',
        );
      });

      it('Fail calling swapExactAmountOut directly', async () => {
        const tokenIn = DAI;
        const maxAmountIn = await dai.balanceOf(admin);
        const tokenOut = WETH;
        const tokenAmountOut = '1';
        const maxPrice = MAX;

        await truffleAssert.reverts(
          pool.swapExactAmountOut.call(
            tokenIn,
            maxAmountIn,
            tokenOut,
            toWei(tokenAmountOut),
            maxPrice,
          ),
          'ERR_NOT_EXCHANGE_PROXY',
        );
      });

      it('Fail calling joinswapExternAmountIn directly', async () => {
        const poolRatio = 1.1;
        // increase tbalance by 1.1^2 after swap fee
        const tAi = (1 / (1 - swapFee * (1 - wethNorm))) * (currentWethBalance * (poolRatio ** (1 / wethNorm) - 1));

        await truffleAssert.reverts(
          pool.joinswapExternAmountIn(WETH, toWei(String(tAi)), toWei('0')),
          'ERR_NOT_EXCHANGE_PROXY',
        );
      });

      it('Fail calling joinswapPoolAmountOut directly', async () => {
        const poolRatio = 1.1;
        const pAo = currentPoolBalance * (poolRatio - 1);
        const maxDai = await dai.balanceOf(admin)

        await truffleAssert.reverts(
          pool.joinswapPoolAmountOut(DAI, toWei(String(pAo)), maxDai),
          'ERR_NOT_EXCHANGE_PROXY',
        );
      });

      it('Fail calling exitswapPoolAmountIn directly', async () => {
        const poolRatioAfterExitFee = 0.9;
        const pAi = currentPoolBalance * (1 - poolRatioAfterExitFee) * (1 / (1 - exitFee));

        await truffleAssert.reverts(
          pool.exitswapPoolAmountIn(WETH, toWei(String(pAi)), toWei('0')),
          'ERR_NOT_EXCHANGE_PROXY',
        );
      });

      it('Fail calling exitswapExternAmountOut directly', async () => {
        const poolRatioAfterExitFee = 0.9;
            const tokenRatioBeforeSwapFee = poolRatioAfterExitFee ** (1 / daiNorm);
            const tAo = currentDaiBalance * (1 - tokenRatioBeforeSwapFee) * (1 - swapFee * (1 - daiNorm));
            const maxPoolIn = await pool.balanceOf(admin)
        await truffleAssert.reverts(
          pool.exitswapExternAmountOut(DAI, toWei(String(tAo)), maxPoolIn),
          'ERR_NOT_EXCHANGE_PROXY',
        );
      });
    })


});
