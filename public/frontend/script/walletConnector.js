/**
 * Multi-Chain Wallet Connector
 * Supports Solana (Phantom, Solflare) and EVM chains (MetaMask, etc.)
 */

const WalletConnector = (function() {
    // State management
    let state = {
        connected: false,
        chainType: null, // 'solana' or 'evm'
        address: null,
        balance: null,
        walletName: null
    };

    // Solana configuration
    const SOLANA_CLUSTER = typeof walletClusterApiUrl !== 'undefined' ? walletClusterApiUrl : 'devnet';

    // EVM Chain configurations
    const EVM_CHAINS = {
        1: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
        137: { name: 'Polygon', symbol: 'MATIC', decimals: 18 },
        56: { name: 'BSC', symbol: 'BNB', decimals: 18 },
        42161: { name: 'Arbitrum', symbol: 'ETH', decimals: 18 },
        10: { name: 'Optimism', symbol: 'ETH', decimals: 18 },
        43114: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
        8453: { name: 'Base', symbol: 'ETH', decimals: 18 },
        250: { name: 'Fantom', symbol: 'FTM', decimals: 18 },
        324: { name: 'zkSync Era', symbol: 'ETH', decimals: 18 },
        59144: { name: 'Linea', symbol: 'ETH', decimals: 18 }
    };

    // Utility functions
    function shortenAddress(address, chars = 4) {
        if (!address) return '';
        return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
    }

    function formatBalance(balance, decimals = 4) {
        if (balance === null || balance === undefined) return '0';
        const num = parseFloat(balance);
        if (num === 0) return '0';
        if (num < 0.0001) return '< 0.0001';
        return num.toFixed(decimals);
    }

    // Solana wallet detection
    function detectSolanaWallets() {
        const wallets = [];

        if (window.solana?.isPhantom) {
            wallets.push({ name: 'Phantom', provider: window.solana, icon: '/frontend/img/phantom-icon.png' });
        }
        if (window.solflare?.isSolflare) {
            wallets.push({ name: 'Solflare', provider: window.solflare, icon: '/frontend/img/solflare-icon.png' });
        }
        if (window.backpack?.isBackpack) {
            wallets.push({ name: 'Backpack', provider: window.backpack, icon: '/frontend/img/backpack-icon.png' });
        }

        return wallets;
    }

    // EVM wallet detection
    function detectEVMWallets() {
        const wallets = [];

        if (window.ethereum) {
            if (window.ethereum.isMetaMask) {
                wallets.push({ name: 'MetaMask', provider: window.ethereum, icon: '/frontend/img/metamask-icon.png' });
            } else if (window.ethereum.isCoinbaseWallet) {
                wallets.push({ name: 'Coinbase', provider: window.ethereum, icon: '/frontend/img/coinbase-icon.png' });
            } else if (window.ethereum.isTrust) {
                wallets.push({ name: 'Trust Wallet', provider: window.ethereum, icon: '/frontend/img/trust-icon.png' });
            } else {
                wallets.push({ name: 'Browser Wallet', provider: window.ethereum, icon: '/frontend/img/wallet-icon.png' });
            }
        }

        // Check for multiple injected wallets
        if (window.ethereum?.providers?.length) {
            window.ethereum.providers.forEach(provider => {
                if (provider.isMetaMask && !wallets.find(w => w.name === 'MetaMask')) {
                    wallets.push({ name: 'MetaMask', provider, icon: '/frontend/img/metamask-icon.png' });
                }
                if (provider.isCoinbaseWallet && !wallets.find(w => w.name === 'Coinbase')) {
                    wallets.push({ name: 'Coinbase', provider, icon: '/frontend/img/coinbase-icon.png' });
                }
            });
        }

        return wallets;
    }

    // Connect to Solana wallet
    async function connectSolana(walletProvider) {
        try {
            const resp = await walletProvider.connect();
            const publicKey = resp.publicKey.toString();

            // Get balance
            const solanaLib = window.solanaWeb3;
            const connection = new solanaLib.Connection(solanaLib.clusterApiUrl(SOLANA_CLUSTER));
            const balanceLamports = await connection.getBalance(resp.publicKey);
            const balanceSOL = balanceLamports / 1e9;

            state = {
                connected: true,
                chainType: 'solana',
                address: publicKey,
                balance: balanceSOL,
                walletName: walletProvider.isPhantom ? 'Phantom' :
                           walletProvider.isSolflare ? 'Solflare' : 'Solana Wallet',
                symbol: 'SOL'
            };

            // Store in localStorage for persistence
            localStorage.setItem('walletConnection', JSON.stringify({
                chainType: 'solana',
                address: publicKey
            }));

            return state;
        } catch (error) {
            console.error('Solana connection error:', error);
            throw error;
        }
    }

    // Connect to EVM wallet
    async function connectEVM(walletProvider) {
        try {
            // Request account access
            const accounts = await walletProvider.request({ method: 'eth_requestAccounts' });
            const address = accounts[0];

            // Get chain ID
            const chainIdHex = await walletProvider.request({ method: 'eth_chainId' });
            const chainId = parseInt(chainIdHex, 16);

            // Get balance
            const balanceHex = await walletProvider.request({
                method: 'eth_getBalance',
                params: [address, 'latest']
            });
            const balanceWei = BigInt(balanceHex);
            const balanceEth = Number(balanceWei) / 1e18;

            // Get chain info
            const chainInfo = EVM_CHAINS[chainId] || { name: `Chain ${chainId}`, symbol: 'ETH', decimals: 18 };

            state = {
                connected: true,
                chainType: 'evm',
                chainId: chainId,
                chainName: chainInfo.name,
                address: address,
                balance: balanceEth,
                walletName: walletProvider.isMetaMask ? 'MetaMask' :
                           walletProvider.isCoinbaseWallet ? 'Coinbase' : 'EVM Wallet',
                symbol: chainInfo.symbol
            };

            // Store in localStorage for persistence
            localStorage.setItem('walletConnection', JSON.stringify({
                chainType: 'evm',
                address: address,
                chainId: chainId
            }));

            // Setup event listeners for account/chain changes
            setupEVMListeners(walletProvider);

            return state;
        } catch (error) {
            console.error('EVM connection error:', error);
            throw error;
        }
    }

    // Setup EVM event listeners
    function setupEVMListeners(provider) {
        provider.on('accountsChanged', async (accounts) => {
            if (accounts.length === 0) {
                disconnect();
            } else {
                state.address = accounts[0];
                await refreshBalance();
                updateUI();
            }
        });

        provider.on('chainChanged', async (chainIdHex) => {
            const chainId = parseInt(chainIdHex, 16);
            const chainInfo = EVM_CHAINS[chainId] || { name: `Chain ${chainId}`, symbol: 'ETH', decimals: 18 };
            state.chainId = chainId;
            state.chainName = chainInfo.name;
            state.symbol = chainInfo.symbol;
            await refreshBalance();
            updateUI();
        });
    }

    // Refresh balance
    async function refreshBalance() {
        if (!state.connected) return;

        try {
            if (state.chainType === 'solana') {
                const solanaLib = window.solanaWeb3;
                const connection = new solanaLib.Connection(solanaLib.clusterApiUrl(SOLANA_CLUSTER));
                const publicKey = new solanaLib.PublicKey(state.address);
                const balanceLamports = await connection.getBalance(publicKey);
                state.balance = balanceLamports / 1e9;
            } else if (state.chainType === 'evm' && window.ethereum) {
                const balanceHex = await window.ethereum.request({
                    method: 'eth_getBalance',
                    params: [state.address, 'latest']
                });
                const balanceWei = BigInt(balanceHex);
                state.balance = Number(balanceWei) / 1e18;
            }
        } catch (error) {
            console.error('Balance refresh error:', error);
        }
    }

    // Disconnect wallet
    function disconnect() {
        if (state.chainType === 'solana' && window.solana) {
            try {
                window.solana.disconnect();
            } catch (e) {
                // Ignore disconnect errors
            }
        }

        state = {
            connected: false,
            chainType: null,
            address: null,
            balance: null,
            walletName: null
        };

        localStorage.removeItem('walletConnection');
        updateUI();
    }

    // Update UI elements
    function updateUI() {
        const walletBtn = document.getElementById('walletConnectBtn');
        const walletInfo = document.getElementById('walletInfo');
        const walletAddress = document.getElementById('walletAddress');
        const walletBalance = document.getElementById('walletBalance');
        const walletSymbol = document.getElementById('walletSymbol');
        const connectText = document.getElementById('connectWalletText');

        if (state.connected) {
            if (connectText) connectText.style.display = 'none';
            if (walletInfo) walletInfo.style.display = 'flex';
            if (walletAddress) walletAddress.textContent = shortenAddress(state.address);
            if (walletBalance) walletBalance.textContent = formatBalance(state.balance);
            if (walletSymbol) walletSymbol.textContent = state.symbol || '';
            if (walletBtn) {
                walletBtn.classList.add('connected');
                walletBtn.setAttribute('data-connected', 'true');
            }
        } else {
            if (connectText) connectText.style.display = 'inline';
            if (walletInfo) walletInfo.style.display = 'none';
            if (walletBtn) {
                walletBtn.classList.remove('connected');
                walletBtn.setAttribute('data-connected', 'false');
            }
        }

        // Trigger custom event for other components
        window.dispatchEvent(new CustomEvent('walletStateChanged', { detail: state }));
    }

    // Try to restore previous connection
    async function tryReconnect() {
        const savedConnection = localStorage.getItem('walletConnection');
        if (!savedConnection) return false;

        try {
            const { chainType, address } = JSON.parse(savedConnection);

            if (chainType === 'solana' && window.solana?.isPhantom) {
                // Try silent connect for Phantom
                if (window.solana.isConnected) {
                    await connectSolana(window.solana);
                    updateUI();
                    return true;
                }
            } else if (chainType === 'evm' && window.ethereum) {
                // Check if already connected
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0 && accounts[0].toLowerCase() === address.toLowerCase()) {
                    await connectEVM(window.ethereum);
                    updateUI();
                    return true;
                }
            }
        } catch (error) {
            console.error('Reconnection failed:', error);
            localStorage.removeItem('walletConnection');
        }

        return false;
    }

    // Get current state
    function getState() {
        return { ...state };
    }

    // Check if any wallet is available
    function hasWallets() {
        return detectSolanaWallets().length > 0 || detectEVMWallets().length > 0;
    }

    // Public API
    return {
        detectSolanaWallets,
        detectEVMWallets,
        connectSolana,
        connectEVM,
        disconnect,
        refreshBalance,
        getState,
        tryReconnect,
        updateUI,
        hasWallets,
        shortenAddress,
        formatBalance
    };
})();

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WalletConnector;
}
