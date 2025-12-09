async function convertCoinToSol ( coin ) {
  let sol = parseFloat( coin ) + parseFloat( commissionVal );
  return sol;
}

// Function to actually do the connection to the wallet
async function connectAndSend ( toAddr, solAmt, transId ) {
  try {
    await window.solana.connect();
    await sendSol( toAddr, solAmt, transId );
  } catch ( err ) { }
}

// Function to create button and on click
function validateAc () {
  const isPhantomInstalled = window.solana && window.solana.isPhantom;
  if ( isPhantomInstalled == true ) {
  } else {
    window.alert( "solana object not found! get a phantom wallet" );
    window.location = "https://www.phantom.app/";
  }
}

// On load of page check to see if there is a phantom window object if not then have popup
window.addEventListener( "load", validateAc );

async function sendSol ( toAddr, solAmt, transId ) {
  const provider = window.solana;
  let price = parseFloat( solAmt );
  let transaction_block;
  let transaction_signature;
  if ( parseFloat( solAmt ) ) {
    const connection = new solanaWeb3.Connection(
      solanaWeb3.clusterApiUrl( walletClusterApiUrl ),
      "confirmed"
    );
    const toAccount = new solanaWeb3.PublicKey( toAddr );
    // Create transaction object
    let transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer( {
        fromPubkey: provider.publicKey,
        toPubkey: toAccount,
        lamports: solanaWeb3.LAMPORTS_PER_SOL * price,
      } )
    );
    // Setting the variables for the transaction
    transaction.feePayer = await provider.publicKey;
    let blockhashObj = await connection.getRecentBlockhash();
    transaction.recentBlockhash = await blockhashObj.blockhash;
    // Transaction constructor initialized successfully
    if ( transaction ) {
      console.log( "Txn created successfully" );
    } else {
      console.log( "Txn created unsuccessfully" );
    }
    // Request creator to sign the transaction (allow the transaction )
    let signed = await provider.signTransaction( transaction ).then(
      ( data ) => {
        console.log( "signTransaction==> ", data );
        $.toast({
          heading: "Success",
          text: "Deposited successfully.",
          position: "top-right",
          icon: "success",
        });
        return data;
      },
      ( ) => {
        $.toast({
          heading: "Failed",
          text: "User declined transaction.",
          position: "top-right",
          icon: "error",
        });
        alert( "Error- User declined transaction." );
      }
    );
    let signature = await connection
      .sendRawTransaction( signed.serialize() )
      .then(
        ( data ) => {
          transaction_signature = data;
          console.log( "sendRawTransaction==> ", data );
          $.toast({
            heading: "Success",
            text: "Deposited successfully.",
            position: "top-right",
            icon: "success",
          });
          return data;
        },
        ( ) => {
          $.toast({
            heading: "Failed",
            text: "User declined transaction.",
            position: "top-right",
            icon: "error",
          });
          alert( "Error- Insufficient balance in Phantom wallet.." );
        }
      );
    // console.log('signature => ',signature)
    if ( signature ) {
      await connection.confirmTransaction( signature ).then(
        ( data ) => {
          console.log( "confirmTransaction==> ", data );
          transaction_block = data.context.slot;
          $.ajax( {
            type: "POST",
            dataType: "json",
            url: baseUrl + "backend/withdrawRequest/approve/" + transId,
            data: {
              transaction_block: transaction_block,
              transaction_signature: transaction_signature,
              price: price,
            },
            success: function ( response ) {
              console.log('approve response--> ',response)
            },
          } );
          alert( "Withdraw request approved." );
          setTimeout( function () { window.location.reload(); }, 500 );
          $.toast( {
            heading: "Success",
            text: "Withdraw request approved.",
            position: "top-right",
            icon: "success",
          } );
          return data;
        },
        ( ) => {
          $.toast({
            heading: "Failed",
            text: "User declined transaction.",
            position: "top-right",
            icon: "error",
          });
          alert( "Error- Transaction confirmation is failed." );
          return 0;
        }
      );
    }
  } else {
    $.toast( {
      heading: "Error",
      text: "Minimum deposit amount is 0.5 solona",
      position: "top-right",
      icon: "error",
    } );
    console.log( 'errorer' );
  }
}