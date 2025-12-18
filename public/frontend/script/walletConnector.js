/**
 * Wallet Connector (Minimum)
 * Supports Solana and EVM chains
 */

const WalletConnector = (function() {
    let state = {
        connected: false,
        chainType: null,
        address: null,
        balance: null,
        symbol: null
    };

    const SOLANA_CLUSTER = typeof walletClusterApiUrl !== 'undefined' ? walletClusterApiUrl : 'devnet';

    function shortenAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    function formatBalance(balance) {
        if (balance === null || balance === undefined) return '0';
        const num = parseFloat(balance);
        if (num === 0) return '0';
        return num.toFixed(4);
    }

    async function connectSolana(provider) {
        try {
            const resp = await provider.connect();
            const publicKey = resp.publicKey.toString();

            const solanaLib = window.solanaWeb3;
            const connection = new solanaLib.Connection(solanaLib.clusterApiUrl(SOLANA_CLUSTER));
            const balance = await connection.getBalance(resp.publicKey) / 1e9;

            state = { connected: true, chainType: 'solana', address: publicKey, balance, symbol: 'SOL' };
            return state;
        } catch (error) {
            if (error.code === 4001 || error.message?.includes('rejected')) {
                throw new Error('Connection rejected by user');
            }
            throw new Error('Failed to connect. Make sure Phantom is unlocked and has an account.');
        }
    }

    async function connectEVM(provider) {
        try {
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            const address = accounts[0];

            const balanceHex = await provider.request({
                method: 'eth_getBalance',
                params: [address, 'latest']
            });
            const balance = Number(BigInt(balanceHex)) / 1e18;

            state = { connected: true, chainType: 'evm', address, balance, symbol: 'ETH' };
            return state;
        } catch (error) {
            if (error.code === 4001) {
                throw new Error('Connection rejected by user');
            }
            throw new Error('Failed to connect. Make sure wallet is unlocked.');
        }
    }

    function updateUI() {
        const solanaBtn = document.getElementById('solanaConnectBtn');
        const evmBtn = document.getElementById('evmConnectBtn');

        if (state.connected) {
            const display = `${shortenAddress(state.address)} | ${formatBalance(state.balance)} ${state.symbol}`;
            if (state.chainType === 'solana' && solanaBtn) {
                solanaBtn.textContent = display;
                if (evmBtn) evmBtn.textContent = 'EVM';
            } else if (state.chainType === 'evm' && evmBtn) {
                evmBtn.textContent = display;
                if (solanaBtn) solanaBtn.textContent = 'Solana';
            }
        } else {
            if (solanaBtn) solanaBtn.textContent = 'Solana';
            if (evmBtn) evmBtn.textContent = 'EVM';
        }
    }

    function getState() {
        return { ...state };
    }

    function disconnect() {
        if (state.chainType === 'solana' && window.solana) {
            try { window.solana.disconnect(); } catch (e) {}
        }
        state = { connected: false, chainType: null, address: null, balance: null, symbol: null };
        updateUI();
    }

    return { connectSolana, connectEVM, updateUI, getState, disconnect };
})();
