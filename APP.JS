// App.js - Main application logic for blockchain authentication 
// Contract ABI will be replaced after compilation 
let AuthenticationABI = null; 
let AuthenticationAddress = null; 
let authContract = null; 
let web3 = null; 
let userAccount = null; 
// DOM Elements 
const connectWalletBtn = document.getElementById('connectWalletBtn'); 
const connectionStatus = document.getElementById('connectionStatus'); 
const statusMessage = document.getElementById('statusMessage'); 
const generateCodeBtn = document.getElementById('generateCodeBtn'); 
const loginForm = document.getElementById('loginForm'); 
const signupForm = document.getElementById('signupForm'); 
const logoutBtn = document.getElementById('logoutBtn'); 
const successPage = document.getElementById('successPage'); 
const welcomeUsername = document.getElementById('welcomeUsername'); 
// Initialize the application 
window.addEventListener('load', async function() { 
    // Check if MetaMask is installed 
    if (typeof window.ethereum !== 'undefined') { 
        try { 
            // Create a Web3 instance 
            web3 = new Web3(window.ethereum); 
           // Check if already connected 
            const accounts = await web3.eth.getAccounts();
if (accounts.length > 0) { 
               userAccount = accounts[0]; 
                updateConnectionStatus(true); 
            } 
          // Load contract data 
            await loadContractData(); 
        } catch (error) { 
            console.error('Error initializing app:', error); 
            showStatus('Error initializing application. Please refresh the page.', 'danger'); 
        } 
    } else { 
        showStatus('MetaMask is not installed. Please install MetaMask to use this 
application.', 'warning'); 
        connectWalletBtn.disabled = true; 
    } 
}) 
// Connect to MetaMask wallet 
connectWalletBtn.addEventListener('click', async () => { 
    try { 
        const accounts = await window.ethereum.request({ method: 
'eth_requestAccounts' }); 
        userAccount = accounts[0]; 
        updateConnectionStatus(true); 
        showStatus('Wallet connected successfully!', 'success'); 
         
        // Load contract if not already loaded 
        if (!authContract) { 
            await loadContractData(); 
        } 
    } catch (error) { console.error('Error connecting to MetaMask:', error); 
        showStatus('Failed to connect wallet. Please try again.', 'danger'); 
    } 
}); 
// Handle MetaMask account changes 
if (window.ethereum) { 
    window.ethereum.on('accountsChanged', function (accounts) { 
        if (accounts.length === 0) { 
            // User disconnected their wallet 
            userAccount = null; 
            updateConnectionStatus(false); 
            showStatus('Wallet disconnected.', 'warning'); 
        } else { 
            // User switched accounts 
            userAccount = accounts[0]; 
            updateConnectionStatus(true); 
            showStatus('Account changed to ' + userAccount.substring(0, 6) + '...', 'info'); 
        } 
    }); 
} 
// Sign Up Form Submission 
signupForm.addEventListener('submit', async function(event) { 
    event.preventDefault(); 
    if (!checkWalletConnection()) return; 
    const username = document.getElementById('signupUsername').value; 
    const password = document.getElementById('signupPassword').value; 
    const confirmPassword = document.getElementById('confirmPassword').value; 
    // Validate inputs 
    if (password !== confirmPassword) {   showStatus('Passwords do not match!', 'danger'); 
        return; 
    }   
    try { 
        // Check if username already exists 
        const userExists = await authContract.methods.userExists(username).call(); 
        if (userExists) { 
            showStatus('Username already taken. Please choose another.', 'warning'); 
            return; 
        }  
        showStatus('Please confirm the transaction in MetaMask...', 'info'); 
        // Register user with higher gas limit to ensure transaction completes 
        await authContract.methods.registerUser(username, password).send({  
            from: userAccount, 
            gas: 500000 // Higher gas limit 
        }); 
        showStatus('Registration successful! You can now log in.', 'success'); 
         
        // Clear the form 
        signupForm.reset(); 
        // Switch to login tab 
        document.getElementById('login-tab').click();      
    } catch (error) { 
        console.error('Error during registration:', error); 
        showStatus('Registration failed: ' + (error.message || 'Unknown error'), 'danger'); 
    } 
}); 
// Generate Code Button Click 
generateCodeBtn.addEventListener('click', async function() { if (!checkWalletConnection()) return; 
    const username = document.getElementById('loginUsername').value; 
    const password = document.getElementById('loginPassword').value; 
     if (!username || !password) { 
        showStatus('Please enter username and password first.', 'warning'); 
        return; 
    } 
    try { 
        // First authenticate the user 
        const isAuthenticated = await 
authContract.methods.authenticateUser(username, password).call();    
        if (!isAuthenticated) { 
            showStatus('Invalid username or password.', 'danger'); 
            return; 
        }  
        showStatus('Please confirm the transaction in MetaMask to generate code...', 
'info');   
        // Generate the code with higher gas limit - now passing username 
        const result = await authContract.methods.generateCode(username).send({  
            from: userAccount, 
            gas: 500000 // Higher gas limit 
        }); 
        // Extract the code from the event logs 
        const codeEvent = result.events.CodeGenerated; 
        if (codeEvent) { 
            const code = codeEvent.returnValues.code; 
            document.getElementById('verificationCode').value = code; 
            showStatus('Verification code generated successfully!', 'success'); 
        } else { 
            showStatus('Failed to retrieve the generated code.', 'danger'); 
   } 
         
    } catch (error) { 
        console.error('Error generating code:', error); 
        showStatus('Failed to generate code: ' + (error.message || 'Unknown error'), 
'danger'); 
    } 
}); 
// Handle login form submission 
loginForm.addEventListener('submit', async (e) => { 
    e.preventDefault(); 
    if (!web3 || !authContract) { 
        showStatus('Please connect to MetaMask first.', 'warning'); 
        return; 
    } 
    const username = document.getElementById('loginUsername').value; 
    const password = document.getElementById('loginPassword').value; 
    const code = document.getElementById('verificationCode').value; 
    if (!username || !password || !code) { 
        showStatus('Please fill in all fields and generate a verification code.', 'warning'); 
        return; 
    } 
    try { 
        // First verify the code - now passing username as well 
        const isCodeValid = await authContract.methods.verifyCode(username, 
parseInt(code)).call({ from: userAccount }); 
        if (!isCodeValid) { 
            showStatus('Invalid verification code.', 'danger'); 
            return; 
        }     
        // Then authenticate the user 
        const isAuthenticated = await 
authContract.methods.authenticateUser(username, password).call({ from: 
userAccount });  
        if (!isAuthenticated) { 
            showStatus('Invalid username or password.', 'danger'); 
            return; 
        } 
        showStatus('Login successful!', 'success'); 
        // Store login state 
        localStorage.setItem('isLoggedIn', 'true'); 
        localStorage.setItem('username', username) 
        // Hide the main container 
        const container = document.querySelector('.container'); 
        if (container) { 
            container.classList.add('d-none'); 
        }  
        // Show the success page 
        const successPageElement = document.getElementById('successPage'); 
        if (successPageElement) { 
            successPageElement.classList.remove('d-none'); 
        }   
        // Set the welcome message 
        const welcomeUsernameElement = 
document.getElementById('welcomeUsername'); 
        if (welcomeUsernameElement) { 
            welcomeUsernameElement.textContent = username; 
        }   
    } catch (error) {console.error('Error during login:', error); 
        showStatus('Login failed: ' + (error.message || 'Unknown error'), 'danger'); 
    } 
}) 
// Logout Button Click 
logoutBtn.addEventListener('click', function() { 
    // Hide success page and show login page 
    successPage.classList.add('d-none'); 
    document.querySelector('.container').classList.remove('d-none');  
    // Clear forms 
    loginForm.reset(); 
    signupForm.reset(); 
    showStatus('Logged out successfully.', 'success'); 
}); 
// Helper Functions 
async function loadContractData() { 
    try { 
        // In a real application, you would load the ABI from the build folder after 
compilation 
        // For now, we'll use a placeholder that will be replaced after compilation 
        // Contract ABI (replace with your contract ABI) 
        const AuthenticationABI = [ 
            { 
                "anonymous": false, 
                "inputs": [ 
                    { 
                        "indexed": true, 
                        "internalType": "address", 
                        "name": "userAddress", 
      "type": "address" 
                    }, 
                    { 
                        "indexed": false, 
                        "internalType": "uint256", 
                        "name": "code", 
                        "type": "uint256" 
                    }, 
                    { 
                        "indexed": false, 
                        "internalType": "string", 
                        "name": "username", 
                        "type": "string" 
                    } 
                ], 
                "name": "CodeGenerated", 
                "type": "event" 
            }, 
            { 
                "anonymous": false, 
                "inputs": [ 
                    { 
                        "indexed": true, 
                        "internalType": "address", 
                        "name": "userAddress", 
                        "type": "address" 
                    }, 
                    { 
                        "indexed": false, "internalType": "string", 
                        "name": "username", 
                        "type": "string" 
                    } 
                ], 
                "name": "UserAuthenticated", 
                "type": "event" 
            }, 
            { 
                "anonymous": false, 
                "inputs": [ 
                    { 
                        "indexed": true, 
                        "internalType": "address", 
                        "name": "userAddress", 
                        "type": "address" 
                    }, 
                    { 
                        "indexed": false, 
                        "internalType": "string", 
                        "name": "username", 
                        "type": "string" 
                    } 
                ], 
                "name": "UserRegistered", 
                "type": "event" 
            }, 
            { 
                "inputs": [
  } 
                ], 
                "name": "generateCode", 
                "outputs": [ 
                    { 
                        "internalType": "uint256", 
                        "name": "", 
                        "type": "uint256" 
                    } 
                ], 
                "stateMutability": "nonpayable", 
                "type": "function" 
            }, 
            { 
                "inputs": [], 
                "name": "getUsername", 
                "outputs": [ 
                    { 
                        "internalType": "string", 
                        "name": "", 
                        "type": "string" 
                    } 
                ], 
                "stateMutability": "view", 
                "type": "function" 
            }, 
            { 
                "inputs": [ 
                    {
                        "internalType": "string", 
                        "name": "_username", 
                        "type": "string" 
                    }, 
                    { 
                        "internalType": "string", 
                        "name": "_password", 
                        "type": "string" 
                    } 
                ], 
                "name": "authenticateUser", 
                "outputs": [ 
                    { 
                        "internalType": "bool", 
                        "name": "", 
                        "type": "bool" 
                    } 
                ], 
                "stateMutability": "view", 
                "type": "function", 
                "constant": true 
            }, 
            { 
                "inputs": [ 
                    { 
                        "internalType": "string", 
                        "name": "_username", 
                        "type": "string"
