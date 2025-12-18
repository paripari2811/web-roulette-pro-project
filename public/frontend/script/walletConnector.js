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
        const resp = await provider.connect();
        const publicKey = resp.publicKey.toString();

        const solanaLib = window.solanaWeb3;
        const connection = new solanaLib.Connection(solanaLib.clusterApiUrl(SOLANA_CLUSTER));
        const balance = await connection.getBalance(resp.publicKey) / 1e9;

        state = { connected: true, chainType: 'solana', address: publicKey, balance, symbol: 'SOL' };
        return state;
    }

    async function connectEVM(provider) {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];

        const balanceHex = await provider.request({
            method: 'eth_getBalance',
            params: [address, 'latest']
        });
        const balance = Number(BigInt(balanceHex)) / 1e18;

        state = { connected: true, chainType: 'evm', address, balance, symbol: 'ETH' };
        return state;
    }

    function updateUI() {
        const btn = document.getElementById('walletConnectBtn');
        if (!btn) return;

        if (state.connected) {
            btn.textContent = `${shortenAddress(state.address)} | ${formatBalance(state.balance)} ${state.symbol}`;
        } else {
            btn.textContent = 'Connect Wallet';
        }
    }

    function getState() {
        return { ...state };
    }

    return { connectSolana, connectEVM, updateUI, getState };
})();
